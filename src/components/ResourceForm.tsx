"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, addDoc, doc, onSnapshot, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export default function ResourceForm() {
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // States for tracking active user reports
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeReportData, setActiveReportData] = useState<any>(null);
  
  const [isMinimized, setIsMinimized] = useState(false);
  
  // States for updating location
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [newLocationText, setNewLocationText] = useState("");

  // 1. On mount, check if this device already has an active report
  useEffect(() => {
    const storedId = localStorage.getItem("community_mapper_report_id");
    if (storedId) {
      setActiveReportId(storedId);
    }
  }, []);

  // 2. Listen to the active report in real-time from Firebase
  useEffect(() => {
    if (!activeReportId) return;

    const docRef = doc(db, "reports", activeReportId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setActiveReportData(docSnap.data());
      } else {
        // If the document is gone (deleted by admin or user), reset the UI
        localStorage.removeItem("community_mapper_report_id");
        setActiveReportId(null);
        setActiveReportData(null);
      }
    });

    return () => unsubscribe();
  }, [activeReportId]);

  // Submit a brand new report
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setIsProcessing(true);

    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      // Save directly to Firebase using the precise lat/lng calculated by our backend route
      const docRef = await addDoc(collection(db, "reports"), {
        intent: data.intent,
        category: data.category,
        urgency: data.urgency,
        locationText: data.location,
        threatScore: data.threatScore !== undefined ? data.threatScore : 1,
        rawText: inputText,
        lat: data.lat || 23.8759,
        lng: data.lng || 90.3795,
        createdAt: serverTimestamp(),
      });

      localStorage.setItem("community_mapper_report_id", docRef.id);
      setActiveReportId(docRef.id);
      setInputText("");
    } catch (error) {
      console.error("Triage error:", error);
      alert("Failed to process request. Please check the terminal.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel/Resolve the active report
  const handleCancelReport = async () => {
    if (!activeReportId) return;
    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, "reports", activeReportId));
      localStorage.removeItem("community_mapper_report_id");
      setActiveReportId(null);
      setActiveReportData(null);
    } catch (error) {
      console.error("Failed to cancel:", error);
      alert("Failed to cancel report.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Update location for active report
  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationText.trim() || !activeReportId || !activeReportData) return;
    setIsProcessing(true);

    try {
      let lat = activeReportData.lat;
      let lng = activeReportData.lng;
      try {
        const geoQuery = encodeURIComponent(newLocationText + ", Dhaka, Bangladesh");
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${geoQuery}`);
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
        }
      } catch (err) {
        console.warn("Geocoding failed.");
      }

      await updateDoc(doc(db, "reports", activeReportId), {
        locationText: newLocationText,
        lat: lat,
        lng: lng,
        updatedAt: serverTimestamp(),
      });

      setIsUpdatingLocation(false);
      setNewLocationText("");
    } catch (error) {
      console.error("Failed to update location:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- UI RENDERING ---

  return (
    <div className="absolute bottom-0 left-0 w-full z-[1000] p-5 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] pb-8 max-h-[50vh] overflow-y-auto">
      <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-5" /> 

      {/* STATE 1: ACTIVE REPORT DASHBOARD */}
      {activeReportId && activeReportData ? (
        <div className="flex flex-col gap-4">
          
          {/* Header with Minimize & Clear Buttons */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Active Status</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsMinimized(!isMinimized)} 
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300 transition-all"
              >
                {isMinimized ? "Expand" : "Minimize"}
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem("community_mapper_report_id");
                  setActiveReportId(null);
                  setActiveReportData(null);
                }} 
                className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-bold hover:bg-red-200 transition-all"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Collapsible Content */}
          {!isMinimized && (
            <>
              <div className="flex justify-between items-start">
                <span className={`px-3 py-1 text-xs font-bold rounded-full text-white ${activeReportData.intent === "Need" ? "bg-red-500" : "bg-green-500"}`}>
                  {activeReportData.intent}: {activeReportData.category}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-gray-700">
                <p className="mb-2"><strong>Location:</strong> {activeReportData.locationText}</p>
                <p className="mb-2"><strong>Urgency:</strong> {activeReportData.urgency}</p>
                <p className="italic text-gray-500">"{activeReportData.rawText}"</p>
              </div>

              {isUpdatingLocation ? (
                <form onSubmit={handleUpdateLocation} className="flex flex-col gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Enter new neighborhood or landmark..."
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600"
                    value={newLocationText}
                    onChange={(e) => setNewLocationText(e.target.value)}
                    disabled={isProcessing}
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsUpdatingLocation(false)} className="flex-1 p-3 rounded-xl bg-gray-200 text-gray-800 font-bold">Cancel</button>
                    <button type="submit" disabled={isProcessing} className="flex-1 p-3 rounded-xl bg-blue-600 text-white font-bold">{isProcessing ? "..." : "Save"}</button>
                  </div>
                </form>
              ) : (
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => setIsUpdatingLocation(true)} 
                    className="flex-1 py-3 rounded-xl border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50 transition-all"
                  >
                    Update Location
                  </button>
                  <button 
                    onClick={handleCancelReport} 
                    disabled={isProcessing}
                    className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-900 transition-all disabled:bg-gray-400"
                  >
                    Resolve & Clear
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* STATE 2: NEW REPORT FORM */
        <>
          <h2 className="text-xl font-bold text-gray-800 mb-3">Community Relief Triage</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              className="w-full p-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-800 bg-gray-50 resize-none"
              rows={3}
              placeholder="Describe what you need or what you can offer..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:bg-gray-400"
            >
              {isProcessing ? "Processing..." : "Submit Report"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}