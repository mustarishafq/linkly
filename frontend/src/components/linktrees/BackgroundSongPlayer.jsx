import { useEffect, useId, useRef, useState } from "react";
import { Music2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeHttpUrl, parseBackgroundSong, treeSurfaceClasses } from "@/lib/linkTreeTheme";

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

function loadScript(src, ready) {
  if (ready()) return Promise.resolve();
  const existing = loadScript.cache.get(src);
  if (existing) return existing;

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load player"));
    document.head.appendChild(script);
  });
  loadScript.cache.set(src, promise);
  return promise;
}
loadScript.cache = new Map();

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  const previous = loadYouTubeApi.promise;
  if (previous) return previous;

  loadYouTubeApi.promise = new Promise((resolve) => {
    const prior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prior?.();
      resolve(window.YT);
    };
    loadScript("https://www.youtube.com/iframe_api", () => false).catch(() => {});
  });
  return loadYouTubeApi.promise;
}

function loadSoundCloudApi() {
  if (window.SC?.Widget) return Promise.resolve(window.SC);
  return loadScript("https://w.soundcloud.com/player/api.js", () => window.SC?.Widget).then(() => window.SC);
}

function isVideoFile(src) {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(src);
}

function SongFrame({ compact, children }) {
  if (compact) return children;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 px-4">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}

function songStatus({ artist, needsTap, failed, fallback }) {
  if (failed) return "This file could not be played";
  return [artist, needsTap ? "Tap to play" : null].filter(Boolean).join(" · ") || fallback;
}

function SongCard({
  theme,
  compact,
  title,
  status,
  cover,
  playing,
  failed,
  onToggle,
  children,
}) {
  const surface = treeSurfaceClasses(theme);
  return (
    <div data-song-player="" className="pointer-events-auto relative">
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
            {title || "\u00a0"}
          </p>
          <p className={cn("truncate text-white/60", compact ? "text-[10px]" : "text-xs")}>{status || "\u00a0"}</p>
        </div>
        {onToggle ? <PlayButton compact={compact} playing={playing} failed={failed} onClick={onToggle} /> : null}
      </div>
      {children}
    </div>
  );
}

/** Keep stream players mounted but invisible — audio only. */
function HiddenStreamHost({ children }) {
  return (
    <div
      className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
      aria-hidden
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

export function BackgroundSongPlayer({ theme, compact = false }) {
  const song = parseBackgroundSong(theme?.background_audio_url);
  if (!song || song.error) return null;
  if (song.kind === "youtube") {
    return <YouTubeSongPlayer theme={theme} compact={compact} videoId={song.videoId} />;
  }
  if (song.kind === "soundcloud") {
    return <SoundCloudSongPlayer theme={theme} compact={compact} src={song.src} />;
  }
  return <FileSongPlayer theme={theme} compact={compact} src={song.src} />;
}

function FileSongPlayer({ theme, compact = false, src }) {
  const title = String(theme?.background_audio_title || "").trim();
  const artist = String(theme?.background_audio_artist || "").trim();
  const cover = normalizeHttpUrl(theme?.background_audio_cover_url) || "";
  const audioRef = useRef(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [failed, setFailed] = useState(false);

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
    <SongCard
      theme={theme}
      compact={compact}
      title={title}
      status={status}
      cover={cover}
      playing={playing}
      failed={failed}
      onToggle={toggle}
    >
      {isVideoFile(src) ? (
        <video
          ref={audioRef}
          src={src}
          loop
          playsInline
          preload={compact ? "none" : "auto"}
          className="pointer-events-none absolute h-px w-px opacity-0"
          onError={() => {
            setFailed(true);
            setPlaying(false);
          }}
        />
      ) : (
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
      )}
    </SongCard>
  );

  return <SongFrame compact={compact}>{card}</SongFrame>;
}

function PlayButton({ compact, playing, failed, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={failed}
      aria-label={playing ? "Pause background song" : "Play background song"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-white text-zinc-950 disabled:opacity-40",
        compact ? "h-9 w-9" : "h-10 w-10"
      )}
    >
      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-px" />}
    </button>
  );
}

function streamVolume(level) {
  return Math.max(0, Math.min(100, Math.round((level / TARGET_VOLUME) * 100)));
}

function YouTubeSongPlayer({ theme, compact, videoId }) {
  const customTitle = String(theme?.background_audio_title || "").trim();
  const artist = String(theme?.background_audio_artist || "").trim();
  const elementId = `bg-yt-${useId().replace(/:/g, "")}`;
  const playerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [needsTap, setNeedsTap] = useState(!compact);
  const [failed, setFailed] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");

  useEffect(() => {
    setVideoTitle("");
  }, [videoId]);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let startedAt = 0;
    let previousTime = 0;

    function syncTitle(player) {
      if (customTitle || cancelled) return;
      try {
        const data = player?.getVideoData?.();
        const next = String(data?.title || "").trim();
        if (next) setVideoTitle(next);
      } catch {
        // Title is optional when YouTube blocks metadata.
      }
    }

    const step = (now) => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;
      const time = player.getCurrentTime() || 0;
      const duration = player.getDuration() || 0;
      if (time + 0.35 < previousTime) {
        startedAt = now;
        player.setVolume(0);
      }
      previousTime = time;
      player.setVolume(streamVolume(envelopeLevel({ currentTime: time, duration }, startedAt, now)));
      frame = requestAnimationFrame(step);
    };

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        playerRef.current = new YT.Player(elementId, {
          videoId,
          width: 1,
          height: 1,
          playerVars: {
            autoplay: compact ? 0 : 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            rel: 0,
            modestbranding: 1,
            loop: 1,
            playlist: videoId,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              event.target.setVolume(0);
              syncTitle(event.target);
              if (!compact) event.target.playVideo();
            },
            onError: () => {
              if (!cancelled) setFailed(true);
            },
            onStateChange: (event) => {
              syncTitle(event.target);
              const state = window.YT?.PlayerState;
              if (event.data === state?.PLAYING) {
                startedAt = performance.now();
                previousTime = event.target.getCurrentTime() || 0;
                setPlaying(true);
                setNeedsTap(false);
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(step);
              } else if (event.data === state?.PAUSED || event.data === state?.CUED) {
                cancelAnimationFrame(frame);
                setPlaying(false);
              } else if (event.data === state?.ENDED) {
                startedAt = performance.now();
                event.target.seekTo(0, true);
                event.target.playVideo();
              }
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      const current = playerRef.current;
      playerRef.current = null;
      current?.destroy?.();
    };
  }, [compact, customTitle, elementId, videoId]);

  function toggle() {
    const player = playerRef.current;
    if (!player?.getPlayerState) return;
    if (player.getPlayerState() === window.YT?.PlayerState?.PLAYING) {
      player.pauseVideo();
      return;
    }
    player.setVolume(0);
    player.playVideo();
  }

  const card = (
    <SongCard
      theme={theme}
      compact={compact}
      title={customTitle || videoTitle}
      status={songStatus({ artist, needsTap, failed, fallback: needsTap ? "Tap to play" : "Now playing" })}
      cover=""
      playing={playing}
      failed={failed}
      onToggle={toggle}
    >
      <HiddenStreamHost>
        <div id={elementId} />
      </HiddenStreamHost>
    </SongCard>
  );

  return <SongFrame compact={compact}>{card}</SongFrame>;
}

function SoundCloudSongPlayer({ theme, compact, src }) {
  const customTitle = String(theme?.background_audio_title || "").trim();
  const artist = String(theme?.background_audio_artist || "").trim();
  const iframeRef = useRef(null);
  const widgetRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [needsTap, setNeedsTap] = useState(!compact);
  const [failed, setFailed] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const widgetSrc = `https://w.soundcloud.com/player/?url=${encodeURIComponent(src)}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&visual=false&show_artwork=false`;

  useEffect(() => {
    setTrackTitle("");
  }, [src]);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let startedAt = 0;
    let previousMs = 0;

    loadSoundCloudApi()
      .then((SC) => {
        if (cancelled || !iframeRef.current) return;
        const widget = SC.Widget(iframeRef.current);
        widgetRef.current = widget;
        widget.bind(SC.Widget.Events.READY, () => {
          widget.setVolume(0);
          if (!customTitle) {
            widget.getCurrentSound((sound) => {
              const next = String(sound?.title || "").trim();
              if (!cancelled && next) setTrackTitle(next);
            });
          }
          if (!compact) widget.play();
        });
        widget.bind(SC.Widget.Events.PLAY, () => {
          startedAt = performance.now();
          setPlaying(true);
          setNeedsTap(false);
          window.clearInterval(timer);
          timer = window.setInterval(() => {
            widget.getPosition((pos) => {
              widget.getDuration((dur) => {
                if (pos + 350 < previousMs) startedAt = performance.now();
                previousMs = pos;
                const level = envelopeLevel(
                  { currentTime: pos / 1000, duration: dur / 1000 },
                  startedAt,
                  performance.now()
                );
                widget.setVolume(streamVolume(level));
              });
            });
          }, 200);
        });
        widget.bind(SC.Widget.Events.PAUSE, () => {
          window.clearInterval(timer);
          setPlaying(false);
        });
        widget.bind(SC.Widget.Events.FINISH, () => {
          startedAt = performance.now();
          widget.seekTo(0);
          widget.play();
        });
        widget.bind(SC.Widget.Events.ERROR, () => setFailed(true));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      widgetRef.current = null;
    };
  }, [compact, customTitle, src]);

  function toggle() {
    const widget = widgetRef.current;
    if (!widget) return;
    if (playing) widget.pause();
    else {
      widget.setVolume(0);
      widget.play();
    }
  }

  const card = (
    <SongCard
      theme={theme}
      compact={compact}
      title={customTitle || trackTitle}
      status={songStatus({ artist, needsTap, failed, fallback: needsTap ? "Tap to play" : "Now playing" })}
      cover=""
      playing={playing}
      failed={failed}
      onToggle={toggle}
    >
      <HiddenStreamHost>
        <iframe
          ref={iframeRef}
          title={customTitle || trackTitle || "SoundCloud"}
          src={widgetSrc}
          className="h-px w-px border-0"
          allow="autoplay"
        />
      </HiddenStreamHost>
    </SongCard>
  );

  return <SongFrame compact={compact}>{card}</SongFrame>;
}

