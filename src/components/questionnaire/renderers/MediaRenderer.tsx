"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "../QuestionnaireShell.module.css";

export type VideoSeekRequest = {
  id: string;
  percent?: number;
  seconds?: number;
  play?: boolean;
  pauseAtSeconds?: number;
};

export type MediaControlRequest = {
  id: string;
  action: "toggle-mute" | "toggle-play";
};

export type MediaState = {
  isMuted: boolean;
  isPlaying: boolean;
  hasEnded: boolean;
  hasRecentlyStarted: boolean;
  shouldPulseFooterLabel: boolean;
};

type MediaRendererProps = {
  slide: {
    title: string;
    mediaUrl?: string;
    embedUrl?: string;
    mediaType?: "image" | "video";
    mediaAspect?: "horizontal" | "vertical" | "square";
    autoplay?: boolean;
    videoStartAtSeconds?: number;
    videoEndGoto?: string;
  };
  onVerticalVideoPlayingChange?: (isPlaying: boolean) => void;
  onVideoProgressChange?: (payload: {
    currentTime: number;
    duration: number;
  }) => void;
  onVideoEnded?: () => void;
  videoSeekRequest?: VideoSeekRequest | null;
  mediaControlRequest?: MediaControlRequest | null;
  onMediaStateChange?: (state: MediaState) => void;
  onRenderedMediaWidthChange?: (width: number) => void;
};

