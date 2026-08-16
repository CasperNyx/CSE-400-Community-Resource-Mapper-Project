"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/firebase";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  sendPasswordResetEmail,
  User 
} from "firebase/auth";

interface Report {
  id: string;
  intent: string;
  category: string;
  urgency: string;
  locationText: string;
  rawText: string;
}

export default function AdminDashboard() {
  // --- AUTHENTICATION STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // UI Toggles
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // Form Inputs & Feedback
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // --- DASHBOARD STATE ---
  const [reports, setReports] = useState<Report[]>([]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch reports only if logged in
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, "reports"), (snapshot) => {
      const reportsData: Report[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Report, "id">),
      }));
      setReports(reportsData);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle Login & Registration
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

  // Handle Password Reset
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

  // Prevent UI flashing while checking auth
  if (isCheckingAuth) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center font-bold text-gray-500">Loading Secure Gateway...</div>;
  }

  // --- LOGIN / REGISTER / RESET SCREEN UI ---
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
              {isResettingPassword 
                ? "Enter your email to receive a password reset link." 
                : isRegistering 
                  ? "Create a new admin coordinator account." 
                  : "Restricted access. Please log in."}
            </p>
          </div>
          
          <form onSubmit={isResettingPassword ? handlePasswordReset : handleAuth} className="flex flex-col gap-4">
            {/* Added text-gray-900 and placeholder-gray-400 to fix the white-text bug */}
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
              <button 
                onClick={() => { setIsResettingPassword(true); setAuthError(""); setResetSent(false); }} 
                className="text-blue-600 hover:underline font-medium"
              >
                Forgot Password?
              </button>
            )}

            <button 
              onClick={() => { 
                setIsRegistering(!isRegistering); 
                setIsResettingPassword(false); 
                setAuthError(""); 
                setResetSent(false);
              }} 
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              {isRegistering 
                ? "Already have an account? Log in." 
                : isResettingPassword 
                  ? "Back to Login" 
                  : "Need access? Register here."}
            </button>
            
            <a href="/" className="text-blue-600 hover:underline font-medium mt-2">
              &larr; Return to Public Map
            </a>
          </div>
        </div>
      </div>
    );
  }

  // --- PROTECTED DASHBOARD UI ---
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dispatch Dashboard</h1>
            <p className="text-gray-500 mt-1">Live overview. Logged in as: <strong>{user.email}</strong></p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleLogout}
              className="px-5 py-2 border-2 border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-100 transition-all"
            >
              Log Out
            </button>
            <a href="/" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-sm">
              View Live Map
            </a>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Intent</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Urgency</th>
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
                        <span className={`px-3 py-1 text-xs font-bold rounded-full text-white ${report.intent === "Need" ? "bg-red-500" : "bg-green-500"}`}>
                          {report.intent}
                        </span>
                      </td>
                      <td className="p-4 text-gray-800 font-bold">{report.category}</td>
                      <td className="p-4 text-gray-600 font-medium">{report.urgency}</td>
                      <td className="p-4 text-gray-600">{report.locationText}</td>
                      <td className="p-4 text-gray-500 text-sm max-w-xs truncate" title={report.rawText}>
                        "{report.rawText}"
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleDelete(report.id)}
                          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-bold text-sm transition-all"
                        >
                          Dispatch & Resolve
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