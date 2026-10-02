import { useEffect, useRef, useState } from "react";
import { Music2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasBackgroundSong, normalizeHttpUrl, treeSurfaceClasses } from "@/lib/linkTreeTheme";

const TARGET_VOLUME = 0.85;
const FADE_IN_SEC = 1.8;
const FADE_OUT_SEC = 2.4;
const LOOP_SILENCE_SEC = 0.08;

function smoothstep(value) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function fadeLengths(duration) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return { fadeIn: FADE_IN_SEC, fadeOut: FADE_OUT_SEC };
  }
  if (FADE_IN_SEC + FADE_OUT_SEC >= duration) {
    return { fadeIn: duration / 2, fadeOut: duration / 2 };
  }
  return { fadeIn: FADE_IN_SEC, fadeOut: FADE_OUT_SEC };
}

function envelopeLevel(audio, startedAt, now) {
  const { fadeIn, fadeOut } = fadeLengths(audio.duration);
  const elapsed = (now - startedAt) / 1000;
  let level = smoothstep(fadeIn > 0 ? elapsed / fadeIn : 1);

  if (Number.isFinite(audio.duration) && audio.duration > 0 && fadeOut > 0) {
    const remaining = audio.duration - audio.currentTime;
    if (remaining <= fadeOut + LOOP_SILENCE_SEC) {
      const out =
        remaining <= LOOP_SILENCE_SEC
          ? 0
          : smoothstep((remaining - LOOP_SILENCE_SEC) / fadeOut);
      level = Math.min(level, out);
    }
  }

  return TARGET_VOLUME * level;
}

export function BackgroundSongPlayer({ theme, compact = false }) {
  const src = normalizeHttpUrl(theme?.background_audio_url) || "";
  const title = String(theme?.background_audio_title || "").trim();
  const artist = String(theme?.background_audio_artist || "").trim();
  const cover = normalizeHttpUrl(theme?.background_audio_cover_url) || "";
  const audioRef = useRef(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [failed, setFailed] = useState(false);
  const surface = treeSurfaceClasses(theme);

  useEffect(() => {
    userPaused.current = false;
    setFailed(false);
    setNeedsTap(false);
    setPlaying(false);
    if (audioRef.current) audioRef.current.volume = 0;
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return undefined;

    let frame = 0;
    let startedAt = 0;
    let previousTime = 0;

    const step = (now) => {
      if (audio.paused) return;
      if (audio.currentTime + 0.35 < previousTime) {
        startedAt = now;
        audio.volume = 0;
      }
      previousTime = audio.currentTime;
      audio.volume = envelopeLevel(audio, startedAt, now);
      frame = requestAnimationFrame(step);
    };

    const onPlay = () => {
      startedAt = performance.now();
      previousTime = audio.currentTime;
      audio.volume = 0;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(step);
      setPlaying(true);
    };

    const onPause = () => {
      cancelAnimationFrame(frame);
      setPlaying(false);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || compact || !src) return undefined;

    let cancelled = false;

    const start = () => {
      if (cancelled || userPaused.current || !audio.paused) return;
      audio.volume = 0;
      audio
        .play()
        .then(() => {
          if (!cancelled) setNeedsTap(false);
        })
        .catch(() => {
          if (!cancelled) setNeedsTap(true);
        });
    };

    const onGesture = (event) => {
      if (userPaused.current) return;
      if (event.target instanceof Element && event.target.closest("[data-song-player]")) return;
      start();
    };

    start();
    window.addEventListener("pointerdown", onGesture);

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", onGesture);
      audio.pause();
    };
  }, [compact, src]);

  if (!hasBackgroundSong(theme)) return null;

  function toggle() {
    const audio = audioRef.current;
    if (!audio || failed) return;
    if (audio.paused) {
      userPaused.current = false;
      audio.volume = 0;
      audio.play().then(() => setNeedsTap(false)).catch(() => setNeedsTap(true));
    } else {
      userPaused.current = true;
      audio.pause();
    }
  }

  const status = failed
    ? "This file could not be played"
    : [artist, needsTap ? "Tap to play" : null].filter(Boolean).join(" · ") ||
      (needsTap ? "Tap anywhere to play" : "Now playing");

  const card = (
    <div data-song-player="" className="pointer-events-auto">
      <p
        className={cn(
          "mb-1.5 text-center font-semibold uppercase tracking-widest",
          compact ? "text-[9px]" : "text-[11px]",
          surface.subtle
        )}
      >
        Music
      </p>
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/92 p-2 pr-2.5 text-white shadow-xl shadow-black/30 backdrop-blur-md">
        <div className={cn("shrink-0 overflow-hidden rounded-lg bg-white/10", compact ? "h-11 w-11" : "h-12 w-12")}>
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music2 className={compact ? "h-4 w-4 text-white/70" : "h-5 w-5 text-white/70"} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate font-semibold leading-tight", compact ? "text-xs" : "text-sm")}>
            {title || "Background song"}
          </p>
          <p className={cn("truncate text-white/60", compact ? "text-[10px]" : "text-xs")}>{status}</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={failed}
          aria-label={playing ? "Pause background song" : "Play background song"}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full bg-white text-zinc-950 disabled:opacity-40",
            compact ? "h-9 w-9" : "h-10 w-10"
          )}
        >
          {playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 translate-x-px" />
          )}
        </button>
      </div>
      <audio
        ref={audioRef}
        src={src}
        loop
        preload={compact ? "none" : "auto"}
        onError={() => {
          setFailed(true);
          setPlaying(false);
        }}
      />
    </div>
  );

  if (compact) return card;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 px-4">
      <div className="mx-auto w-full max-w-md">{card}</div>
    </div>
  );
}
