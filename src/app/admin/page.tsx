"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/firebase";
import { collection, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  sendPasswordResetEmail,
  User 
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { getUserRole } from "@/lib/roles";

interface Report {
  id: string;
  intent: string;
  category: string;
  urgency: string;
  locationText: string;
  rawText: string;
  threatScore?: number;
}
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const role = await getUserRole(currentUser.uid);
        if (role === "super-admin") {
          setUser(currentUser);
          setIsCheckingAuth(false);
        } else {
          // Unauthorized user detected, force redirect to map
          router.replace("/map");
        }
      } else {
        setUser(null);
        setIsCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, "reports"), (snapshot) => {
      let reportsData: Report[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Report, "id">),
      }));
      reportsData.sort((a, b) => (b.threatScore || 0) - (a.threatScore || 0));
      setReports(reportsData);
    });
    return () => unsubscribe();
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setEmail("");
      setPassword("");
    } catch (error: any) {
      setAuthError(error.message.replace("Firebase: ", ""));
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setResetSent(false);
    if (!email) {
      setAuthError("Please enter your email address first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (error: any) {
      setAuthError(error.message.replace("Firebase: ", ""));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to resolve and remove this report from the map?")) {
      await deleteDoc(doc(db, "reports", id));
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      setUploadProgress({ current: 0, total: lines.length });

      for (let i = 0; i < lines.length; i++) {
        const rawText = lines[i];
        
        const triageRes = await fetch("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: rawText }),
        });
        
        if (!triageRes.ok) {
          console.error(`Skipping row due to API error: ${rawText}`);
          continue; 
        }
        
        const aiData = await triageRes.json();

        await addDoc(collection(db, "reports"), {
          intent: aiData.intent || "Need",
          category: aiData.category || "Unknown",
          urgency: aiData.urgency || "Medium",
          locationText: aiData.location || "Unknown",
          threatScore: aiData.threatScore !== undefined ? aiData.threatScore : 1,
          rawText: rawText,
          lat: aiData.lat || 23.8759, 
          lng: aiData.lng || 90.3795,
          createdAt: serverTimestamp(),
        });

        setUploadProgress(prev => ({ ...prev, current: i + 1 }));
        await delay(4000);
      }
      
      alert(`Successfully processed ${lines.length} reports!`);
    } catch (error) {
      console.error("Bulk upload failed:", error);
      alert("An error occurred during bulk upload.");
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      e.target.value = ''; 
    }
  };

  if (isCheckingAuth) return <div className="min-h-screen bg-gray-100 flex items-center justify-center font-bold text-gray-500">Loading Secure Gateway...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border border-gray-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              {isResettingPassword ? "🔑" : "🛡️"}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Gateway</h1>
            <p className="text-gray-500 mt-2 text-sm">
              {isResettingPassword ? "Enter your email to receive a password reset link." : isRegistering ? "Create a new admin coordinator account." : "Restricted access. Please log in."}
            </p>
          </div>
          <form onSubmit={isResettingPassword ? handlePasswordReset : handleAuth} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Admin Email Address..."
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-gray-900 bg-white placeholder-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {!isResettingPassword && (
              <input
                type="password"
                placeholder="Secure Password (min 6 chars)..."
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-gray-900 bg-white placeholder-gray-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            )}
            {authError && <div className="text-red-500 text-sm font-semibold text-center">{authError}</div>}
            {resetSent && <div className="text-green-600 text-sm font-semibold text-center">Password reset email sent! Check your inbox.</div>}
            <button type="submit" className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all">
              {isResettingPassword ? "Send Reset Link" : isRegistering ? "Register Admin Account" : "Secure Login"}
            </button>
          </form>
          <div className="mt-6 flex flex-col gap-3 text-center text-sm">
            {!isResettingPassword && !isRegistering && (
              <button onClick={() => { setIsResettingPassword(true); setAuthError(""); setResetSent(false); }} className="text-blue-600 hover:underline font-medium">Forgot Password?</button>
            )}
            <button onClick={() => { setIsRegistering(!isRegistering); setIsResettingPassword(false); setAuthError(""); setResetSent(false); }} className="text-gray-600 hover:text-gray-900 font-medium">
              {isRegistering ? "Already have an account? Log in." : isResettingPassword ? "Back to Login" : "Need access? Register here."}
            </button>
            <a href="/" className="text-blue-600 hover:underline font-medium mt-2">&larr; Return to Public Map</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dispatch Dashboard</h1>
            <p className="text-gray-500 mt-1">Live overview. Logged in as: <strong>{user.email}</strong></p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleLogout} className="px-5 py-2 border-2 border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-100 transition-all">Log Out</button>
            <a href="/map" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-sm">View Live Map</a>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Bulk Data Ingestion</h2>
            <p className="text-sm text-gray-500 mt-1">Upload a .txt or .csv file (one distress signal per line) to process via AI.</p>
          </div>
          <div className="flex items-center gap-4">
            {isUploading ? (
              <div className="text-sm font-bold text-blue-600">
                Processing {uploadProgress.current} / {uploadProgress.total}...
              </div>
            ) : (
              <label className="cursor-pointer bg-gray-900 text-white px-5 py-2 rounded-lg font-bold hover:bg-black transition-all">
                Upload CSV / TXT
                <input type="file" accept=".csv, .txt" className="hidden" onChange={handleBulkUpload} />
              </label>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Threat</th>
                  <th className="p-4 font-semibold">Intent</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Location</th>
                  <th className="p-4 font-semibold">Raw Signal</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">No active reports on the map.</td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        {report.threatScore === 0 ? (
                          <span className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-gray-500 bg-gray-200 shadow-sm text-xs">
                            N/A
                          </span>
                        ) : (
                          <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white shadow-sm ${
                            (report.threatScore || 0) >= 8 ? "bg-red-600" : (report.threatScore || 0) >= 4 ? "bg-orange-500" : "bg-green-500"
                          }`}>
                            {report.threatScore || 1}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-800 font-bold">{report.category}</td>
                      <td className="p-4 text-gray-600">{report.locationText}</td>
                      <td className="p-4 text-gray-500 text-sm max-w-xs truncate" title={report.rawText}>
                        "{report.rawText}"
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDelete(report.id)} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-bold text-sm transition-all">
                          Resolve
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}