// Server gate for Digital DJ. The access mode is read here, on the server —
// client state is never treated as authorization. With
// DIGITAL_DJ_ACCESS_MODE=off this route 404s (env changes on Vercel take
// effect on the next deploy, which Vercel performs when the variable is
// saved and the project is redeployed).

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DigitalDjClient from "./DigitalDjClient";
import { getCurrentAccessMode, isAiEnabled } from "../lib/featureAccess";

export const metadata: Metadata = {
  title: "Digital DJ",
  description:
    "Tell the DJ how much time you have and what you need. Get an approved song, sermon, podcast, video, or complete session from The DJ Cares.",
};

export default function DigitalDjPage() {
  if (getCurrentAccessMode("digital_dj") === "off") notFound();
  const aiEnabled = isAiEnabled("digital_dj") && Boolean(process.env.OPENAI_API_KEY);
  return <DigitalDjClient aiEnabled={aiEnabled} />;
}
