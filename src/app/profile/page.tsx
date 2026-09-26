"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase";
import ResourceForm from "@/components/ResourceForm";

function ProfileLoading() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-bold text-slate-500">Loading your profile...</main>;
}

const portalTabs = [
  { id: "overview", label: "Overview" },
  { id: "report", label: "Report" },
  { id: "tracking", label: "Tracking" },
] as const;

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [activeTab, setActiveTab] = useState<(typeof portalTabs)[number]["id"]>("overview");
  const router = useRouter();

  useEffect(
    () =>
      onAuthStateChanged(auth, (currentUser) => {
        if (!currentUser) {
          router.replace("/");
          return;
        }

        setUser(currentUser);
        setIsCheckingSession(false);
      }),
    [router],
  );

  if (isCheckingSession || !user) return <ProfileLoading />;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600">Citizen & volunteer portal</p>
              <h1 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">Welcome back, {user.displayName ?? "Community responder"}</h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                Verified
              </span>
              <button
                type="button"
                onClick={() => auth.signOut()}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { title: "Report a need", value: "Live", description: "Submit urgent help requests", accent: "bg-sky-600" },
            { title: "Offer support", value: "Open", description: "Share food, transport, or supplies", accent: "bg-emerald-600" },
            { title: "Member status", value: user.email ?? "Active", description: "Account ready for response", accent: "bg-violet-600" },
          ].map((stat) => (
            <div key={stat.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`mb-4 h-2.5 w-14 rounded-full ${stat.accent}`} />
              <p className="text-sm font-semibold text-slate-500">{stat.title}</p>
              <p className="mt-3 text-2xl font-black text-slate-900">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-500">{stat.description}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap gap-2">
              {portalTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    activeTab === tab.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl bg-sky-50 p-5">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">Your response queue</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">Ready to support your community</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Use the report tool to share urgent needs or volunteer support. Your input is connected to the platform’s live map and tracking flow so local teams can respond quickly.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Contact</p>
                    <p className="mt-3 text-lg font-bold text-slate-900">{user.email}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Account ID</p>
                    <p className="mt-3 truncate text-lg font-bold text-slate-900">{user.uid}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "report" && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <ResourceForm />
              </div>
            )}

            {activeTab === "tracking" && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-700">Tracking</p>
                <h3 className="mt-3 text-2xl font-black text-slate-900">Monitor your active report</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Track the status of your latest submission, update a location, and keep your community response visible to the relevant responders.
                </p>
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                  Open the Report tab to create or update a current case. The tracking state is connected to the live response workspace.
                </div>
              </div>
            )}
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-300">Quick actions</p>
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setActiveTab("report")}
                className="flex w-full items-center justify-between rounded-2xl bg-white/5 p-4 text-left transition hover:bg-white/10"
              >
                <span>
                  <span className="block text-sm font-bold">Submit a request</span>
                  <span className="block text-xs text-slate-300">Need food, shelter, or rescue</span>
                </span>
                <span className="text-xl">→</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tracking")}
                className="flex w-full items-center justify-between rounded-2xl bg-white/5 p-4 text-left transition hover:bg-white/10"
              >
                <span>
                  <span className="block text-sm font-bold">Track my status</span>
                  <span className="block text-xs text-slate-300">Review the latest response progress</span>
                </span>
                <span className="text-xl">→</span>
              </button>
            </div>

            <div className="mt-8 rounded-2xl bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Safety reminder</p>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                For immediate emergencies, contact emergency services first and then share the information here for community coordination.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}