'use client';

import React, { useState, useEffect } from 'react';
import { calculateDistance } from '@/utils/geoMatching';

export default function SpatialMatchingPanel() {
  const [radius, setRadius] = useState<number>(10);
  const [centerPoint, setCenterPoint] = useState({ lat: 23.8759, lng: 90.3795 });
  const [locations, setLocations] = useState<any[]>([]);

  // Listens to the Map broadcasting data
  useEffect(() => {
    const handleZone = (e: any) => setCenterPoint(e.detail);
    const handleData = (e: any) => setLocations(e.detail || []);

    window.addEventListener("safeZoneChanged", handleZone);
    window.addEventListener("reportsLoaded", handleData);
    
    return () => {
      window.removeEventListener("safeZoneChanged", handleZone);
      window.removeEventListener("reportsLoaded", handleData);
    };
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setRadius(val);
    window.dispatchEvent(new CustomEvent("setRadius", { detail: val }));
  };

  const matchedLocations = locations.filter((loc) => {
    return calculateDistance(centerPoint.lat, centerPoint.lng, loc.lat || 0, loc.lng || 0) <= radius;
  });

  return (
    <div className="bg-slate-900/90 text-white p-4 rounded-xl border border-slate-700 shadow-xl space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
          <span>⚡</span> Smart Spatial Matching
        </h3>
        <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-mono">
          {matchedLocations.length} Real Matches
        </span>
      </div>
      
      <p className="text-[10px] text-gray-400 leading-tight">
        Click anywhere on the map to define the center of your Safe Zone perimeter.
      </p>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-300 font-medium">
          <span>Matching Radius</span>
          <span className="text-emerald-400 font-bold">{radius} km</span>
        </div>
        <input type="range" min="1" max="50" value={radius} onChange={handleSliderChange} className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg" />
      </div>

      <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
        {matchedLocations.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No real reports within {radius} km.</p>
        ) : (
          matchedLocations.map((loc) => {
            const dist = calculateDistance(centerPoint.lat, centerPoint.lng, loc.lat || 0, loc.lng || 0);
            return (
              <div key={loc.id} className="text-xs bg-slate-800/80 p-2 rounded border border-slate-700">
                <div className="flex justify-between text-emerald-300 font-semibold">
                  <span>{loc.intent?.toUpperCase() || "REPORT"}: {loc.locationText}</span>
                  <span>{dist.toFixed(2)} km</span>
                </div>
                <div className="text-[10px] text-gray-400">Category: {loc.category}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}