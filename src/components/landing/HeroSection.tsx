import React from "react";

// HeroSection is the first landing-page block and introduces the product in a clear, visual way.
export default function HeroSection() {
  const features = [
    {
      icon: "🔐",
      title: "Secure login & access",
      description:
        "Verified sign-in and role-based access keep sensitive relief data protected behind trusted workflows.",
    },
    {
      icon: "🧭",
      title: "Sidebar dashboard navigation",
      description:
        "A streamlined workspace lets responders move quickly between live maps, data, tracking, and settings.",
    },
    {
      icon: "🤝",
      title: "Citizen & volunteer portal",
      description:
        "Residents and volunteers can report urgency, share needs, and coordinate support without friction.",
    },
    {
      icon: "🧠",
      title: "AI threat intelligence",
      description:
        "Priority scoring and decision support help teams assess urgency and allocate help where it matters most.",
    },
    {
      icon: "📍",
      title: "Geospatial logistics",
      description:
        "Heatmaps and smart matching connect resources to affected areas with location-aware planning.",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.25),transparent_25%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.25),transparent_35%)]" />

      <div className="relative mx-auto max-w-7xl px-6 py-20 sm:px-8 lg:px-12">
        <div className="mb-14 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200">
              Community Relief Triage
            </span>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Coordinating aid with clarity, speed, and community trust.
            </h1>
          </div>

          <p className="max-w-md text-base leading-7 text-slate-300 sm:text-lg">
            Our platform helps communities identify urgent needs, match resources, and deliver coordinated support where it is needed fastest.
          </p>
        </div>

        {/* Feature cards are arranged in a clean responsive grid to match the first-scroll layout brief. */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.35)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-sky-400/60 hover:bg-sky-500/5"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15 text-2xl shadow-inner shadow-sky-400/20">
                <span aria-hidden="true">{feature.icon}</span>
              </div>
              <h2 className="mb-3 text-lg font-bold text-white">{feature.title}</h2>
              <p className="text-sm leading-6 text-slate-300">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