export default function MediaRenderer({
  slide,
  onVerticalVideoPlayingChange,
  onVideoProgressChange,
  onVideoEnded,
  videoSeekRequest,
  mediaControlRequest,
  onMediaStateChange,
  onRenderedMediaWidthChange,
}: MediaRendererProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasAppliedStartTimeRef = useRef(false);
  const pauseAtSecondsRef = useRef<number | null>(null);
  const [isMuted, setIsMuted] = useState(slide.autoplay === true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [hasRecentlyStarted, setHasRecentlyStarted] = useState(false);
  const [hasEverPlayed, setHasEverPlayed] = useState(false);
  const [mediaLoadIssue, setMediaLoadIssue] = useState<string | null>(null);
  const hasEverPlayedRef = useRef(false);

  const updateRenderedMediaWidth = useCallback(() => {
    const video = videoRef.current;
    const width = video?.getBoundingClientRect().width ?? 0;
    onRenderedMediaWidthChange?.(Number.isFinite(width) ? width : 0);
  }, [onRenderedMediaWidthChange]);

  useEffect(() => {
    setIsMuted(slide.autoplay === true);
    setIsPlaying(false);
    setHasEnded(false);
    setHasRecentlyStarted(false);
    setHasEverPlayed(false);
    hasEverPlayedRef.current = false;
    setMediaLoadIssue(null);
    hasAppliedStartTimeRef.current = false;
    onRenderedMediaWidthChange?.(0);
  }, [
    onRenderedMediaWidthChange,
    slide.mediaUrl,
    slide.embedUrl,
    slide.autoplay,
    slide.videoStartAtSeconds,
  ]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !onRenderedMediaWidthChange) {
      return;
    }

    updateRenderedMediaWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateRenderedMediaWidth();
    });

    resizeObserver.observe(video);
    window.addEventListener("resize", updateRenderedMediaWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateRenderedMediaWidth);
    };
  }, [onRenderedMediaWidthChange, updateRenderedMediaWidth, slide.mediaUrl]);

  useEffect(() => {
    if (!hasRecentlyStarted) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHasRecentlyStarted(false);
    }, 4200);

    return () => window.clearTimeout(timeoutId);
  }, [hasRecentlyStarted]);

  useEffect(() => {
    if (!videoSeekRequest) {
      return;
    }

    const video = videoRef.current;

    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }

    if (
      typeof videoSeekRequest.seconds === "number" &&
      Number.isFinite(videoSeekRequest.seconds)
    ) {
      video.currentTime = Math.min(
        Math.max(0, videoSeekRequest.seconds),
        video.duration
      );

      pauseAtSecondsRef.current =
        typeof videoSeekRequest.pauseAtSeconds === "number" &&
        Number.isFinite(videoSeekRequest.pauseAtSeconds)
          ? Math.min(Math.max(0, videoSeekRequest.pauseAtSeconds), video.duration)
          : null;

      if (slide.autoplay === true || videoSeekRequest.play === true) {
        void video.play().catch(() => null);
      }

      return;
    }

    if (
      typeof videoSeekRequest.percent === "number" &&
      Number.isFinite(videoSeekRequest.percent)
    ) {
      pauseAtSecondsRef.current = null;
      video.currentTime = (video.duration * videoSeekRequest.percent) / 100;
    }
  }, [videoSeekRequest, slide.autoplay]);

  useEffect(() => {
    if (!mediaControlRequest) {
      return;
    }

    if (mediaControlRequest.action === "toggle-mute") {
      toggleMute();
      return;
    }

    if (mediaControlRequest.action === "toggle-play") {
      togglePlayPause();
    }
  }, [mediaControlRequest]);

  useEffect(() => {
    onMediaStateChange?.({
      isMuted,
      isPlaying,
      hasEnded,
      hasRecentlyStarted,
      shouldPulseFooterLabel: !hasEverPlayed || hasRecentlyStarted,
    });
  }, [
    hasEnded,
    hasEverPlayed,
    hasRecentlyStarted,
    isMuted,
    isPlaying,
    onMediaStateChange,
  ]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }

    applyVideoStartTime(video);

    onVideoProgressChange?.({
      currentTime: video.currentTime,
      duration: video.duration,
    });

    if (slide.autoplay === true) {
      void video.play().catch(() => null);
    }
  }, [slide.videoStartAtSeconds, slide.autoplay]);

  const isVerticalVideo =
    slide.mediaAspect === "vertical" &&
    slide.mediaType === "video" &&
    !slide.embedUrl;

  function togglePlayPause() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      void video.play().catch(() => null);
    } else {
      video.pause();
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }

  function applyVideoStartTime(video: HTMLVideoElement) {
    if (hasAppliedStartTimeRef.current) {
      return;
    }

    const startAtSeconds = slide.videoStartAtSeconds;

    if (
      typeof startAtSeconds !== "number" ||
      !Number.isFinite(startAtSeconds) ||
      startAtSeconds <= 0
    ) {
      hasAppliedStartTimeRef.current = true;
      return;
    }

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }

    video.currentTime = Math.min(startAtSeconds, video.duration);
    hasAppliedStartTimeRef.current = true;
  }

  if (slide.embedUrl) {
    const embedSrc = appendYouTubeInlineParams(slide.embedUrl, {
      autoplay: slide.autoplay === true,
    });

    return (
      <div className={styles.mediaLayer}>
        <div
          className={`${styles.mediaWrap} ${
            slide.mediaAspect === "horizontal"
              ? styles.mediaWrapHorizontal
              : slide.mediaAspect === "vertical"
                ? styles.mediaWrapVertical
                : ""
          }`}
        >
          <iframe
            className={styles.mediaFrame}
            src={embedSrc}
            title={slide.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (slide.mediaType === "image" && slide.mediaUrl) {
    return (
      <div className={styles.mediaLayer}>
        <div
          className={`${styles.mediaWrap} ${
            slide.mediaAspect === "horizontal"
              ? styles.mediaWrapHorizontal
              : slide.mediaAspect === "vertical"
                ? styles.mediaWrapVertical
                : ""
          }`}
        >
          <img
            className={styles.mediaImage}
            src={slide.mediaUrl}
            alt={slide.title}
          />
        </div>
      </div>
    );
  }

  if (slide.mediaUrl) {
    return (
      <div className={styles.mediaLayer}>
        <div
          className={`${styles.mediaWrap} ${
            slide.mediaAspect === "horizontal"
              ? styles.mediaWrapHorizontal
              : slide.mediaAspect === "vertical"
                ? styles.mediaWrapVertical
                : ""
          }`}
        >
          <video
            ref={videoRef}
            className={styles.mediaVideo}
            src={slide.mediaUrl}
            controls={false}
            playsInline
            preload="metadata"
            autoPlay={slide.autoplay === true}
            muted={slide.autoplay === true}
            onClick={togglePlayPause}
            onPlay={() => {
              setIsPlaying(true);
              setHasEnded(false);
              setHasRecentlyStarted(true);
              setHasEverPlayed(true);
              hasEverPlayedRef.current = true;
              setMediaLoadIssue(null);
              if (isVerticalVideo) {
                onVerticalVideoPlayingChange?.(true);
              }
            }}
            onPause={() => {
              setIsPlaying(false);
              if (isVerticalVideo) {
                onVerticalVideoPlayingChange?.(false);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setHasEnded(true);
              if (isVerticalVideo) {
                onVerticalVideoPlayingChange?.(false);
              }
              onVideoEnded?.();
            }}
            onVolumeChange={(e) => {
              const video = e.currentTarget;
              setIsMuted(video.muted || video.volume === 0);
            }}
            onSeeking={() => {
              setHasEnded(false);
            }}
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              setMediaLoadIssue(null);
              applyVideoStartTime(video);
              updateRenderedMediaWidth();

              onVideoProgressChange?.({
                currentTime: video.currentTime,
                duration: video.duration,
              });
            }}
            onError={(event) => {
              const video = event.currentTarget;
              if (hasEverPlayedRef.current || video.currentTime > 0) {
                setMediaLoadIssue(null);
                return;
              }

              setMediaLoadIssue(
                "The video is not available yet. This chapter is still open, and you can read the article or use the chapter actions."
              );
            }}
            onTimeUpdate={(e) => {
              const video = e.currentTarget;
              const pauseAtSeconds = pauseAtSecondsRef.current;

              if (
                typeof pauseAtSeconds === "number" &&
                video.currentTime >= pauseAtSeconds
              ) {
                pauseAtSecondsRef.current = null;
                video.pause();
              }

              onVideoProgressChange?.({
                currentTime: video.currentTime,
                duration: video.duration,
              });
            }}
          />

          {mediaLoadIssue ? (
            <div className={styles.mediaLoadNotice}>
              <strong>{slide.title}</strong>
              <span>{mediaLoadIssue}</span>
            </div>
          ) : null}

          {!isPlaying && !mediaLoadIssue ? (
            <button
              type="button"
              className={styles.mediaPlayOverlay}
              onClick={togglePlayPause}
              aria-label="Play video"
            >
              <span className={styles.mediaPlayTriangle} />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}

function appendYouTubeInlineParams(
  url: string,
  options?: { autoplay?: boolean }
) {
  if (!/youtube\.com|youtu\.be/i.test(url)) {
    return url;
  }

  try {
    const parsed = new URL(url);

    parsed.searchParams.set("playsinline", "1");
    parsed.searchParams.set("rel", "0");

    if (options?.autoplay) {
      parsed.searchParams.set("autoplay", "1");
      parsed.searchParams.set("mute", "1");
    }

    return parsed.toString();
  } catch {
    return url;
  }
}
