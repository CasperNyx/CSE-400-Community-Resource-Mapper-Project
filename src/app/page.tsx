import HeroSection from "@/components/landing/HeroSection";
import VisionSection from "@/components/landing/VisionSection";
import AppPreviewSection from "@/components/landing/AppPreviewSection";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <HeroSection />
      <VisionSection />
      <AppPreviewSection />
    </main>
  );
}