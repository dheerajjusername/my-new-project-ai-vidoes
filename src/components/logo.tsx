// Ad Champ wordmark, recreated in code: "Ad" in the brand gradient
// (violet → magenta → orange) and "Champ" in white for the dark UI.
export function Logo({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  return (
    <span
      className={`font-display font-bold leading-none tracking-tight ${text} ${className}`}
    >
      <span className="brand-text">Ad</span>
      <span className="text-white">Champ</span>
    </span>
  );
}
