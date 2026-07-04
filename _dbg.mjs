import "dotenv/config";
import { fal } from "@fal-ai/client";
fal.config({ credentials: process.env.FAL_KEY });
const vo = await fal.subscribe("fal-ai/elevenlabs/tts/eleven-v3", {
  input: { text: "Ek do teen chaar paanch.", voice: "H6QPv2pQZDcGqLwDTIJQ", stability: 0.5, timestamps: true, language_code: "hi" },
});
console.log("TOP KEYS:", Object.keys(vo.data));
const s = JSON.stringify(vo.data);
console.log("LEN:", s.length);
console.log(s.slice(0, 1200));
