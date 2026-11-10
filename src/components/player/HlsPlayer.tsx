import Hls from 'hls.js/light';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Cast,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCw,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePreferences } from '../../stores/preferences';
import { cn } from '../../lib/utils';
import { Spinner } from '../Loading';
import { classifyHttpStatus, isMixedContent, playbackError, type PlaybackError } from './playerErrors';

interface QualityLevel {
  index: number;
  height: number;
  bitrate: number;
}

const MAX_NETWORK_RETRIES = 2;

type RemoteVideo = HTMLVideoElement & {
  remote?: { prompt: () => Promise<void>; watchAvailability: (cb: (available: boolean) => void) => Promise<number> };
  webkitShowPlaybackTargetPicker?: () => void;
  webkitEnterFullscreen?: () => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function ControlButton({
  label,
  onClick,
  children,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className="grid h-9 w-9 place-items-center rounded-full text-slate-100 transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-accent-soft"
    >
      {children}
    </button>
  );
}

export function HlsPlayer({
  src,
  poster,
  title,
  onFatal,
  isLocal = false,
}: {
  src: string;
  poster?: string | null;
  title: string;
  /** Called once when the source cannot be played, so a parent can try an alternate source. */
  onFatal?: (error: PlaybackError) => void;
  isLocal?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<RemoteVideo | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const onFatalRef = useRef(onFatal);
  onFatalRef.current = onFatal;

  const volume = usePreferences((state) => state.volume);
  const muted = usePreferences((state) => state.muted);
  const autoplay = usePreferences((state) => state.autoplay);
  const setVolume = usePreferences((state) => state.setVolume);
  const setMuted = usePreferences((state) => state.setMuted);

  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  const [activeHeight, setActiveHeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<PlaybackError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [castAvailable, setCastAvailable] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const pipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;

  // Keep the element in sync with persisted volume preferences.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setLoading(true);
    setBuffering(false);
    setError(null);
    setLevels([]);
    setSelectedLevel(-1);
    setActiveHeight(null);

    if (isMixedContent(src)) {
      const failure = playbackError('mixed-content');
      setLoading(false);
      setError(failure);
      onFatalRef.current?.(failure);
      return;
    }

    let hls: Hls | null = null;
    let failed = false;
    let networkRetries = 0;
    let mediaRecoveries = 0;
    let retryTimer: number | undefined;

    const fail = (failure: PlaybackError) => {
      if (failed) return;
      failed = true;
      setLoading(false);
      setBuffering(false);
      setError(failure);
      onFatalRef.current?.(failure);
    };

    const tryPlay = () => {
      if (!autoplay) return;
      void video.play().catch(() => {
        // Autoplay with sound is often blocked; the user can press play.
        setPlaying(false);
      });
    };

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        manifestLoadingMaxRetry: 1,
        levelLoadingMaxRetry: 2,
        fragLoadingMaxRetry: 3,
      });
      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls?.loadSource(src));

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const available = data.levels
          .map((level, index) => ({ index, height: level.height, bitrate: level.bitrate }))
          .filter((level) => level.height > 0)
          .sort((a, b) => b.height - a.height);
        setLevels(available);
        setLoading(false);
        tryPlay();
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const height = hls?.levels[data.level]?.height;
        setActiveHeight(height && height > 0 ? height : null);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          if (mediaRecoveries === 0) {
            mediaRecoveries += 1;
            hls?.recoverMediaError();
            return;
          }
          if (mediaRecoveries === 1) {
            mediaRecoveries += 1;
            hls?.swapAudioCodec();
            hls?.recoverMediaError();
            return;
          }
          fail(playbackError('media'));
          return;
        }
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          const failure = classifyHttpStatus(data.response?.code);
          const manifestFailure =
            data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
            data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
            data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR;
          // Retry transient failures with exponential backoff; never hammer the provider.
          if (failure.retryable && networkRetries < MAX_NETWORK_RETRIES) {
            const delay = 1500 * 2 ** networkRetries;
            networkRetries += 1;
            setNotice(`Connection interrupted. Retrying (${networkRetries}/${MAX_NETWORK_RETRIES})…`);
            retryTimer = window.setTimeout(() => {
              setNotice(null);
              if (manifestFailure) hls?.loadSource(src);
              else hls?.startLoad();
            }, delay);
            return;
          }
          fail(failure);
          return;
        }
        fail(playbackError('unknown'));
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS native HLS.
      video.src = src;
      const onLoaded = () => {
        setLoading(false);
        tryPlay();
      };
      const onError = () => fail(playbackError('network'));
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
      return () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        video.removeAttribute('src');
        video.load();
      };
    } else {
      fail(playbackError('unsupported'));
    }

    return () => {
      window.clearTimeout(retryTimer);
      hls?.destroy();
      hlsRef.current = null;
    };
    // `autoplay` is read once per source load on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, attempt]);

  // Media element events drive UI state.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => {
      setBuffering(false);
      setLoading(false);
      setPlaying(true);
    };
    const onVolume = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('volumechange', onVolume);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('volumechange', onVolume);
    };
  }, [setMuted, setVolume]);

  // Cast availability via the Remote Playback API (Chromecast on Chrome, AirPlay on Safari).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    if (video.remote?.watchAvailability) {
      video.remote
        .watchAvailability((available) => {
          if (!cancelled) setCastAvailable(available);
        })
        .catch(() => setCastAvailable(false));
    } else if (typeof video.webkitShowPlaybackTargetPicker === 'function') {
      setCastAvailable(true);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 0.5;
  }, []);

  const changeVolume = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = Math.min(1, Math.max(0, video.volume + delta));
    if (video.volume > 0) video.muted = false;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else if (container.requestFullscreen) {
      void container.requestFullscreen().catch(() => undefined);
    } else if (video.webkitEnterFullscreen) {
      // iOS Safari only supports fullscreen on the video element itself.
      video.webkitEnterFullscreen();
    }
  }, []);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      setNotice('Picture-in-picture is not available for this stream.');
      window.setTimeout(() => setNotice(null), 2500);
    }
  }, []);

  const cast = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.remote?.prompt) {
      video.remote.prompt().catch(() => {
        setNotice('No cast device was selected or the stream cannot be cast.');
        window.setTimeout(() => setNotice(null), 2500);
      });
    } else {
      video.webkitShowPlaybackTargetPicker?.();
    }
  }, []);

  const chooseLevel = useCallback((index: number) => {
    setSelectedLevel(index);
    if (hlsRef.current) hlsRef.current.currentLevel = index;
  }, []);

  // Keyboard shortcuts: Space/K play, M mute, F fullscreen, P picture-in-picture, arrows volume.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const handlers: Record<string, () => void> = {
        ' ': togglePlay,
        k: togglePlay,
        m: toggleMute,
        f: toggleFullscreen,
        p: () => void togglePip(),
        arrowup: () => changeVolume(0.1),
        arrowdown: () => changeVolume(-0.1),
      };
      const handler = handlers[key];
      if (!handler) return;
      // Space on a focused button should activate the button, not the player.
      if (key === ' ' && event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      handler();
      revealControls();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [togglePlay, toggleMute, toggleFullscreen, togglePip, changeVolume]);

  function revealControls() {
    setControlsVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!videoRef.current?.paused) setControlsVisible(false);
    }, 3000);
  }

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const showControls = controlsVisible || !playing;

  return (
    <div
      ref={containerRef}
      className="video-surface group/player relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-card"
      onMouseMove={revealControls}
      onTouchStart={revealControls}
      data-testid="hls-player"
    >
      <video
        ref={videoRef}
        playsInline
        preload="metadata"
        poster={poster ?? undefined}
        aria-label={`${title} live video`}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="aspect-video w-full cursor-pointer bg-black"
        // Allow AirPlay on Safari.
        x-webkit-airplay="allow"
      />

      {(loading || buffering) && !error ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35">
          <div className="flex items-center gap-3 rounded-full bg-ink-950/80 px-4 py-2 text-sm text-slate-200">
            <Spinner className="h-4 w-4" />
            {loading ? 'Connecting to stream…' : 'Buffering…'}
          </div>
        </div>
      ) : null}

      {!loading && !playing && !error ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 m-auto grid h-16 w-16 place-items-center rounded-full bg-accent/90 text-white shadow-glow transition hover:scale-105"
        >
          <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
        </button>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-ink-950/85 px-3 py-1.5 text-xs text-slate-200"
        >
          {notice}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/95 px-6 text-center"
        >
          <AlertCircle className="h-8 w-8 text-amber-300" aria-hidden="true" />
          <p className="max-w-md text-sm leading-6 text-slate-200">{error.message}</p>
          {isLocal && error.kind !== 'unsupported' ? (
            <p className="max-w-md text-xs leading-5 text-slate-400">
              ISP-local (BDIX) streams usually work only while you are connected to that ISP’s network.
            </p>
          ) : null}
          {error.kind !== 'mixed-content' && error.kind !== 'unsupported' ? (
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-soft"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              Retry this source
            </button>
          ) : null}
        </div>
      ) : null}

      {!error ? (
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2 pb-2 pt-10 transition-opacity duration-200 sm:gap-2 sm:px-3',
            showControls ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <ControlButton label={playing ? 'Pause (K)' : 'Play (K)'} onClick={togglePlay}>
            {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
          </ControlButton>
          <ControlButton label={muted ? 'Unmute (M)' : 'Mute (M)'} onClick={toggleMute} pressed={muted}>
            <VolumeIcon className="h-5 w-5" />
          </ControlButton>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(event) => {
              const video = videoRef.current;
              if (!video) return;
              video.volume = Number(event.target.value);
              video.muted = Number(event.target.value) === 0;
            }}
            aria-label="Volume"
            className="volume hidden w-20 sm:block"
          />
          <span className="ml-1 inline-flex items-center gap-1.5 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-white" aria-hidden="true" />
            Live
          </span>
          {activeHeight ? (
            <span className="hidden text-[11px] font-semibold text-slate-300 sm:inline">{activeHeight}p</span>
          ) : null}
          <div className="ml-auto flex items-center gap-1">
            {levels.length > 1 ? (
              <label className="flex items-center rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-100">
                <span className="sr-only">Video quality</span>
                <select
                  value={selectedLevel}
                  onChange={(event) => chooseLevel(Number(event.target.value))}
                  className="bg-transparent text-[11px] font-semibold text-slate-100 outline-none"
                >
                  <option value={-1} className="text-slate-900">
                    Auto
                  </option>
                  {levels.map((level) => (
                    <option key={level.index} value={level.index} className="text-slate-900">
                      {level.height}p
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {castAvailable ? (
              <ControlButton label="Cast to device" onClick={cast}>
                <Cast className="h-5 w-5" />
              </ControlButton>
            ) : null}
            {pipSupported ? (
              <ControlButton label="Picture-in-picture (P)" onClick={() => void togglePip()}>
                <PictureInPicture2 className="h-5 w-5" />
              </ControlButton>
            ) : null}
            <ControlButton label={fullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'} onClick={toggleFullscreen}>
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </ControlButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
