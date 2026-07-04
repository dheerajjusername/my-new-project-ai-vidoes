import { AuthNav } from "@/components/auth-nav";

/** Shared dark header used across the app pages. */
export function SiteHeader({ active }: { active?: "characters" | "projects" }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold text-white">
            A
          </span>
          Ad Champ
        </a>
        <nav className="flex items-center gap-6 text-sm">
          <a
            href="/characters"
            className={
              active === "characters"
                ? "font-medium text-white"
                : "text-neutral-400 hover:text-white"
            }
          >
            Characters
          </a>
          <a
            href="/projects"
            className={
              active === "projects"
                ? "font-medium text-white"
                : "text-neutral-400 hover:text-white"
            }
          >
            Projects
          </a>
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
