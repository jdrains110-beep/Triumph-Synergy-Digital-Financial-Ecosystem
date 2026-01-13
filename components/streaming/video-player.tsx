"use client";

import HLS from "hls.js";
import { Maximize2, Pause, Play, Settings, Volume2 } from "lucide-react";
import React, { useEffect, useRef } from "react";

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
		if (!streamUrl || !videoRef.current) {
			return;
		}

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
		}
		if (video.canPlayType("application/vnd.apple.mpegurl")) {
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
			if (isFullscreen) {
				document.exitFullscreen?.();
			} else {
				containerRef.current.requestFullscreen?.();
			}
			setIsFullscreen(!isFullscreen);
		}
	};

	return (
		<div
			className="group relative w-full overflow-hidden rounded-lg bg-black"
			ref={containerRef}
			style={{ aspectRatio: "16 / 9" }}
		>
			{/* Video Element */}
			<video
				className="h-full w-full"
				controls={false}
				playsInline
				ref={videoRef}
			>
				<track kind="captions" label="English" srcLang="en" />
			</video>

			{/* Live Badge */}
			{isLive && (
				<div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 font-semibold text-sm text-white">
					<span className="h-2 w-2 animate-pulse rounded-full bg-white" />
					LIVE
				</div>
			)}

			{/* Quality Badge */}
			<div className="absolute top-4 right-4 z-10 rounded bg-black/50 px-3 py-1 text-sm text-white">
				{quality}
			</div>

			{/* Controls */}
			<div
				className={`absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
					showControls ? "opacity-100" : "opacity-0"
				}`}
			>
				{/* Progress Bar */}
				<div className="mb-3 h-1 w-full cursor-pointer rounded bg-white/20 transition-all hover:h-2">
					<div className="h-full rounded bg-red-600" style={{ width: "45%" }} />
				</div>

				{/* Control Buttons */}
				<div className="flex items-center justify-between text-white">
					<div className="flex items-center gap-3">
						<button
							className="transition-transform hover:scale-110"
							onClick={togglePlay}
							title={isPlaying ? "Pause" : "Play"}
						>
							{isPlaying ? <Pause size={24} /> : <Play size={24} />}
						</button>

						<button
							className="transition-transform hover:scale-110"
							onClick={toggleMute}
							title={isMuted ? "Unmute" : "Mute"}
						>
							<Volume2 size={24} />
						</button>
					</div>

					<div className="flex items-center gap-3">
						<button
							className="transition-transform hover:scale-110"
							onClick={() => onQualityChange?.(quality)}
							title="Settings"
						>
							<Settings size={24} />
						</button>

						<button
							className="transition-transform hover:scale-110"
							onClick={toggleFullscreen}
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
					className="group absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40"
					onClick={togglePlay}
				>
					<Play className="ml-4 text-white" fill="white" size={64} />
				</button>
			)}
		</div>
	);
}
