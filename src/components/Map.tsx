"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// @ts-ignore
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import { db } from "@/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import L from "leaflet";
import Link from "next/link";

// 1. The Bulletproof Individual Pin (Ensures single pins never disappear)
const getMarkerIcon = (intent: string) => {
  const color = intent === "Need" ? "#dc2626" : "#16a34a"; 
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.5);"></div>`,
    className: "custom-individual-pin",
    iconSize: L.point(24, 24),
    iconAnchor: L.point(12, 12),
  });
};

// 2. The Bulletproof Cluster Bubble (Bypasses Tailwind)
const createCustomClusterIcon = (cluster: any) => {
  return L.divIcon({
    html: `<div style="background-color: #2563eb; color: white; font-weight: bold; border-radius: 50%; height: 40px; width: 40px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 16px;">
            ${cluster.getChildCount()}
           </div>`,
    className: "custom-cluster-icon",
    iconSize: L.point(40, 40, true),
  });
};

interface Report {
  id: string;
  intent: string;
  category: string;
  urgency: string;
  locationText: string;
  rawText: string;
  lat: number;
  lng: number;
  threatScore?: number;
}

export default function Map() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<"All" | "Need" | "Offer">("All");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "reports"), (snapshot) => {
      const reportsData: Report[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Report, "id">),
      }));
      setReports(reportsData);
    });

    return () => unsubscribe();
  }, []);

  const filteredReports = reports.filter((report) => 
    filter === "All" ? true : report.intent === filter
  );

  return (
    <div className="relative w-full h-full">
      {/* Floating Filter Controls */}
      <div className="absolute top-4 left-0 right-0 z-[1000] flex justify-center drop-shadow-md pointer-events-none">
        <div className="bg-white p-1 rounded-full flex gap-1 border border-gray-200 pointer-events-auto">
          <button 
            onClick={() => setFilter("All")}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === "All" ? "bg-blue-600 text-white" : "bg-transparent text-gray-600 hover:bg-gray-100"}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter("Need")}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === "Need" ? "bg-red-500 text-white" : "bg-transparent text-gray-600 hover:bg-gray-100"}`}
          >
            Needs
          </button>
          <button 
            onClick={() => setFilter("Offer")}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${filter === "Offer" ? "bg-green-500 text-white" : "bg-transparent text-gray-600 hover:bg-gray-100"}`}
          >
            Offers
          </button>
        </div>
      </div>

      {/* Floating Admin Button */}
      <div className="absolute top-4 right-4 z-[1000]">
        <Link 
          href="/admin" 
          className="flex items-center gap-1.5 bg-gray-900/90 backdrop-blur text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-black transition-all"
        >
          <span>🛡️</span>
          <span>Admin</span>
        </Link>
      </div>

      <MapContainer 
        center={[23.8759, 90.3795]} 
        zoom={14} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkerClusterGroup 
          chunkedLoading 
          spiderfyOnMaxZoom={true} 
          showCoverageOnHover={false}
          maxClusterRadius={50}
          iconCreateFunction={createCustomClusterIcon}
        >
          {filteredReports.map((report) => (
            <Marker 
              key={report.id} 
              position={[report.lat, report.lng]} 
              icon={getMarkerIcon(report.intent)}
            >
              <Popup>
                <div className="p-1 max-w-xs">
                  <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded mb-1 text-white ${
                    report.intent === "Need" ? "bg-red-500" : "bg-green-500"
                  }`}>
                    {report.intent}: {report.category}
                  </span>
                  
                  <p className="text-sm font-semibold text-gray-900 mt-1">{report.locationText}</p>
                  <p className="text-xs text-gray-600 mt-1">{report.rawText}</p>
                  
                  <div className="mt-2 text-[10px] text-gray-500 font-medium uppercase tracking-wider flex justify-between items-center border-t pt-2">
                    <span>Urgency: {report.urgency}</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${
                      report.threatScore === 0 ? "bg-gray-100 text-gray-600" :
                      (report.threatScore || 1) >= 8 ? "bg-red-100 text-red-700" : 
                      (report.threatScore || 1) >= 4 ? "bg-orange-100 text-orange-700" : 
                      "bg-green-100 text-green-700"
                    }`}>
                      {report.threatScore === 0 ? "Threat: N/A" : `Threat: ${report.threatScore || 1}/10`}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}