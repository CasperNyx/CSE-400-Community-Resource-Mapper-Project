// VisionSection provides the second scroll section with a strong climate-resilience message.
export default function VisionSection() {
  return (
    <section
      className="relative isolate overflow-hidden bg-slate-900"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.7)), url('https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80')",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-12">
        <div className="max-w-2xl rounded-3xl border border-white/10 bg-slate-900/35 p-8 shadow-2xl backdrop-blur-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-200">Our mission</p>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
            Our Vision for Resilient Communities.
          </h2>
          <p className="mt-6 text-base leading-8 text-slate-200">
            We believe resilient communities are built before emergencies peak. By combining local knowledge,
            rapid assessment, and coordinated aid delivery, we help neighborhoods prepare, respond, and recover
            with greater confidence and less delay.
          </p>
          <p className="mt-4 text-base leading-8 text-slate-200">
            As climate pressures intensify, the need for timely resource visibility and equitable coordination grows.
            Our platform equips residents, volunteers, and organizers to act together with clarity, empathy, and speed.
          </p>
        </div>
      </div>
    </section>
  );
}
