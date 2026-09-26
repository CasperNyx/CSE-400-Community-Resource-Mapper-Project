'use client';

import React, { useState, useEffect } from 'react';

export default function TimeLapsePlayback() {
  const [currentHour, setCurrentHour] = useState<number>(24);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [totalIncidents, setTotalIncidents] = useState<number>(0);

  // 1. Listen for the total incident count from the map
  useEffect(() => {
    const handleData = (e: any) => setTotalIncidents(e.detail?.length || 0);
    window.addEventListener("reportsLoaded", handleData);
    return () => window.removeEventListener("reportsLoaded", handleData);
  }, []);

  // 2. Safely broadcast the hour to the map ONLY after this component has rendered
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("setTime", { detail: currentHour }));
  }, [currentHour]);

  // 3. Independent timer loop
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isPlaying) {
      // If pressing play while at the end, jump back to the beginning
      setCurrentHour((prev) => (prev >= 24 ? 1 : prev));
      
      timer = setInterval(() => {
        setCurrentHour((prev) => {
          const next = prev + 1;
          if (next >= 24) {
            setIsPlaying(false);
            return 24;
          }
          return next;
        });
      }, 1500); 
    }
    
    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentHour(Number(e.target.value));
  };

  return (
    <div className="bg-slate-900/90 text-white p-4 rounded-xl shadow-lg border border-slate-700 mt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-sky-400">⏱️ Time-Lapse</h3>
        <span className="bg-sky-500/20 text-sky-300 text-xs px-2 py-1 rounded border border-sky-500/30">
          Hour: {currentHour}/24
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setIsPlaying(!isPlaying)} className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md">
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>
        <input type="range" min="1" max="24" value={currentHour} onChange={handleSliderChange} className="w-full accent-sky-500 cursor-pointer" />
      </div>

      <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-xs flex justify-between items-center">
        <span className="text-gray-400">Total Crisis Volume:</span>
        <span className="text-sky-300 font-bold">{totalIncidents} Recorded</span>
      </div>
    </div>
  );
}