"use client";

import { use, useCallback, useEffect, useState } from "react";

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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
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
      const res = await fetch(`/api/shots/${shotId}/generate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setGeneratingShotId(null);
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
      <div className="flex-1 bg-white p-12 text-neutral-500">Loading…</div>
    );
  }

  const allShotsDone =
    project.shots.length > 0 &&
    project.shots.every((s) => s.status === "COMPLETED");

  return (
    <div className="flex-1 bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="/" className="text-lg font-semibold tracking-tight">
            AdCharacter
          </a>
          <nav className="flex gap-6 text-sm text-neutral-600">
            <a href="/characters" className="hover:text-neutral-900">
              Characters
            </a>
            <a href="/projects" className="hover:text-neutral-900">
              Projects
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <a href="/projects" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← All projects
        </a>
        <div className="mt-3 flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">{project.title}</h1>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
            {project.status.replaceAll("_", " ")}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-neutral-600">{project.brief}</p>
        <p className="mt-1 text-sm text-neutral-500">
          Character: {project.character.name} · Format:{" "}
          {project.format.replaceAll("_", " ").toLowerCase()}
          {project.customFormat ? ` — ${project.customFormat}` : ""}
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Final video */}
        <div className="mt-8 rounded-xl border-2 border-neutral-900 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Final video</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Joins every shot (plus the voiceover, if you made one) into one
                video. This step is free.
              </p>
            </div>
            <button
              onClick={createFinalVideo}
              disabled={stitching || !allShotsDone}
              className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {stitching
                ? "Stitching…"
                : project.finalVideoUrl
                  ? "Rebuild final video"
                  : "Create final video"}
            </button>
          </div>
          {!allShotsDone && (
            <p className="mt-2 text-xs text-amber-600">
              Generate all shots first — the button unlocks when every shot is
              completed.
            </p>
          )}
          {project.finalVideoUrl && (
            <video
              src={project.finalVideoUrl}
              controls
              className="mt-4 w-full max-w-2xl rounded-lg border border-neutral-200"
            />
          )}
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Shots</h2>
            <button
              onClick={generateShotList}
              disabled={planning || project.shots.some((s) => s.status !== "PENDING")}
              className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {planning
                ? "Claude is planning the scenes…"
                : project.shots.length > 0
                  ? "Regenerate shot list"
                  : "Generate shot list with AI"}
            </button>
          </div>

          {project.shots.length === 0 && !planning && (
            <p className="mt-4 text-sm text-neutral-500">
              No shots yet. Click the button above and Claude will turn your
              brief into a scene-by-scene plan.
            </p>
          )}

          {/* Voiceover */}
          <div className="mt-8 rounded-xl border border-neutral-200 p-5">
            <h3 className="font-medium">Voiceover (ElevenLabs)</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Optional narration for the final video. Cost: roughly $0.10 per
              1000 characters — keep it short.
            </p>
            {project.shots.some((s) => s.dialogue) && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
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
              className="mt-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
            <div className="mt-3 flex items-center gap-4">
              <select
                value={voLanguage}
                onChange={(e) => setVoLanguage(e.target.value)}
                className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs outline-none focus:border-neutral-900"
              >
                <option value="hi">Hindi</option>
                <option value="en">English</option>
                <option value="">Auto</option>
              </select>
              <button
                onClick={generateVoiceover}
                disabled={voGenerating || voScript.trim().length === 0}
                className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
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
                className="rounded-xl border border-neutral-200 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-medium text-neutral-400">
                      SHOT {shot.orderIndex + 1} · {shot.durationSec ?? 8}s
                    </span>
                    <p className="mt-1 text-sm text-neutral-700">{shot.prompt}</p>
                    {shot.dialogue && (
                      <p className="mt-2 text-sm text-neutral-900">
                        🗣️ <span className="italic">&ldquo;{shot.dialogue}&rdquo;</span>
                      </p>
                    )}
                    {shot.lastError && (
                      <p className="mt-2 text-xs text-red-600">{shot.lastError}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={
                        "rounded-full px-3 py-1 text-xs font-medium " +
                        (shot.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : shot.status === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : shot.status === "GENERATING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-neutral-100 text-neutral-700")
                      }
                    >
                      {shot.status}
                    </span>
                    {shot.status !== "GENERATING" && (
                      <button
                        onClick={() => generateShot(shot.id)}
                        disabled={generatingShotId !== null}
                        className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
                      >
                        {generatingShotId === shot.id
                          ? "Generating (~1-2 min)…"
                          : shot.status === "COMPLETED"
                            ? "Regenerate (~$0.40)"
                            : "Generate video (~$0.40)"}
                      </button>
                    )}
                  </div>
                </div>
                {shot.videoUrl && (
                  <video
                    src={shot.videoUrl}
                    controls
                    className="mt-4 w-full max-w-xl rounded-lg border border-neutral-200"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
