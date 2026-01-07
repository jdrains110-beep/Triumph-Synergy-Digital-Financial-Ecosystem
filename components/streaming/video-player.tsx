"use client";

import React, { useEffect, useRef } from "react";
import HLS from "hls.js";
import { Play, Pause, Volume2, Settings, Maximize2 } from "lucide-react";

interface VideoPlayerProps {
  streamUrl?: string;
  title?: string;
  isLive?: boolean;
  quality?: string;
  onQualityChange?: (quality: string) => void;
  controlsTimeout?: number;
}

/**
 * Advanced video player with adaptive streaming
 */
export function VideoPlayer({
  streamUrl,
  title = "Live Stream",
  isLive = false,
  quality = "1080p",
  onQualityChange,
  controlsTimeout = 3000,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showControls, setShowControls] = React.useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize HLS
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;

    if (HLS.isSupported()) {
      const hls = new HLS({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(HLS.Events.MANIFEST_PARSED, () => {
        video.play();
        setIsPlaying(true);
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play();
        setIsPlaying(true);
      });
    }
  }, [streamUrl]);

  // Auto-hide controls
  useEffect(() => {
    const resetTimeout = () => {
      clearTimeout(controlsTimeoutRef.current);
      setShowControls(true);

      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying && !isFullscreen) {
          setShowControls(false);
        }
      }, controlsTimeout);
    };

    if (containerRef.current) {
      containerRef.current.addEventListener("mousemove", resetTimeout);
      resetTimeout();

      return () => {
        containerRef.current?.removeEventListener("mousemove", resetTimeout);
        clearTimeout(controlsTimeoutRef.current);
      };
    }
  }, [isPlaying, isFullscreen, controlsTimeout]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!isFullscreen) {
        containerRef.current.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black rounded-lg overflow-hidden group"
      style={{ aspectRatio: "16 / 9" }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full"
        controls={false}
        playsInline
      />

      {/* Live Badge */}
      {isLive && (
        <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 z-10">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          LIVE
        </div>
      )}

      {/* Quality Badge */}
      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded text-sm z-10">
        {quality}
      </div>

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progress Bar */}
        <div className="w-full mb-3 h-1 bg-white/20 rounded cursor-pointer hover:h-2 transition-all">
          <div className="h-full bg-red-600 rounded" style={{ width: "45%" }} />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="hover:scale-110 transition-transform"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={24} />
              ) : (
                <Play size={24} />
              )}
            </button>

            <button
              onClick={toggleMute}
              className="hover:scale-110 transition-transform"
              title={isMuted ? "Unmute" : "Mute"}
            >
              <Volume2 size={24} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onQualityChange?.(quality)}
              className="hover:scale-110 transition-transform"
              title="Settings"
            >
              <Settings size={24} />
            </button>

            <button
              onClick={toggleFullscreen}
              className="hover:scale-110 transition-transform"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              <Maximize2 size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Play Button Overlay */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
        >
          <Play size={64} className="text-white ml-4" fill="white" />
        </button>
      )}
    </div>
  );
}
