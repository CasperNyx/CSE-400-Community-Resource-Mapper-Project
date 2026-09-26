"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase";

import ResourceForm from "@/components/ResourceForm";
import SpatialMatchingPanel from "@/components/SpatialMatchingPanel";
import ThreatHeatmap, { ThreatPoint } from "@/components/ThreatHeatmap";
import TimeLapsePlayback, { TimelineEvent } from "@/components/TimeLapsePlayback";
import { LocationPoint } from "@/utils/geoMatching";
import CitizenVolunteerPortal from "@/components/CitizenVolunteerPortal";

const MapComponent = dynamic(() => import("@/components/Map"), { ssr: false });

export default function MapPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  const [activeView, setActiveView] = useState<"map" | "portal">("map");
  // NEW: State to track if sidebar is minimized
  const [isCollapsed, setIsCollapsed] = useState(false); 
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [matchingRadius, setMatchingRadius] = useState<number>(10);
  const [isHeatmapActive, setIsHeatmapActive] = useState<boolean>(true); 
  const [realLocations, setRealLocations] = useState<LocationPoint[]>([]);
  const [realThreats, setRealThreats] = useState<ThreatPoint[]>([]);
  const [realEvents, setRealEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) router.replace("/login");
      else setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    const unsubscribeDb = onSnapshot(collection(db, "reports"), (snapshot) => {
      const fetchedLocations: LocationPoint[] = [];
      const fetchedThreats: ThreatPoint[] = [];
      const fetchedEvents: TimelineEvent[] = [];

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.lat && data.lng) {
          fetchedLocations.push({
            id: doc.id,
            type: data.intent === "Need" ? "need" : "offer",
            category: data.category || "General",
            latitude: Number(data.lat),
            longitude: Number(data.lng),
            title: data.locationText || data.rawText || "Report",
          });
          if (data.threatScore > 0) {
            fetchedThreats.push({ id: doc.id, latitude: Number(data.lat), longitude: Number(data.lng), severity: data.threatScore || 1, locationName: data.locationText || "Incident Zone" });
          }
          fetchedEvents.push({ id: doc.id, title: data.category || "Incident", timestamp: data.createdAt?.toDate?.()?.toLocaleTimeString() || new Date().toLocaleTimeString(), hourOffset: 1, description: data.rawText || "Report logged" });
        }
      });
      setRealLocations(fetchedLocations);
      setRealThreats(fetchedThreats);
      setRealEvents(fetchedEvents);
    });
    return () => unsubscribeDb();
  }, []);

  if (!user) return <div className="min-h-screen bg-slate-50" />;

  return (
    <main className="w-full h-screen relative overflow-hidden bg-gray-100 flex">
      {isMobileOpen && <button className="fixed inset-0 z-[1200] bg-slate-950/50 lg:hidden" onClick={() => setIsMobileOpen(false)} />}
      
      {/* COLLAPSIBLE SIDEBAR: Width transitions between w-20 (minimized) and w-80 (expanded) */}
      <aside className={`fixed inset-y-0 left-0 z-[1300] flex flex-col bg-[#102a43] text-white shadow-2xl transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? "w-20" : "w-80"}`}>
        
        {/* Header & Toggle Button */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f4b942] font-black text-[#102a43]">CR</span>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-black tracking-wide truncate">Community Relief</p>
                <p className="text-xs text-slate-300 truncate">User Dashboard</p>
              </div>
            )}
          </div>
          {/* The Collapse/Expand Arrow */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
          >
            {isCollapsed ? "❯" : "❮"}
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={`flex flex-col gap-2 p-4 ${isCollapsed ? "items-center" : ""}`}>
          <button onClick={() => { setActiveView("map"); setIsMobileOpen(false); }} className={`flex items-center gap-3 rounded-xl p-3 font-bold transition-colors ${activeView === "map" ? "bg-[#f4b942] text-[#102a43]" : "text-slate-300 hover:text-white hover:bg-white/5"} ${isCollapsed ? "justify-center w-12" : "w-full text-left"}`} title="Live Map">
            <span className="text-xl">📍</span>
            {!isCollapsed && <span className="text-sm">Live Map</span>}
          </button>
          
          <button onClick={() => { setActiveView("portal"); setIsMobileOpen(false); }} className={`flex items-center gap-3 rounded-xl p-3 font-bold transition-colors ${activeView === "portal" ? "bg-[#f4b942] text-[#102a43]" : "text-slate-300 hover:text-white hover:bg-white/5"} ${isCollapsed ? "justify-center w-12" : "w-full text-left"}`} title="Citizen Portal">
            <span className="text-xl">🤝</span>
            {!isCollapsed && <span className="text-sm">Citizen Portal</span>}
          </button>
        </div>

        {/* Tools Panel - Hides completely when collapsed */}
        {activeView === "map" && !isCollapsed && (
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            <SpatialMatchingPanel locations={realLocations} onRadiusChange={(r) => setMatchingRadius(r)} />
            <ThreatHeatmap threats={realThreats} onToggleHeatmap={(active) => setIsHeatmapActive(active)} />
            <TimeLapsePlayback events={realEvents} />
          </div>
        )}

        <div className="p-4 border-t border-white/10 mt-auto flex justify-center">
          <button onClick={() => auth.signOut()} className={`text-xs font-bold text-slate-400 hover:text-white transition-colors ${isCollapsed ? "" : "w-full text-left"}`} title="Sign out">
            {isCollapsed ? "⎋" : `Sign out (${user.email})`}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 h-full relative flex flex-col min-w-0">
        <button className="absolute top-4 left-4 z-[1100] grid h-10 w-10 place-items-center rounded-xl bg-white border border-slate-200 text-lg shadow-sm lg:hidden" onClick={() => setIsMobileOpen(true)}>=</button>

        {activeView === "map" ? (
          <>
            <div className="flex-1 relative"><MapComponent radiusKm={matchingRadius} showHeatmap={isHeatmapActive} /></div>
            <div className="z-[1000] relative bg-white border-t border-gray-200"><ResourceForm /></div>
          </>
        ) : (
          <div className="flex-1 overflow-auto bg-slate-50"><CitizenVolunteerPortal /></div>
        )}
      </div>
    </main>
  );
}