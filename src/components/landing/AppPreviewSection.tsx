import Link from "next/link";

export default function AppPreviewSection() {
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-700">Dashboard preview</p>
          <h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">A clearer view for every response team.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
            See the live incident map, priority updates, and emergency signals in one place designed for fast local coordination.
          </p>
        </div>

        <div className="mx-auto max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
          <Link href="/login" className="group block transition duration-200 hover:scale-[1.01]">
            <div className="relative overflow-hidden rounded-[22px] bg-slate-900">
              {/* UPDATED: Using your specific screenshot file */}
              <div
                className="h-[420px] w-full bg-cover bg-top sm:h-[540px]"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, rgba(15, 23, 42, 0.12), rgba(15, 23, 42, 0.04)), url('/map-preview.png')",
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent" />

              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl border border-white/15 bg-slate-900/65 px-4 py-3 text-white backdrop-blur-sm sm:bottom-8 sm:left-8 sm:right-8 sm:px-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-200">Relief network</p>
                  <p className="mt-1 text-lg font-black">Operations dashboard</p>
                </div>
                <span className="rounded-full bg-emerald-400/90 px-3 py-1 text-xs font-bold text-slate-900">Live</span>
              </div>

              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-slate-900/55 via-transparent to-transparent p-6 opacity-0 transition duration-300 group-hover:opacity-100">
                <span className="rounded-full border-2 border-[#102a43] bg-[#f4b942] px-5 py-2.5 text-sm font-black text-[#102a43] shadow-[0_8px_24px_rgba(15,23,42,0.35)]">
                  Open login portal
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}