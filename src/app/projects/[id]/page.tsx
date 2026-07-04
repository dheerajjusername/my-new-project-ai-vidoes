"use client";

import { use, useCallback, useEffect, useState } from "react";
import { redirectIfLoggedOut } from "@/components/auth-nav";
import { SiteHeader } from "@/components/site-header";
import { VIDEO_MODELS, DEFAULT_VIDEO_MODEL } from "@/lib/video-models";

type Shot = {
  id: string;
  orderIndex: number;
  prompt: string;
  dialogue: string | null;
  status: "PENDING" | "GENERATING" | "COMPLETED" | "FAILED";
  videoUrl: string | null;
  durationSec: number | null;
  lastError: string | null;
};

type Project = {
  id: string;
  title: string;
  brief: string;
  format: string;
  customFormat: string | null;
  status: string;
  voiceoverUrl: string | null;
  finalVideoUrl: string | null;
  character: { id: string; name: string; referenceImages: string[] };
  shots: Shot[];
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [planning, setPlanning] = useState(false);
  const [generatingShotId, setGeneratingShotId] = useState<string | null>(null);
  const [voScript, setVoScript] = useState("");
  const [voLanguage, setVoLanguage] = useState("hi");
  const [voGenerating, setVoGenerating] = useState(false);
  const [stitching, setStitching] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [videoModel, setVideoModel] = useState<string>(DEFAULT_VIDEO_MODEL);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (redirectIfLoggedOut(res)) return;
      if (res.ok) setProject((await res.json()).project);
    } catch {
      // keep current state
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function generateShotList() {
    setPlanning(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}/generate-shots`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setPlanning(false);
    }
  }

  async function generateShot(shotId: string) {
    setGeneratingShotId(shotId);
    setError(null);
    try {
      const res = await fetch(`/api/shots/${shotId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: videoModel }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setGeneratingShotId(null);
    }
  }

  // Generate every shot that isn't done yet, one after another.
  async function generateAllShots() {
    if (!project) return;
    setGeneratingAll(true);
    setError(null);
    const pending = project.shots.filter((s) => s.status !== "COMPLETED");
    for (const shot of pending) {
      setGeneratingShotId(shot.id);
      try {
        const res = await fetch(`/api/shots/${shot.id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: videoModel }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "A shot failed — stopped here.");
          await load();
          break;
        }
      } catch {
        setError("Could not reach the server.");
        break;
      }
      await load();
    }
    setGeneratingShotId(null);
    setGeneratingAll(false);
  }

  // Force-download a remote file (fal.media is cross-origin, so a plain
  // <a download> wouldn't work — fetch the blob and save it).
  async function downloadFile(url: string, filename: string) {
    setDownloading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError("Download failed — try right-clicking the video and 'Save as'.");
    } finally {
      setDownloading(false);
    }
  }

  async function generateVoiceover() {
    setVoGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}/voiceover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: voScript, languageCode: voLanguage || null }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setVoGenerating(false);
    }
  }

  async function createFinalVideo() {
    setStitching(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}/stitch`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setStitching(false);
    }
  }

  if (!project) {
    return (
      <div className="flex-1 p-12 text-neutral-500">Loading…</div>
    );
  }

  const completedCount = project.shots.filter((s) => s.status === "COMPLETED").length;
  const allShotsDone =
    project.shots.length > 0 && completedCount === project.shots.length;
  const anyPending = project.shots.some((s) => s.status !== "COMPLETED");
  const busy = generatingAll || generatingShotId !== null || planning;
  const modelCredits = VIDEO_MODELS[videoModel as keyof typeof VIDEO_MODELS]?.credits ?? 25;
  const pendingCount = project.shots.filter((s) => s.status !== "COMPLETED").length;

  return (
    <div className="flex-1 text-neutral-100">
      <SiteHeader active="projects" />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <a href="/projects" className="text-sm text-neutral-400 hover:text-white">
          ← All projects
        </a>
        <div className="mt-3 flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">{project.title}</h1>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-neutral-300">
            {project.status.replaceAll("_", " ")}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-neutral-400">{project.brief}</p>
        <p className="mt-1 text-sm text-neutral-500">
          Character: {project.character.name} · Format:{" "}
          {project.format.replaceAll("_", " ").toLowerCase()}
          {project.customFormat ? ` — ${project.customFormat}` : ""}
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {/* Final video */}
        <div className="mt-8 glass rounded-2xl border border-violet-400/30 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Final video</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Joins every shot (plus the voiceover, if you made one) into one
                video. This step is free.
              </p>
            </div>
            <button
              onClick={createFinalVideo}
              disabled={stitching || !allShotsDone}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
            >
              {stitching
                ? "Stitching…"
                : project.finalVideoUrl
                  ? "Rebuild final video"
                  : "Create final video"}
            </button>
          </div>
          {!allShotsDone && (
            <p className="mt-2 text-xs text-amber-400">
              Generate all shots first — the button unlocks when every shot is
              completed.
            </p>
          )}
          {project.finalVideoUrl && (
            <div className="mt-4">
              <video
                src={project.finalVideoUrl}
                controls
                className="w-full max-w-2xl rounded-lg border border-white/10"
              />
              <button
                onClick={() =>
                  downloadFile(project.finalVideoUrl!, `${project.title || "ad-champ"}.mp4`)
                }
                disabled={downloading}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
              >
                {downloading ? "Downloading…" : "⬇ Download final video"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">
              Shots
              {project.shots.length > 0 && (
                <span className="ml-2 text-sm font-normal text-neutral-500">
                  {completedCount}/{project.shots.length} done
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              {project.shots.length > 0 && anyPending && (
                <button
                  onClick={generateAllShots}
                  disabled={busy}
                  className="rounded-full bg-gradient-to-r from-violet-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {generatingAll
                    ? "Generating all shots…"
                    : `Generate all shots (${modelCredits * pendingCount} credits)`}
                </button>
              )}
              <button
                onClick={generateShotList}
                disabled={busy || project.shots.some((s) => s.status !== "PENDING")}
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-neutral-200 hover:bg-white/10 disabled:opacity-50"
              >
                {planning
                  ? "Planning scenes…"
                  : project.shots.length > 0
                    ? "Regenerate shot list"
                    : "Generate shot list with AI"}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {project.shots.length > 0 && (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
                style={{ width: `${(completedCount / project.shots.length) * 100}%` }}
              />
            </div>
          )}

          {/* Video model picker */}
          {project.shots.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="text-sm text-neutral-400" htmlFor="videoModel">
                Video model
              </label>
              <select
                id="videoModel"
                value={videoModel}
                onChange={(e) => setVideoModel(e.target.value)}
                disabled={busy}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-violet-400 disabled:opacity-50"
              >
                {Object.values(VIDEO_MODELS).map((m) => (
                  <option key={m.key} value={m.key} className="bg-neutral-900">
                    {m.label} — {m.credits} credits/shot
                  </option>
                ))}
              </select>
              <span className="text-xs text-neutral-500">
                {VIDEO_MODELS[videoModel as keyof typeof VIDEO_MODELS]?.description}
              </span>
            </div>
          )}

          {project.shots.length === 0 && !planning && (
            <p className="mt-4 text-sm text-neutral-500">
              No shots yet. Click the button above and AI will turn your
              brief into a scene-by-scene plan.
            </p>
          )}

          {/* Voiceover */}
          <div className="mt-8 glass rounded-2xl p-5">
            <h3 className="font-medium text-white">Voiceover (ElevenLabs)</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Optional narration for the final video (3 credits). Keep it short.
            </p>
            {project.shots.some((s) => s.dialogue) && (
              <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                ⚠️ Is project ke shots mein character khud bolta hai, isliye
                narration final video mein mix <b>nahi</b> hogi (do awaazein
                takrati hain). Narration sirf bina-dialogue formats ke liye hai
                (jaise Static Storytelling).
              </p>
            )}
            <textarea
              value={voScript}
              onChange={(e) => setVoScript(e.target.value)}
              rows={3}
              maxLength={2500}
              placeholder="e.g. Garam Adrak — ghar wali chai, sirf do minute mein."
              className="mt-3 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-violet-400"
            />
            <div className="mt-3 flex items-center gap-4">
              <select
                value={voLanguage}
                onChange={(e) => setVoLanguage(e.target.value)}
                className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-violet-400"
              >
                <option value="hi">Hindi</option>
                <option value="en">English</option>
                <option value="">Auto</option>
              </select>
              <button
                onClick={generateVoiceover}
                disabled={voGenerating || voScript.trim().length === 0}
                className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-neutral-200 hover:bg-white/10 disabled:opacity-50"
              >
                {voGenerating
                  ? "Generating voice…"
                  : project.voiceoverUrl
                    ? "Regenerate voiceover"
                    : "Generate voiceover"}
              </button>
              <span className="text-xs text-neutral-400">
                {voScript.length}/2500
              </span>
            </div>
            {project.voiceoverUrl && (
              <audio
                src={project.voiceoverUrl}
                controls
                className="mt-4 w-full max-w-xl"
              />
            )}
          </div>

          <div className="mt-6 space-y-4">
            {project.shots.map((shot) => (
              <div
                key={shot.id}
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-medium text-neutral-500">
                      SHOT {shot.orderIndex + 1} · {shot.durationSec ?? 8}s
                    </span>
                    <p className="mt-1 text-sm text-neutral-300">{shot.prompt}</p>
                    {shot.dialogue && (
                      <p className="mt-2 text-sm text-neutral-100">
                        🗣️ <span className="italic">&ldquo;{shot.dialogue}&rdquo;</span>
                      </p>
                    )}
                    {shot.lastError && (
                      <p className="mt-2 text-xs text-red-400">{shot.lastError}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={
                        "rounded-full px-3 py-1 text-xs font-medium " +
                        (shot.status === "COMPLETED"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : shot.status === "FAILED"
                            ? "bg-red-500/15 text-red-300"
                            : shot.status === "GENERATING"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-white/10 text-neutral-300")
                      }
                    >
                      {shot.status}
                    </span>
                    {shot.status !== "GENERATING" && (
                      <button
                        onClick={() => generateShot(shot.id)}
                        disabled={busy}
                        className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium text-neutral-200 hover:bg-white/10 disabled:opacity-50"
                      >
                        {generatingShotId === shot.id
                          ? "Generating (~1-2 min)…"
                          : shot.status === "COMPLETED"
                            ? `Regenerate (${modelCredits} credits)`
                            : `Generate video (${modelCredits} credits)`}
                      </button>
                    )}
                  </div>
                </div>
                {shot.videoUrl && (
                  <div className="mt-4">
                    <video
                      src={shot.videoUrl}
                      controls
                      className="w-full max-w-xl rounded-lg border border-white/10"
                    />
                    <button
                      onClick={() =>
                        downloadFile(shot.videoUrl!, `shot-${shot.orderIndex + 1}.mp4`)
                      }
                      disabled={downloading}
                      className="mt-2 text-xs font-medium text-neutral-400 hover:text-white disabled:opacity-50"
                    >
                      ⬇ Download this clip
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
