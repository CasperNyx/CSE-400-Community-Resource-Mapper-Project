'use client';

import React, { useState } from 'react';

export interface ThreatPoint {
  id: string;
  latitude: number;
  longitude: number;
  severity: number; // 1 to 10
  locationName: string;
}

interface ThreatHeatmapProps {
  threats: ThreatPoint[];
  onToggleHeatmap?: (isActive: boolean) => void;
}

export default function ThreatHeatmap({ threats = [], onToggleHeatmap }: ThreatHeatmapProps) {
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);

  const handleToggle = () => {
    const newState = !showHeatmap;
    setShowHeatmap(newState);
    if (onToggleHeatmap) onToggleHeatmap(newState);
  };

  // Grouping/calculating risk level
  const highRiskCount = threats.filter((t) => t.severity >= 7).length;

  return (
    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg border border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-rose-400">🔥 Dynamic Threat Heatmap</h3>
          <p className="text-xs text-gray-400">Macro-level risk zones & density clusters</p>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            showHeatmap
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'bg-slate-800 text-gray-400 border border-slate-700'
          }`}
        >
          {showHeatmap ? 'Heatmap: ON' : 'Pins Mode: ON'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
          <span className="text-xs text-gray-400 block">Total Active Incidents</span>
          <span className="text-xl font-bold text-white">{threats.length}</span>
        </div>
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
          <span className="text-xs text-gray-400 block">High Risk Zones (≥7)</span>
          <span className="text-xl font-bold text-rose-500">{highRiskCount}</span>
        </div>
      </div>

      {/* Visual Overlay Status */}
      <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-xs">
        <span className="text-gray-300 font-medium">Map View Status: </span>
        {showHeatmap ? (
          <span className="text-rose-400 font-semibold">
            Converting individual pins into visual density heat clusters.
          </span>
        ) : (
          <span className="text-emerald-400 font-semibold">
            Showing individual Leaflet map pins.
          </span>
        )}
      </div>
    </div>
  );
}