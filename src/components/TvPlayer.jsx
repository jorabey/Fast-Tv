import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Maximize,
  Minimize,
  AlertCircle,
  RotateCcw,
  RotateCw,
} from "lucide-react";

const IOSSpinner = ({ size = 24 }) => (
  <svg className="ios-spinner" width={size} height={size} viewBox="0 0 24 24">
    {[...Array(12)].map((_, i) => (
      <line
        key={i}
        x1="12"
        y1="2"
        x2="12"
        y2="6"
        transform={`rotate(${i * 30} 12 12)`}
        opacity={(i + 1) / 12}
      />
    ))}
  </svg>
);

export default function TvPlayer({ channel }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [seekIndicator, setSeekIndicator] = useState(null);

  useEffect(() => {
    if (!videoRef.current || !channel?.stream_url) return;
    const video = videoRef.current;

    let url = channel.stream_url;
    if (url.startsWith("http://"))
      url = `https://corsproxy.io/?${encodeURIComponent(url)}`;

    setIsBuffering(true);
    setError(false);

    if (Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls({ maxBufferLength: 30, enableWorker: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () =>
        video.play().catch(() => setIsPlaying(false)),
      );
      hls.on(Hls.Events.ERROR, (e, data) => {
        if (data.fatal) setError(true);
      });
      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () =>
        video.play().catch(() => setIsPlaying(false)),
      );
      video.addEventListener("error", () => setError(true));
    }
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [channel]);

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleFullscreen = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    const container = containerRef.current;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
        setIsFullscreen(true);
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
        setIsFullscreen(true);
        video.addEventListener(
          "webkitendfullscreen",
          () => {
            setIsFullscreen(false);
            video.play().catch(() => {});
          },
          { once: true },
        );
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleDoubleTap = (e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX || (e.touches && e.touches[0].clientX);
    const clickPos = x - rect.left;
    if (clickPos < rect.width / 3) {
      videoRef.current.currentTime -= 10;
      setSeekIndicator("-10s");
      setTimeout(() => setSeekIndicator(null), 800);
    } else if (clickPos > (rect.width / 3) * 2) {
      videoRef.current.currentTime += 10;
      setSeekIndicator("+10s");
      setTimeout(() => setSeekIndicator(null), 800);
    } else {
      toggleFullscreen();
    }
  };

  const handleActivity = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-[20px] overflow-hidden shadow-2xl group cursor-pointer"
      onMouseMove={handleActivity}
      onTouchStart={handleActivity}
      onClick={togglePlay}
      onDoubleClick={handleDoubleTap}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline={true}
        autoPlay={true}
        controls={false}
        disablePictureInPicture={true}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      {isBuffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 pointer-events-none">
          <IOSSpinner size={36} />
        </div>
      )}
      {seekIndicator && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="bg-black/60 backdrop-blur px-6 py-3 rounded-2xl flex flex-col items-center animate-fade-in text-white">
            <span className="font-bold text-lg mt-1">{seekIndicator}</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 text-white p-4">
          <AlertCircle size={40} className="text-red-500 mb-2" />
          <span className="font-medium">Xatolik</span>
        </div>
      )}

      <div
        className={`absolute inset-0 flex flex-col justify-between p-4 sm:p-5 transition-opacity duration-300 pointer-events-none z-20 ${showControls || !isPlaying ? "opacity-100" : "opacity-0"}`}
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.6) 100%)",
        }}
      >
        <div className="flex justify-between items-start w-full">
          <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center border border-white/10">
            <span className="text-white font-semibold text-[13px]">
              {channel?.name}
            </span>
          </div>
          <div className="bg-red-600/90 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
            <span className="text-white font-bold text-[11px] uppercase">
              Live
            </span>
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            onClick={togglePlay}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xl pointer-events-auto border border-white/10 active:scale-90 transition-transform"
          >
            {isPlaying ? (
              <Pause size={28} color="white" fill="white" />
            ) : (
              <Play size={28} color="white" fill="white" className="ml-1.5" />
            )}
          </button>
        </div>
        <div className="flex justify-end items-center w-full">
          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xl border border-white/20 active:scale-90 transition-transform pointer-events-auto"
          >
            {isFullscreen ? (
              <Minimize size={18} color="white" />
            ) : (
              <Maximize size={18} color="white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
