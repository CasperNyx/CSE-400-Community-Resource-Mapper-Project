"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { db } from "@/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import L from "leaflet";
import Link from "next/link";

// Dynamic icon generator based on triage intent
const getMarkerIcon = (intent: string) => {
  const color = intent === "Need" ? "red" : "green";
  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
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
                <div className="mt-2 text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                  Urgency: {report.urgency}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}