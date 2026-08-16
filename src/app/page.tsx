"use client";

import dynamic from "next/dynamic";
import ResourceForm from "@/components/ResourceForm";

// We dynamically import the map to prevent Server-Side Rendering (SSR) errors with Leaflet
const MapComponent = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  return (
    <main className="w-full h-screen relative overflow-hidden bg-gray-100">
      <MapComponent />
      <ResourceForm />
    </main>
  );
}