// Ad Champ logo — the user's actual wordmark (public/logo-wordmark.png). It's
// dark-on-white, so on the dark UI it sits inside a white rounded pill.
export function Logo({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const h = size === "lg" ? "h-7" : size === "sm" ? "h-4" : "h-5";
  const pad = size === "lg" ? "px-2.5 py-1.5" : "px-2 py-1";
  return (
    <span
      className={`inline-flex items-center rounded-xl bg-white shadow-sm ${pad} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-wordmark.png" alt="Ad Champ" className={`${h} w-auto`} />
    </span>
  );
}
