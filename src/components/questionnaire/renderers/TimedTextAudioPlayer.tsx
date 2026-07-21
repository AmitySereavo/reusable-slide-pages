"use client";

import { useEffect, useRef } from "react";

export type TimedTextAudioRequest = {
  id: string;
  src: string;
  seconds: number;
  pauseAtSeconds?: number;
};

type TimedTextAudioPlayerProps = {
  request: TimedTextAudioRequest | null;
};

export default function TimedTextAudioPlayer({
  request,
}: TimedTextAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pauseAtSecondsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!request) {
      return;
    }

    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    pauseAtSecondsRef.current =
      typeof request.pauseAtSeconds === "number" &&
      Number.isFinite(request.pauseAtSeconds)
        ? Math.max(0, request.pauseAtSeconds)
        : null;

    audio.src = request.src;
    audio.currentTime = Math.max(0, request.seconds);
    void audio.play().catch(() => null);
  }, [request]);

  return (
    <audio
      ref={audioRef}
      preload="metadata"
      onTimeUpdate={(event) => {
        const audio = event.currentTarget;
        const pauseAtSeconds = pauseAtSecondsRef.current;

        if (
          typeof pauseAtSeconds === "number" &&
          audio.currentTime >= pauseAtSeconds
        ) {
          pauseAtSecondsRef.current = null;
          audio.pause();
        }
      }}
      style={{ display: "none" }}
    />
  );
}
