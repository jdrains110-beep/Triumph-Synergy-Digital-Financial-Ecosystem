"use client";

import { Loader2, Mic, MicOff, Radio, Video, VideoOff } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStreaming } from "@/lib/streaming-sdk/use-streaming";

type LiveStreamProps = {
  userId: string;
  onStreamStart?: (sessionId: string) => void;
  onStreamEnd?: (sessionId: string) => void;
};

/**
 * Main live streaming interface
 */
export function LiveStream({
  userId,
  onStreamStart,
  onStreamEnd,
}: LiveStreamProps) {
  const {
    initializeSession,
    startStream,
    endStream,
    pauseStream,
    resumeStream,
    status,
    loading,
    error,
    sessionId,
    duration,
    viewerCount,
  } = useStreaming(userId);

  const [streamTitle, setStreamTitle] = React.useState("My Awesome Stream");
  const [streamDescription, setStreamDescription] = React.useState("");
  const [isAudioEnabled, setIsAudioEnabled] = React.useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = React.useState(true);
  const [initialized, setInitialized] = React.useState(false);

  const handleInitialize = async () => {
    try {
      await initializeSession(streamTitle, streamDescription, {
        category: "gaming",
        tags: ["live", "streaming"],
        isPublic: true,
      });
      setInitialized(true);
    } catch (error) {
      console.error("Failed to initialize session:", error);
    }
  };

  const handleStart = async () => {
    try {
      await startStream();
      onStreamStart?.(sessionId!);
    } catch (error) {
      console.error("Failed to start stream:", error);
    }
  };

  const handleEnd = async () => {
    try {
      await endStream();
      onStreamEnd?.(sessionId!);
    } catch (error) {
      console.error("Failed to end stream:", error);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (!initialized) {
    return (
      <Card className="mx-auto max-w-md p-6">
        <h3 className="mb-4 font-bold text-2xl">Start a Stream</h3>

        <div className="space-y-4">
          <div>
            <label className="font-medium text-sm">Stream Title</label>
            <Input
              className="mt-1"
              onChange={(e) => setStreamTitle(e.target.value)}
              placeholder="Enter stream title"
              value={streamTitle}
            />
          </div>

          <div>
            <label className="font-medium text-sm">Description</label>
            <textarea
              className="mt-1 w-full rounded-md border p-2 text-sm"
              onChange={(e) => setStreamDescription(e.target.value)}
              placeholder="Enter stream description"
              rows={3}
              value={streamDescription}
            />
          </div>

          {error && (
            <div className="rounded bg-red-100 p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <Button
            className="w-full"
            disabled={loading}
            onClick={handleInitialize}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={16} />
                Initializing...
              </>
            ) : (
              <>
                <Radio className="mr-2" size={16} />
                Initialize Stream
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Status Bar */}
        <div className="flex items-center justify-between rounded-lg bg-slate-100 p-4">
          <div>
            <p className="text-gray-600 text-sm">Stream Status</p>
            <p className="font-bold text-2xl text-gray-900 uppercase">
              {status}
            </p>
          </div>

          {status === "live" && (
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-600" />
              <span className="font-semibold text-red-600">LIVE</span>
            </div>
          )}
        </div>

        {/* Stats */}
        {status === "live" && (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-gray-600 text-sm">Duration</p>
              <p className="font-bold text-2xl">{formatDuration(duration)}</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-gray-600 text-sm">Viewers</p>
              <p className="font-bold text-2xl">{viewerCount}</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <p className="text-gray-600 text-sm">Bitrate</p>
              <p className="font-bold text-2xl">2.5 Mb/s</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            size="sm"
            variant={isAudioEnabled ? "default" : "outline"}
          >
            {isAudioEnabled ? (
              <Mic className="mr-2" size={16} />
            ) : (
              <MicOff className="mr-2" size={16} />
            )}
            {isAudioEnabled ? "Audio On" : "Audio Off"}
          </Button>

          <Button
            onClick={() => setIsVideoEnabled(!isVideoEnabled)}
            size="sm"
            variant={isVideoEnabled ? "default" : "outline"}
          >
            {isVideoEnabled ? (
              <Video className="mr-2" size={16} />
            ) : (
              <VideoOff className="mr-2" size={16} />
            )}
            {isVideoEnabled ? "Video On" : "Video Off"}
          </Button>

          {status === "idle" && (
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={loading}
              onClick={handleStart}
              size="sm"
            >
              {loading ? (
                <Loader2 className="mr-2 animate-spin" size={16} />
              ) : (
                <Radio className="mr-2" size={16} />
              )}
              Start Stream
            </Button>
          )}

          {status === "live" && (
            <>
              <Button onClick={pauseStream} size="sm" variant="outline">
                Pause
              </Button>

              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={handleEnd}
                size="sm"
              >
                End Stream
              </Button>
            </>
          )}

          {status === "paused" && (
            <Button onClick={resumeStream} size="sm" variant="outline">
              Resume
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded bg-red-100 p-3 text-red-700">{error}</div>
        )}
      </div>
    </Card>
  );
}
