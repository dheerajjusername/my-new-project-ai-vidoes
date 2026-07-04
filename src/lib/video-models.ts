// Registry of the video models a user can pick for a shot. All of them are
// image-to-video, so they slot into the same pipeline: Nano Banana makes the
// first frame, the chosen model animates it, then (for dialogue) ElevenLabs +
// VEED add voice and lip-sync.

export type VideoModelKey = "veo-3.1-lite" | "kling-2.5-turbo";

type FalInput = Record<string, string | number | boolean>;

export type VideoModel = {
  key: VideoModelKey;
  label: string;
  description: string;
  credits: number; // credit cost per shot
  endpoint: string;
  // Builds the fal input for a given first-frame URL. `withAudio` is false
  // when we'll add our own dialogue audio + lip-sync afterwards.
  buildInput: (frameUrl: string, prompt: string, withAudio: boolean) => FalInput;
};

export const VIDEO_MODELS: Record<VideoModelKey, VideoModel> = {
  "veo-3.1-lite": {
    key: "veo-3.1-lite",
    label: "Veo 3.1 Lite",
    description: "Google Veo — reliable, 8s, natural motion. Good default.",
    credits: 25,
    endpoint: "fal-ai/veo3.1/lite/image-to-video",
    buildInput: (frameUrl, prompt, withAudio) => ({
      prompt,
      image_url: frameUrl,
      duration: "8s",
      resolution: "720p",
      generate_audio: withAudio,
    }),
  },
  "kling-2.5-turbo": {
    key: "kling-2.5-turbo",
    label: "Kling 2.5 Turbo Pro",
    description: "Premium cinematic motion, 5s. Higher quality, costs more.",
    credits: 35,
    endpoint: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    buildInput: (frameUrl, prompt) => ({
      prompt,
      image_url: frameUrl,
      duration: "5",
    }),
  },
};

export const DEFAULT_VIDEO_MODEL: VideoModelKey = "veo-3.1-lite";

export function resolveVideoModel(key: string | null | undefined): VideoModel {
  if (key && key in VIDEO_MODELS) return VIDEO_MODELS[key as VideoModelKey];
  return VIDEO_MODELS[DEFAULT_VIDEO_MODEL];
}
