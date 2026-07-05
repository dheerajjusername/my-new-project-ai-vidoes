"use client";

import { useState } from "react";

/**
 * Shows the founder's photo from /founder.jpg. Until that file is added to the
 * repo's public/ folder it gracefully falls back to the initials "DY".
 */
export function FounderAvatar({ size = 72 }: { size?: number }) {
  const [ok, setOk] = useState(true);
  return (
    <div
      className="relative shrink-0 rounded-2xl p-[2px]"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #7c3aed, #ec4899 55%, #f59e0b)",
      }}
    >
      <div className="grid h-full w-full place-items-center overflow-hidden rounded-[14px] bg-neutral-900">
        {ok ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/founder.jpg"
            alt="Dheeraj Yadav"
            className="h-full w-full object-cover"
            onError={() => setOk(false)}
          />
        ) : (
          <span className="font-display text-xl font-bold text-white">DY</span>
        )}
      </div>
    </div>
  );
}
