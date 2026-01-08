"use client";

import { Activity, Settings, Volume2, Zap } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

type StreamControlsProps = {
  quality?: string;
  bitrate?: number;
  bandwidth?: number;
  bufferingTime?: number;
  frameDrops?: number;
  onQualityChange?: (quality: string) => void;
  onSettingsOpen?: () => void;
};

/**
 * Advanced stream controls and monitoring
 */
export function StreamControls({
  quality = "1080p",
  bitrate = 2500,
  bandwidth = 5000,
  bufferingTime = 0.8,
  frameDrops = 2,
  onQualityChange,
  onSettingsOpen,
}: StreamControlsProps) {
  const [volume, setVolume] = React.useState(80);
  const [showStats, setShowStats] = React.useState(false);
  const [autoQuality, setAutoQuality] = React.useState(true);

  const qualityOptions = ["360p", "480p", "720p", "1080p", "4K"];
  const bandwidthHealth =
    bandwidth > 4000
      ? "excellent"
      : bandwidth > 2500
        ? "good"
        : bandwidth > 1000
          ? "fair"
          : "poor";
  const healthColor = {
    excellent: "text-green-600 bg-green-50",
    good: "text-blue-600 bg-blue-50",
    fair: "text-yellow-600 bg-yellow-50",
    poor: "text-red-600 bg-red-50",
  }[bandwidthHealth];

  return (
    <div className="space-y-4">
      {/* Main Controls */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Quality Selection */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="font-semibold text-gray-900 text-sm">
                Stream Quality
              </label>
              <Button
                className="text-xs"
                onClick={() => setAutoQuality(!autoQuality)}
                size="sm"
                variant={autoQuality ? "default" : "outline"}
              >
                {autoQuality ? "Auto" : "Manual"}
              </Button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {qualityOptions.map((opt) => (
                <Button
                  className="text-xs"
                  key={opt}
                  onClick={() => {
                    onQualityChange?.(opt);
                    setAutoQuality(false);
                  }}
                  size="sm"
                  variant={quality === opt ? "default" : "outline"}
                >
                  {opt}
                </Button>
              ))}
            </div>
          </div>

          {/* Volume Control */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Volume2 className="text-gray-600" size={18} />
              <label className="font-semibold text-gray-900 text-sm">
                Volume
              </label>
              <span className="ml-auto text-gray-600 text-xs">{volume}%</span>
            </div>
            <Slider
              className="w-full"
              defaultValue={[volume]}
              max={100}
              onValueChange={(val) => setVolume(val[0])}
              step={1}
            />
          </div>

          {/* Quick Settings */}
          <div className="flex gap-2">
            <Button
              className="flex-1 text-xs"
              onClick={() => setShowStats(!showStats)}
              size="sm"
              variant="outline"
            >
              <Activity className="mr-1" size={14} />
              {showStats ? "Hide" : "Show"} Stats
            </Button>
            <Button
              className="flex-1 text-xs"
              onClick={onSettingsOpen}
              size="sm"
              variant="outline"
            >
              <Settings className="mr-1" size={14} />
              Settings
            </Button>
          </div>
        </div>
      </Card>

      {/* Performance Stats */}
      {showStats && (
        <Card className="space-y-3 bg-gray-50 p-4">
          <h4 className="font-semibold text-gray-900 text-sm">Performance</h4>

          {/* Bandwidth Status */}
          <div className={`rounded-lg p-3 ${healthColor}`}>
            <p className="mb-1 font-semibold text-xs capitalize">
              Bandwidth: {bandwidth} kb/s ({bandwidthHealth})
            </p>
            <div className="h-2 w-full rounded-full bg-gray-300">
              <div
                className={`h-2 rounded-full transition-all ${
                  bandwidthHealth === "excellent"
                    ? "bg-green-600"
                    : bandwidthHealth === "good"
                      ? "bg-blue-600"
                      : bandwidthHealth === "fair"
                        ? "bg-yellow-600"
                        : "bg-red-600"
                }`}
                style={{ width: `${Math.min((bandwidth / 8000) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Bitrate */}
          <div className="rounded-lg bg-white p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Current Bitrate</span>
              <span className="font-semibold text-gray-900">
                {bitrate} kb/s
              </span>
            </div>
          </div>

          {/* Buffering Time */}
          <div className="rounded-lg bg-white p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Avg. Buffer Time</span>
              <span
                className={`font-semibold ${bufferingTime < 1 ? "text-green-600" : "text-yellow-600"}`}
              >
                {bufferingTime.toFixed(2)}s
              </span>
            </div>
          </div>

          {/* Frame Drops */}
          <div className="rounded-lg bg-white p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Frame Drops</span>
              <span
                className={`font-semibold ${frameDrops < 5 ? "text-green-600" : "text-red-600"}`}
              >
                {frameDrops}
              </span>
            </div>
          </div>

          {/* Optimization Tip */}
          {bandwidthHealth === "poor" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2">
              <p className="font-semibold text-red-700 text-xs">
                💡 Tip: Low bandwidth detected. Try lowering quality to reduce
                buffering.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Network Status Indicator */}
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2">
        <Zap
          className={
            bandwidthHealth === "excellent"
              ? "text-green-600"
              : bandwidthHealth === "good"
                ? "text-blue-600"
                : bandwidthHealth === "fair"
                  ? "text-yellow-600"
                  : "text-red-600"
          }
          size={16}
        />
        <span className="text-gray-700 text-xs">
          Network:{" "}
          <span className="font-semibold capitalize">{bandwidthHealth}</span>
        </span>
        <span className={`ml-auto rounded px-2 py-0.5 text-xs ${healthColor}`}>
          {bandwidth} kb/s
        </span>
      </div>
    </div>
  );
}
