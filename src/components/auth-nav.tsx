"use client";

import { useEffect, useState } from "react";

/** Shows the logged-in user's email and a logout button in page headers. */
export function AuthNav() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setEmail(d.user?.email ?? null))
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
        className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Log in
      </a>
    );
  }
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-neutral-500 sm:inline">{email}</span>
      <button
        onClick={logout}
        className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
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
