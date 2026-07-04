"use client";

import { useEffect, useState } from "react";

/** Shows the logged-in user's email and a logout button in page headers. */
export function AuthNav() {
  const [email, setEmail] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setEmail(d.user?.email ?? null);
        setCredits(d.user?.credits ?? null);
      })
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (!email) {
    return (
      <a
        href="/login"
        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200"
      >
        Log in
      </a>
    );
  }
  return (
    <div className="flex items-center gap-3 text-sm">
      <a
        href="/credits"
        title="Your credits"
        className="rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-500/20"
      >
        {credits ?? "…"} credits
      </a>
      <button
        onClick={logout}
        className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-white/10"
      >
        Log out
      </button>
    </div>
  );
}

/** Redirect helper: call with a fetch Response — sends the user to /login on 401. */
export function redirectIfLoggedOut(res: Response) {
  if (res.status === 401) {
    window.location.href = "/login";
    return true;
  }
  return false;
}
