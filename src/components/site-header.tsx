import { AuthNav } from "@/components/auth-nav";
import { Logo } from "@/components/logo";

/** Shared dark header used across the app pages. */
export function SiteHeader({ active }: { active?: "characters" | "projects" }) {
  const link = (
    href: string,
    label: string,
    key: "home" | "characters" | "projects",
  ) => (
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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="/" className="flex items-center" aria-label="Ad Champ home">
          <Logo />
        </a>
        <nav className="flex items-center gap-1 sm:gap-2">
          <span className="hidden sm:block">{link("/", "Home", "home")}</span>
          {link("/characters", "Characters", "characters")}
          {link("/projects", "Projects", "projects")}
          <span className="mx-0.5 hidden h-5 w-px bg-white/10 sm:block" />
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
