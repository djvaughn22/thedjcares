import type { Metadata } from "next";
import DigitalDjClient from "./DigitalDjClient";

export const metadata: Metadata = {
  title: "Digital DJ",
  description:
    "Tell the DJ how much time you have and what you need. Get an approved song, sermon, podcast, video, or complete session from The DJ Cares.",
};

export default function DigitalDjPage() {
  return <DigitalDjClient />;
}
