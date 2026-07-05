import { AuthNav } from "@/components/auth-nav";

/** Shared dark header used across the app pages. */
export function SiteHeader({ active }: { active?: "characters" | "projects" }) {
  const link = (href: string, label: string, key: "characters" | "projects") => (
    <a
      href={href}
      className={
        "rounded-full px-3 py-1.5 text-sm transition " +
        (active === key
          ? "bg-white/10 font-medium text-white"
          : "text-neutral-400 hover:bg-white/5 hover:text-white")
      }
    >
      {label}
    </a>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <a href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold text-white shadow-lg shadow-violet-500/25">
            A
          </span>
          Ad Champ
        </a>
        <nav className="flex items-center gap-1.5 sm:gap-2">
          {link("/characters", "Characters", "characters")}
          {link("/projects", "Projects", "projects")}
          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
