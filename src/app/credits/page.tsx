"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { redirectIfLoggedOut } from "@/components/auth-nav";

const COSTS = [
  { action: "Create a character (5 reference images)", credits: 25 },
  { action: "Generate a shot list with AI", credits: 3 },
  { action: "Generate one video shot (with voice + lip-sync)", credits: 25 },
  { action: "Generate a voiceover", credits: 3 },
  { action: "Stitch the final video", credits: 0 },
];

export default function CreditsPage() {
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (redirectIfLoggedOut(r)) return null;
        return r.json();
      })
      .then((d) => d && setCredits(d.user?.credits ?? 0))
      .catch(() => {});
  }, []);

  return (
    <div className="flex-1 text-neutral-100">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Credits</h1>
        <p className="mt-2 text-neutral-400">
          Credits are spent whenever you generate images, video or voice.
        </p>

        {/* Balance */}
        <div className="glass mt-8 rounded-2xl p-8 text-center">
          <p className="text-sm text-neutral-400">Your balance</p>
          <p className="mt-2 text-5xl font-semibold">
            {credits ?? "…"}
            <span className="ml-2 text-lg font-normal text-neutral-400">credits</span>
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm text-neutral-500">
            Buying more credits with UPI / card is coming soon. For now, ask the
            Ad Champ team to top up your balance.
          </p>
        </div>

        {/* Cost table */}
        <div className="glass mt-8 overflow-hidden rounded-2xl">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="font-medium text-white">What things cost</h2>
          </div>
          <div className="divide-y divide-white/5">
            {COSTS.map((c) => (
              <div
                key={c.action}
                className="flex items-center justify-between px-6 py-4 text-sm"
              >
                <span className="text-neutral-300">{c.action}</span>
                <span className="font-medium text-white">
                  {c.credits === 0 ? "Free" : `${c.credits} credits`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
