"use client";

import React from "react";
import { useStreaming } from "@/lib/streaming-sdk/use-streaming";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Mic, MicOff, Video, VideoOff, Radio } from "lucide-react";

interface LiveStreamProps {
  userId: string;
  onStreamStart?: (sessionId: string) => void;
  onStreamEnd?: (sessionId: string) => void;
}

/**
 * Main live streaming interface
 */
export function LiveStream({ userId, onStreamStart, onStreamEnd }: LiveStreamProps) {
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
      <Card className="p-6 max-w-md mx-auto">
        <h3 className="text-2xl font-bold mb-4">Start a Stream</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Stream Title</label>
            <Input
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              placeholder="Enter stream title"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={streamDescription}
              onChange={(e) => setStreamDescription(e.target.value)}
              placeholder="Enter stream description"
              className="w-full p-2 border rounded-md mt-1 text-sm"
              rows={3}
            />
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={handleInitialize}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Initializing...
              </>
            ) : (
              <>
                <Radio size={16} className="mr-2" />
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
        <div className="flex items-center justify-between bg-slate-100 p-4 rounded-lg">
          <div>
            <p className="text-sm text-gray-600">Stream Status</p>
            <p className="text-2xl font-bold uppercase text-gray-900">{status}</p>
          </div>

          {status === "live" && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
              <span className="text-red-600 font-semibold">LIVE</span>
            </div>
          )}
        </div>

        {/* Stats */}
        {status === "live" && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm">Duration</p>
              <p className="text-2xl font-bold">{formatDuration(duration)}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm">Viewers</p>
              <p className="text-2xl font-bold">{viewerCount}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm">Bitrate</p>
              <p className="text-2xl font-bold">2.5 Mb/s</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            variant={isAudioEnabled ? "default" : "outline"}
            size="sm"
          >
            {isAudioEnabled ? (
              <Mic size={16} className="mr-2" />
            ) : (
              <MicOff size={16} className="mr-2" />
            )}
            {isAudioEnabled ? "Audio On" : "Audio Off"}
          </Button>

          <Button
            onClick={() => setIsVideoEnabled(!isVideoEnabled)}
            variant={isVideoEnabled ? "default" : "outline"}
            size="sm"
          >
            {isVideoEnabled ? (
              <Video size={16} className="mr-2" />
            ) : (
              <VideoOff size={16} className="mr-2" />
            )}
            {isVideoEnabled ? "Video On" : "Video Off"}
          </Button>

          {status === "idle" && (
            <Button
              onClick={handleStart}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Radio size={16} className="mr-2" />
              )}
              Start Stream
            </Button>
          )}

          {status === "live" && (
            <>
              <Button
                onClick={pauseStream}
                variant="outline"
                size="sm"
              >
                Pause
              </Button>

              <Button
                onClick={handleEnd}
                className="bg-red-600 hover:bg-red-700"
                size="sm"
              >
                End Stream
              </Button>
            </>
          )}

          {status === "paused" && (
            <Button
              onClick={resumeStream}
              variant="outline"
              size="sm"
            >
              Resume
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded">
            {error}
          </div>
        )}
      </div>
    </Card>
  );
}
