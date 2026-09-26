"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from "react-leaflet";
// @ts-ignore
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import { db, auth } from "@/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getUserRole } from "@/lib/roles";
import L from "leaflet";
import Link from "next/link";

const getMarkerIcon = (intent: string) => {
  const color = intent === "Need" ? "#dc2626" : "#16a34a"; 
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.5);"></div>`,
    className: "custom-individual-pin",
    iconSize: L.point(24, 24),
    iconAnchor: L.point(12, 12),
  });
};

const createCustomClusterIcon = (cluster: any) => {
  return L.divIcon({
    html: `<div style="background-color: #2563eb; color: white; font-weight: bold; border-radius: 50%; height: 40px; width: 40px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 16px;">
            ${cluster.getChildCount()}
           </div>`,
    className: "custom-cluster-icon",
    iconSize: L.point(40, 40, true),
  });
};

// Intercepts map clicks and broadcasts the coordinates
function MapClickHandler() {
  useMapEvents({
    click(e) {
      window.dispatchEvent(new CustomEvent("safeZoneChanged", { 
        detail: { lat: e.latlng.lat, lng: e.latlng.lng } 
      }));
    },
  });
  return null;
}

export default function Map({ showHeatmap = true }: { showHeatmap?: boolean }) {
  const [reports, setReports] = useState<any[]>([]);
  const [filter, setFilter] = useState<"All" | "Need" | "Offer">("All");
  const [isAdmin, setIsAdmin] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Internal State
  const [safeZone, setSafeZone] = useState({ lat: 23.8759, lng: 90.3795 });
  const [radiusKm, setRadiusKm] = useState(10);
  const [playbackHour, setPlaybackHour] = useState(24);
  const prevHourRef = useRef(playbackHour);

  // 1. Listen for background instructions from the separate Sidebar panels
  useEffect(() => {
    const handleRadius = (e: any) => setRadiusKm(e.detail);
    const handleTime = (e: any) => setPlaybackHour(e.detail);
    const handleZone = (e: any) => setSafeZone(e.detail);

    window.addEventListener("setRadius", handleRadius);
    window.addEventListener("setTime", handleTime);
    window.addEventListener("safeZoneChanged", handleZone);

    return () => {
      window.removeEventListener("setRadius", handleRadius);
      window.removeEventListener("setTime", handleTime);
      window.removeEventListener("safeZoneChanged", handleZone);
    };
  }, []);

  // 2. Fetch, Sort, and Broadcast Data
  useEffect(() => {
    const unsubscribeDb = onSnapshot(collection(db, "reports"), (snapshot) => {
      const rawData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // MUST sort by actual creation time so the timelapse plays chronologically
      const sortedData = rawData.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeA - timeB;
      });

      // Assign sequential hours across the 24h timeline
      const mappedReports = sortedData.map((r, index) => {
        const simHour = sortedData.length > 0 ? Math.max(1, Math.ceil(((index + 1) / sortedData.length) * 24)) : 1;
        return { ...r, simHour };
      });

      setReports(mappedReports);
      
      // Broadcast the processed, chronological data to the sidebar
      window.dispatchEvent(new CustomEvent("reportsLoaded", { detail: mappedReports }));
    });
    return () => unsubscribeDb();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) setIsAdmin(await getUserRole(currentUser.uid) === "super-admin");
      else setIsAdmin(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // 3. Time-Lapse High-Threat Toasts
  useEffect(() => {
    if (playbackHour > prevHourRef.current && playbackHour < 24) {
      const newlyRevealed = reports.filter(r => r.simHour === playbackHour);
      if (newlyRevealed.length > 0) {
        const highThreat = newlyRevealed.find(r => (r.threatScore || 0) >= 7);
        if (highThreat) {
          setToastMessage(`⏱️ TIMELAPSE: Level ${highThreat.threatScore} incident surfaced at Hour ${playbackHour}`);
          setTimeout(() => setToastMessage(null), 3000);
        }
      }
    }
    prevHourRef.current = playbackHour;
  }, [playbackHour, reports]);

  const filteredReports = reports.filter((report) => {
    if (report.status === "Cancelled") return false;
    if (filter !== "All" && report.intent !== filter) return false;
    if (report.simHour > playbackHour) return false;
    return true;
  });

  return (
    <div className="relative w-full h-full">
      {toastMessage && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[2000] bg-red-600/95 backdrop-blur text-white px-6 py-3 rounded-lg shadow-2xl font-bold flex items-center gap-3 animate-bounce max-w-lg text-sm text-center border-2 border-white">
          {toastMessage}
        </div>
      )}

      <div className="absolute top-4 left-0 right-0 z-[1000] flex justify-center drop-shadow-md pointer-events-none">
        <div className="bg-white p-1 rounded-full flex gap-1 border border-gray-200 pointer-events-auto">
          <button onClick={() => setFilter("All")} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === "All" ? "bg-blue-600 text-white" : "bg-transparent text-gray-600 hover:bg-gray-100"}`}>All</button>
          <button onClick={() => setFilter("Need")} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === "Need" ? "bg-red-500 text-white" : "bg-transparent text-gray-600 hover:bg-gray-100"}`}>Needs</button>
          <button onClick={() => setFilter("Offer")} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === "Offer" ? "bg-green-500 text-white" : "bg-transparent text-gray-600 hover:bg-gray-100"}`}>Offers</button>
        </div>
      </div>

      {isAdmin && (
        <div className="absolute top-4 right-4 z-[1000] flex gap-2 pointer-events-auto">
          <Link href="/admin" className="flex items-center gap-1.5 bg-gray-900/90 backdrop-blur text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-black transition-all">
            <span>🛡️</span><span>Admin</span>
          </Link>
        </div>
      )}

      <MapContainer center={[23.8759, 90.3795]} zoom={14} style={{ height: "100%", width: "100%", zIndex: 0 }}>
        <MapClickHandler />
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Circle 
          center={[safeZone.lat, safeZone.lng]} 
          radius={radiusKm * 1000} 
          pathOptions={{ 
            color: '#10b981', 
            fillColor: '#10b981', 
            fillOpacity: 0.12, 
            weight: 3, 
            dashArray: '6, 6',
            interactive: false // CRITICAL FIX: Ensures the circle doesn't swallow future mouse clicks
          }} 
        />

        {showHeatmap && filteredReports.map((report) => (
          <Circle key={`heat-${report.id}`} center={[report.lat || 0, report.lng || 0]} radius={1500} pathOptions={{ color: report.intent === "Need" ? '#ef4444' : '#10b981', fillColor: report.intent === "Need" ? '#f87171' : '#34d399', fillOpacity: 0.5, stroke: false }} />
        ))}

        {!showHeatmap && (
          <MarkerClusterGroup chunkedLoading spiderfyOnMaxZoom={true} showCoverageOnHover={false} maxClusterRadius={50} iconCreateFunction={createCustomClusterIcon}>
            {filteredReports.map((report) => (
              <Marker key={report.id} position={[report.lat || 0, report.lng || 0]} icon={getMarkerIcon(report.intent)}>
                <Popup>
                  <div className="p-1 max-w-xs">
                    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded mb-1 text-white ${report.intent === "Need" ? "bg-red-500" : "bg-green-500"}`}>{report.intent}: {report.category}</span>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{report.locationText}</p>
                    <p className="text-xs text-gray-600 mt-1">{report.rawText}</p>
                    <div className="mt-2 text-[10px] text-gray-500 font-medium uppercase tracking-wider flex justify-between items-center border-t pt-2">
                      <span>Urgency: {report.urgency}</span>
                      <span className={`font-bold px-2 py-0.5 rounded ${report.threatScore === 0 ? "bg-gray-100 text-gray-600" : (report.threatScore || 1) >= 8 ? "bg-red-100 text-red-700" : (report.threatScore || 1) >= 4 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>Threat: {report.threatScore || 1}/10</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}
      </MapContainer>
    </div>
  );
}