"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import DynamicSurvey from "@/components/DynamicSurvey";
import { auth, db } from "@/firebase";
import { HIGH_THREAT_THRESHOLD, distanceInKm } from "@/lib/proximity";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { addDoc, collection, doc, getDoc, increment, onSnapshot, query, runTransaction, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";

type Tab = "report" | "pledges" | "reports" | "safe-zone";
type Report = { id: string; createdBy?: string; category?: string; surveyCategory?: string; rawText?: string; status?: string; threatScore?: number; locationText?: string; lat?: number; lng?: number; createdAt?: { toDate?: () => Date } };
type Pledge = { id: string; resourceName: string; category: string; totalQuantity: number; remainingQuantity: number; usedQuantity: number; unit: string; status: string };
type Notice = { id: string; title: string; message: string; read: boolean; createdAt?: { toDate?: () => Date } };
type SafeZone = { latitude: number; longitude: number; radiusKm: number; enabled: boolean };

const time = (value?: { toDate?: () => Date }) => value?.toDate?.().toLocaleString() || "Just now";
const inputClass = "w-full rounded-xl border border-gray-200 bg-white p-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-600";

export default function CitizenVolunteerPortal() {
  const router = useRouter(); // <--- ADD THIS LINE
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("report");
  
  // Auth States
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [register, setRegister] = useState(false); 
  const [authError, setAuthError] = useState("");
  
  // Form States
  const [category, setCategory] = useState("Medical"); 
  const [answers, setAnswers] = useState<Record<string, string>>({}); 
  const [description, setDescription] = useState(""); 
  const [submitting, setSubmitting] = useState(false);
  
  // Data States
  const [reports, setReports] = useState<Report[]>([]); 
  const [pledges, setPledges] = useState<Pledge[]>([]); 
  const [notices, setNotices] = useState<Notice[]>([]);
  const [safeZone, setSafeZone] = useState<SafeZone>({ latitude: 0, longitude: 0, radiusKm: 5, enabled: false });
  const [pledge, setPledge] = useState({ category: "Water", resourceName: "", quantity: "", unit: "Bottles", lat: 0, lng: 0 });

  // NEW: UI States to replace window.prompt
  const [allocatingId, setAllocatingId] = useState<string | null>(null);
  const [allocateAmount, setAllocateAmount] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const stopReports = onSnapshot(query(collection(db, "reports"), where("createdBy", "==", uid)), (snapshot) => setReports(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Report))));
    const stopPledges = onSnapshot(query(collection(db, "pledges"), where("createdBy", "==", uid)), (snapshot) => setPledges(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Pledge))));
    const stopNotices = onSnapshot(query(collection(db, "notifications"), where("userId", "==", uid)), (snapshot) => setNotices(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Notice)).sort((a, b) => (b.createdAt?.toDate?.().getTime() || 0) - (a.createdAt?.toDate?.().getTime() || 0))));
    const stopUser = onSnapshot(doc(db, "users", uid), (snapshot) => { const value = snapshot.data()?.safeZone as SafeZone | undefined; if (value) setSafeZone(value); });
    return () => { stopReports(); stopPledges(); stopNotices(); stopUser(); };
  }, [user]);

  useEffect(() => {
    if (!user || !safeZone.enabled) return;
    return onSnapshot(collection(db, "reports"), (snapshot) => {
      void Promise.all(snapshot.docChanges().filter((change) => change.type === "added" || change.type === "modified").map(async (change) => {
        const report = change.doc.data() as Report;
        if (report.status === "Cancelled" || report.createdBy === user.uid || typeof report.lat !== "number" || typeof report.lng !== "number" || (report.threatScore || 0) < HIGH_THREAT_THRESHOLD) return;
        const km = distanceInKm(safeZone.latitude, safeZone.longitude, report.lat, report.lng);
        if (km <= safeZone.radiusKm) {
          const noticeRef = doc(db, "notifications", `${user.uid}_${change.doc.id}`);
          if (!(await getDoc(noticeRef)).exists()) {
            await setDoc(noticeRef, { userId: user.uid, title: "Nearby high-threat incident", message: `High-threat incident reported ${km.toFixed(1)} km from your Safe Zone.`, reportId: change.doc.id, read: false, createdAt: serverTimestamp() });
          }
        }
      })).catch(console.error);
    });
  }, [user, safeZone]);

  async function authenticate(event: FormEvent) { 
    event.preventDefault(); 
    setAuthError(""); 
    try { 
      register ? await createUserWithEmailAndPassword(auth, email, password) : await signInWithEmailAndPassword(auth, email, password); 
    } catch (error) { 
      setAuthError(error instanceof Error ? error.message.replace("Firebase: ", "") : "Authentication failed."); 
    } 
  }

  async function submitReport(event: FormEvent) {
    event.preventDefault(); 
    if (!user || !description.trim()) return; 
    setSubmitting(true);
    try {
      const response = await fetch("/api/triage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: description }) }); 
      const triage = await response.json(); 
      if (triage.error) throw new Error(triage.error);
      
      await addDoc(collection(db, "reports"), { 
        intent: triage.intent, 
        category: triage.category, 
        surveyCategory: category, 
        surveyAnswers: Object.fromEntries(Object.entries(answers).map(([key, value]) => [key, /^\d+$/.test(value) ? Number(value) : value])), 
        urgency: triage.urgency, 
        locationText: triage.location, 
        threatScore: triage.threatScore ?? 1, 
        rawText: description, 
        lat: triage.lat || 23.8759, 
        lng: triage.lng || 90.3795, 
        createdBy: user.uid, 
        status: "Pending", 
        createdAt: serverTimestamp(), 
        updatedAt: serverTimestamp() 
      });
      setDescription(""); setAnswers({}); setTab("reports");
    } catch (error) { 
      alert(error instanceof Error ? error.message : "Report could not be submitted."); 
    } finally { 
      setSubmitting(false); 
    }
  }

  async function createPledge(event: FormEvent) {
    event.preventDefault(); 
    if (!user || !pledge.resourceName.trim() || Number(pledge.quantity) <= 0) return;
    await addDoc(collection(db, "pledges"), { 
      createdBy: user.uid, 
      category: pledge.category, 
      resourceName: pledge.resourceName.trim(), 
      totalQuantity: Number(pledge.quantity), 
      remainingQuantity: Number(pledge.quantity), 
      usedQuantity: 0, 
      unit: pledge.unit, 
      lat: pledge.lat || null, 
      lng: pledge.lng || null, 
      status: "Available", 
      createdAt: serverTimestamp(), 
      updatedAt: serverTimestamp() 
    });
    setPledge({ category: "Water", resourceName: "", quantity: "", unit: "Bottles", lat: 0, lng: 0 });
  }

  // FIXED: Removed window.prompt and replaced with a React UI state flow
  async function confirmConsume(id: string) {
    const quantity = Number(allocateAmount);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }
    setAllocatingId(null);
    try { 
      await runTransaction(db, async (transaction) => { 
        const reference = doc(db, "pledges", id); 
        const snapshot = await transaction.get(reference); 
        const value = snapshot.data(); 
        if (!value || value.remainingQuantity < quantity) throw new Error("Not enough available inventory."); 
        
        const remaining = value.remainingQuantity - quantity; 
        transaction.update(reference, { 
          remainingQuantity: remaining, 
          usedQuantity: increment(quantity), 
          status: remaining === 0 ? "Depleted" : "Available", 
          updatedAt: serverTimestamp() 
        }); 
      }); 
    } catch (error) { 
      alert(error instanceof Error ? error.message : "Could not allocate inventory."); 
    }
  }

  // FIXED: Added real error messages and extended timeout for desktop computers
  async function useCurrentLocation(forReport?: Report) {
    if (!navigator.geolocation) return alert("Geolocation is not available in this browser.");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => { 
        if (forReport) {
          await updateDoc(doc(db, "reports", forReport.id), { lat: coords.latitude, lng: coords.longitude, locationText: "Current location", updatedAt: serverTimestamp() }); 
        } else {
          setSafeZone((zone) => ({ ...zone, latitude: coords.latitude, longitude: coords.longitude })); 
        }
      }, 
      (err) => alert(`Location Error: ${err.message}. If you are on a desktop, try entering your location manually.`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function usePledgeLocation() {
    if (!navigator.geolocation) return alert("Geolocation is not available in this browser.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setPledge((current) => ({ ...current, lat: coords.latitude, lng: coords.longitude })), 
      (err) => alert(`Location Error: ${err.message}. If you are on a desktop, try entering your location manually.`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function saveSafeZone(event: FormEvent) { 
    event.preventDefault(); 
    if (!user) return; 
    await setDoc(doc(db, "users", user.uid), { safeZone, updatedAt: serverTimestamp() }, { merge: true }); 
  }

  // --------------------------------------------------------
  // UNAUTHENTICATED RENDER
  // --------------------------------------------------------
  // --------------------------------------------------------
  // UNAUTHENTICATED RENDER (Replaced with Session Check)
  // --------------------------------------------------------
  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-500 font-bold">Verifying secure session...</p>
      </main>
    );
  }

  // --------------------------------------------------------
  // AUTHENTICATED RENDER
  // --------------------------------------------------------
  const tabs: { key: Tab; label: string }[] = [
    { key: "report", label: "Create Report" }, 
    { key: "pledges", label: "Resource Pledges" }, 
    { key: "reports", label: "My Reports" }, 
    { key: "safe-zone", label: `Safe Zone & Alerts${notices.filter((n) => !n.read).length ? ` (${notices.filter((n) => !n.read).length})` : ""}` }
  ];

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-800 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold">Citizen & Volunteer Portal</h1>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/map" className="text-sm font-bold text-blue-600 hover:underline">Back to Map</a>
            <button onClick={() => signOut(auth)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold">Sign out</button>
          </div>
        </header>

        <nav className="mb-6 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button key={item.key} onClick={() => setTab(item.key)} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === item.key ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}>
              {item.label}
            </button>
          ))}
        </nav>

        <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          {tab === "report" && (
            <form onSubmit={submitReport} className="mx-auto flex max-w-2xl flex-col gap-4">
              <h2 className="text-xl font-bold">Create a report</h2>
              <DynamicSurvey category={category} answers={answers} disabled={submitting} onCategoryChange={(next) => { setCategory(next); setAnswers({}); }} onAnswersChange={setAnswers} />
              <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClass} placeholder="Describe the situation and include a recognizable location." />
              <button disabled={submitting} className="rounded-xl bg-blue-600 p-3 font-bold text-white disabled:bg-gray-400">
                {submitting ? "Processing triage..." : "Submit report"}
              </button>
            </form>
          )}

          {tab === "pledges" && (
            <div className="space-y-7">
              <form onSubmit={createPledge} className="grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-4 sm:grid-cols-2">
                <h2 className="text-xl font-bold sm:col-span-2">Create a resource pledge</h2>
                <select className={inputClass} value={pledge.category} onChange={(e) => setPledge({ ...pledge, category: e.target.value })}>
                  {["Water", "Food", "Medical", "Shelter", "Clothing", "Other"].map((item) => <option key={item}>{item}</option>)}
                </select>
                <input className={inputClass} placeholder="Resource name (e.g. Water Bottle)" required value={pledge.resourceName} onChange={(e) => setPledge({ ...pledge, resourceName: e.target.value })} />
                <input className={inputClass} type="number" min="1" placeholder="Quantity" required value={pledge.quantity} onChange={(e) => setPledge({ ...pledge, quantity: e.target.value })} />
                <input className={inputClass} placeholder="Unit (e.g. Bottles)" required value={pledge.unit} onChange={(e) => setPledge({ ...pledge, unit: e.target.value })} />
                <button type="button" onClick={usePledgeLocation} className="rounded-xl border-2 border-blue-600 p-3 font-bold text-blue-600">
                  {pledge.lat ? "Pledge location set" : "Use current location"}
                </button>
                <button className="rounded-xl bg-green-600 p-3 font-bold text-white">Save pledge</button>
              </form>

              <div className="grid gap-3 md:grid-cols-2">
                {pledges.map((item) => (
                  <article key={item.id} className="rounded-2xl border p-4">
                    <div className="flex justify-between gap-3">
                      <h3 className="font-bold">{item.resourceName}</h3>
                      <span className="text-sm text-gray-500">{item.category}</span>
                    </div>
                    <p className="mt-2 text-sm">{item.totalQuantity} Total · <b>{item.remainingQuantity} Available</b> · {item.usedQuantity} Used ({item.unit})</p>
                    
                    {/* FIXED: Inline allocation UI instead of window.prompt */}
                    {allocatingId === item.id ? (
                      <div className="mt-3 flex items-center gap-2">
                        <input 
                          type="number" 
                          min="1" 
                          max={item.remainingQuantity} 
                          value={allocateAmount} 
                          onChange={(e) => setAllocateAmount(e.target.value)} 
                          className="w-24 rounded-lg border p-2 text-sm outline-none focus:ring-2 focus:ring-blue-600" 
                          placeholder="Qty" 
                        />
                        <button onClick={() => confirmConsume(item.id)} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white">Confirm</button>
                        <button onClick={() => { setAllocatingId(null); setAllocateAmount(""); }} className="rounded-lg bg-gray-400 px-3 py-2 text-sm font-bold text-white">Cancel</button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { setAllocatingId(item.id); setAllocateAmount(""); }} 
                        disabled={item.remainingQuantity === 0} 
                        className="mt-3 rounded-lg bg-gray-800 px-3 py-2 text-sm font-bold text-white disabled:bg-gray-300"
                      >
                        Allocate stock
                      </button>
                    )}
                  </article>
                ))}
                {pledges.length === 0 && <p className="text-gray-500">No pledges yet.</p>}
              </div>
            </div>
          )}

          {tab === "reports" && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold">My reports</h2>
              {reports.map((item) => (
                <article key={item.id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-bold">{item.category || item.surveyCategory || "Report"}</h3>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{item.status || "Pending"}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{item.rawText}</p>
                  <p className="mt-2 text-sm"><b>Threat:</b> {item.threatScore ?? "N/A"}/10 · <b>Location:</b> {item.locationText || "Not specified"}</p>
                  <p className="mt-1 text-xs text-gray-500">Created {time(item.createdAt)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => useCurrentLocation(item)} disabled={item.status === "Cancelled"} className="rounded-lg border border-blue-600 px-3 py-2 text-sm font-bold text-blue-600 disabled:border-gray-300 disabled:text-gray-400">Update to current coordinates</button>
                    <button onClick={() => updateDoc(doc(db, "reports", item.id), { status: "Cancelled", updatedAt: serverTimestamp() })} disabled={item.status === "Cancelled"} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white disabled:bg-gray-300">Cancel report</button>
                  </div>
                </article>
              ))}
              {reports.length === 0 && <p className="text-gray-500">You have not submitted any reports yet.</p>}
            </div>
          )}

          {tab === "safe-zone" && (
            <div className="grid gap-7 lg:grid-cols-2">
              <form onSubmit={saveSafeZone} className="flex flex-col gap-3">
                <h2 className="text-xl font-bold">Safe Zone</h2>
                <button type="button" onClick={() => useCurrentLocation()} className="rounded-xl border-2 border-blue-600 p-3 font-bold text-blue-600">Use current location</button>
                <label className="text-sm font-semibold">Latitude<input required type="number" step="any" className={`${inputClass} mt-1`} value={safeZone.latitude} onChange={(e) => setSafeZone({ ...safeZone, latitude: Number(e.target.value) })} /></label>
                <label className="text-sm font-semibold">Longitude<input required type="number" step="any" className={`${inputClass} mt-1`} value={safeZone.longitude} onChange={(e) => setSafeZone({ ...safeZone, longitude: Number(e.target.value) })} /></label>
                <label className="text-sm font-semibold">Radius
                  <select className={`${inputClass} mt-1`} value={safeZone.radiusKm} onChange={(e) => setSafeZone({ ...safeZone, radiusKm: Number(e.target.value) })}>
                    {[2, 5, 10].map((value) => <option key={value} value={value}>{value} km</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2 font-semibold">
                  <input type="checkbox" checked={safeZone.enabled} onChange={(e) => setSafeZone({ ...safeZone, enabled: e.target.checked })} /> Enable proximity alerts
                </label>
                <button className="rounded-xl bg-blue-600 p-3 font-bold text-white">Save Safe Zone</button>
                <p className="text-xs text-gray-500">Alerts use the existing threat score at or above {HIGH_THREAT_THRESHOLD}/10.</p>
              </form>
              <div>
                <h2 className="text-xl font-bold">Notifications</h2>
                <div className="mt-3 space-y-3">
                  {notices.map((notice) => (
                    <button key={notice.id} onClick={() => updateDoc(doc(db, "notifications", notice.id), { read: true })} className={`w-full rounded-2xl border p-4 text-left ${notice.read ? "bg-white" : "bg-blue-50"}`}>
                      <p className="font-bold">{notice.title}</p>
                      <p className="mt-1 text-sm">{notice.message}</p>
                      <p className="mt-1 text-xs text-gray-500">{time(notice.createdAt)}</p>
                    </button>
                  ))}
                  {notices.length === 0 && <p className="text-gray-500">No nearby high-threat alerts.</p>}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}