"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { User } from "firebase/auth";
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/firebase";
import dynamic from "next/dynamic";
import ResourceForm from "@/components/ResourceForm";
import SpatialMatchingPanel from "@/components/SpatialMatchingPanel";
import TimeLapsePlayback from "@/components/TimeLapsePlayback";
import { getUserRole, AccessRole } from "@/lib/roles";

const MapComponent = dynamic(() => import("@/components/Map"), { ssr: false });

type DashboardView = "maps" | "data" | "tracking" | "settings";

interface Report {
  id: string;
  intent: string;
  category: string;
  urgency: string;
  locationText: string;
  rawText: string;
  threatScore?: number;
}

const navigation: Array<{ id: DashboardView; label: string; shortLabel: string; icon: string }> = [
  { id: "maps", label: "Live maps", shortLabel: "Map", icon: "M" },
  { id: "data", label: "Data tables", shortLabel: "Data", icon: "D" },
  { id: "tracking", label: "Personal tracking", shortLabel: "Track", icon: "T" },
  { id: "settings", label: "Settings", shortLabel: "Settings", icon: "S" },
];

function Sidebar({ activeView, isCollapsed, isMobileOpen, onNavigate, onClose, onToggle }: any) {
  return (
    <>
      {isMobileOpen && <button className="fixed inset-0 z-[1200] bg-slate-950/50 lg:hidden" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`fixed inset-y-0 left-0 z-[1300] flex w-[340px] flex-col bg-[#102a43] px-4 py-5 text-white shadow-2xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? "lg:w-[88px]" : "lg:w-[340px]"}`}>
        <div className="flex items-center justify-between gap-3 px-2">
          <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? "lg:justify-center" : ""}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f4b942] font-black text-[#102a43]">CR</span>
            {!isCollapsed && <div className="min-w-0"><p className="truncate text-sm font-black tracking-wide">Community Relief</p><p className="text-xs text-slate-300">Triage network</p></div>}
          </div>
          <button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl text-slate-300 hover:bg-white/10 hover:text-white" onClick={onToggle}>
            {isCollapsed ? ">" : "<"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-4 mt-6">
          {!isCollapsed && <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Workspace</p>}
          <nav className="space-y-2 lg:mt-0">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition-colors ${activeView === item.id ? "bg-[#f4b942] text-[#102a43]" : "text-slate-200 hover:bg-white/10 hover:text-white"} ${isCollapsed ? "lg:justify-center" : ""}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-black ${activeView === item.id ? "bg-[#102a43] text-[#f4b942]" : "bg-white/10 text-slate-200"}`}>{item.icon}</span>
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Independent, Self-Sufficient Sidebar Panels */}
          {!isCollapsed && activeView === "maps" && (
            <div className="mt-8 space-y-5 border-t border-[#1a4369] pt-6 px-1">
              <SpatialMatchingPanel />
              <TimeLapsePlayback />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default function DashboardShell({ user }: { user: User }) {
  const [activeView, setActiveView] = useState<DashboardView>("maps");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [role, setRole] = useState<AccessRole>("pending");
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    getUserRole(user.uid).then(setRole).catch(() => setRole("pending"));
  }, [user.uid]);

  useEffect(() => {
    const reportsQuery = role === "super-admin"
      ? query(collection(db, "reports"))
      : query(collection(db, "reports"), where("ownerId", "==", user.uid));
    return onSnapshot(reportsQuery, (snapshot) => {
      setReports(snapshot.docs.map((reportDoc) => ({ id: reportDoc.id, ...(reportDoc.data() as Omit<Report, "id">) })));
    });
  }, [role, user.uid]);

  const activeLabel = navigation.find((item) => item.id === activeView)?.label ?? "Live maps";

  return (
    <main className="flex min-h-screen bg-[#f4f7f8] text-slate-900">
      <Sidebar 
        activeView={activeView} 
        isCollapsed={isCollapsed} 
        isMobileOpen={isMobileOpen} 
        onNavigate={(v: DashboardView) => { setActiveView(v); setIsMobileOpen(false); }} 
        onClose={() => setIsMobileOpen(false)} 
        onToggle={() => { setIsCollapsed(!isCollapsed); setIsMobileOpen(false); }} 
      />
      
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[76px] items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-lg text-slate-700 lg:hidden" onClick={() => setIsMobileOpen(true)}>=</button>
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#157a8a]">Response workspace</p><h1 className="text-xl font-black sm:text-2xl">{activeLabel}</h1></div>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div className="hidden sm:block"><p className="max-w-52 truncate text-sm font-bold text-slate-800">{user.email}</p><p className="text-xs capitalize text-slate-500">{role.replace("-", " ")}</p></div>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50" onClick={() => auth.signOut()}>Sign out</button>
          </div>
        </header>

        {activeView === "maps" && (
          <div className="relative min-h-[calc(100vh-76px)] flex-1 overflow-hidden">
            {/* The Map mounts completely decoupled from the parent state */}
            <MapComponent />
            <ResourceForm />
          </div>
        )}
        
        {activeView === "data" && <DataTable reports={reports} />}
        {activeView === "tracking" && <TrackingPanel reports={reports} />}
        {activeView === "settings" && <SettingsPanel role={role} user={user} />}
      </section>
    </main>
  );
}

function DataTable({ reports }: { reports: Report[] }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        
        if (!triageRes.ok) continue; 
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
      alert("An error occurred during bulk upload.");
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      e.target.value = ''; 
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Your role-scoped report feed</p>
          <h2 className="mt-1 text-2xl font-black">Incident data</h2>
        </div>
        <div className="flex items-center gap-4">
          {isUploading ? (
            <span className="text-sm font-bold text-[#157a8a]">Processing {uploadProgress.current} / {uploadProgress.total}...</span>
          ) : (
            <label className="cursor-pointer bg-[#102a43] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#1a4369] transition-all shadow-sm">
              Bulk Upload AI
              <input type="file" accept=".csv, .txt" className="hidden" onChange={handleBulkUpload} />
            </label>
          )}
          <span className="rounded-full bg-[#d9f1ed] px-3 py-1 text-sm font-bold text-[#126b6b]">{reports.length} reports</span>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="p-4">Threat</th><th className="p-4">Intent</th><th className="p-4">Category</th><th className="p-4">Location</th><th className="p-4">Signal</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-slate-500">No reports are available.</td></tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="p-4 font-black">{report.threatScore ?? "N/A"}</td>
                    <td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-bold ${report.intent === "Need" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{report.intent}</span></td>
                    <td className="p-4 font-semibold">{report.category}</td>
                    <td className="p-4 text-slate-600">{report.locationText}</td>
                    <td className="max-w-xs truncate p-4 text-slate-500">{report.rawText}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TrackingPanel({ reports }: { reports: Report[] }) {
  const activeReportId = useSyncExternalStore(
    (onChange) => { window.addEventListener("storage", onChange); return () => window.removeEventListener("storage", onChange); },
    () => localStorage.getItem("community_mapper_report_id"),
    () => null,
  );
  const activeReport = reports.find((report) => report.id === activeReportId);

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#157a8a]">Personal tracking</p>
        <h2 className="mt-2 text-2xl font-black">Stay close to your report</h2>
        {activeReport ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div><p className="text-xs font-bold uppercase text-slate-400">Status</p><p className="mt-1 font-black text-[#157a8a]">Active response</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Location</p><p className="mt-1 font-bold">{activeReport.locationText}</p></div>
            <div><p className="text-xs font-bold uppercase text-slate-400">Urgency</p><p className="mt-1 font-bold">{activeReport.urgency}</p></div>
          </div>
        ) : (
          <div className="mt-8 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No active report is linked. Submit a report to start tracking.</div>
        )}
      </div>
    </div>
  );
}

function SettingsPanel({ role, user }: { role: AccessRole; user: User }) {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#157a8a]">Settings</p>
        <h2 className="mt-2 text-2xl font-black">Account and access</h2>
        <dl className="mt-8 divide-y divide-slate-100">
          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between"><dt className="text-sm text-slate-500">Signed-in email</dt><dd className="font-bold">{user.email}</dd></div>
          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between"><dt className="text-sm text-slate-500">Access role</dt><dd className="font-bold capitalize">{role.replace("-", " ")}</dd></div>
        </dl>
      </div>
    </div>
  );
}