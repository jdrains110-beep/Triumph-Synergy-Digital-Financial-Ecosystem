"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Zap, Settings, Activity, Maximize2, Volume2 } from "lucide-react";

interface StreamControlsProps {
  quality?: string;
  bitrate?: number;
  bandwidth?: number;
  bufferingTime?: number;
  frameDrops?: number;
  onQualityChange?: (quality: string) => void;
  onSettingsOpen?: () => void;
}

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
  const bandwidthHealth = bandwidth > 4000 ? "excellent" : bandwidth > 2500 ? "good" : bandwidth > 1000 ? "fair" : "poor";
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
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-900">
                Stream Quality
              </label>
              <Button
                onClick={() => setAutoQuality(!autoQuality)}
                variant={autoQuality ? "default" : "outline"}
                size="sm"
                className="text-xs"
              >
                {autoQuality ? "Auto" : "Manual"}
              </Button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {qualityOptions.map((opt) => (
                <Button
                  key={opt}
                  onClick={() => {
                    onQualityChange?.(opt);
                    setAutoQuality(false);
                  }}
                  variant={quality === opt ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                >
                  {opt}
                </Button>
              ))}
            </div>
          </div>

          {/* Volume Control */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Volume2 size={18} className="text-gray-600" />
              <label className="text-sm font-semibold text-gray-900">Volume</label>
              <span className="ml-auto text-xs text-gray-600">{volume}%</span>
            </div>
            <Slider
              defaultValue={[volume]}
              onValueChange={(val) => setVolume(val[0])}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Quick Settings */}
          <div className="flex gap-2">
            <Button
              onClick={() => setShowStats(!showStats)}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              <Activity size={14} className="mr-1" />
              {showStats ? "Hide" : "Show"} Stats
            </Button>
            <Button
              onClick={onSettingsOpen}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
            >
              <Settings size={14} className="mr-1" />
              Settings
            </Button>
          </div>
        </div>
      </Card>

      {/* Performance Stats */}
      {showStats && (
        <Card className="p-4 bg-gray-50 space-y-3">
          <h4 className="font-semibold text-sm text-gray-900">Performance</h4>

          {/* Bandwidth Status */}
          <div className={`p-3 rounded-lg ${healthColor}`}>
            <p className="text-xs font-semibold capitalize mb-1">
              Bandwidth: {bandwidth} kb/s ({bandwidthHealth})
            </p>
            <div className="w-full bg-gray-300 rounded-full h-2">
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
          <div className="bg-white rounded-lg p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Current Bitrate</span>
              <span className="font-semibold text-gray-900">{bitrate} kb/s</span>
            </div>
          </div>

          {/* Buffering Time */}
          <div className="bg-white rounded-lg p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Avg. Buffer Time</span>
              <span className={`font-semibold ${bufferingTime < 1 ? "text-green-600" : "text-yellow-600"}`}>
                {bufferingTime.toFixed(2)}s
              </span>
            </div>
          </div>

          {/* Frame Drops */}
          <div className="bg-white rounded-lg p-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Frame Drops</span>
              <span className={`font-semibold ${frameDrops < 5 ? "text-green-600" : "text-red-600"}`}>
                {frameDrops}
              </span>
            </div>
          </div>

          {/* Optimization Tip */}
          {bandwidthHealth === "poor" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <p className="text-xs text-red-700 font-semibold">
                💡 Tip: Low bandwidth detected. Try lowering quality to reduce buffering.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Network Status Indicator */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
        <Zap size={16} className={bandwidthHealth === "excellent" ? "text-green-600" : bandwidthHealth === "good" ? "text-blue-600" : bandwidthHealth === "fair" ? "text-yellow-600" : "text-red-600"} />
        <span className="text-xs text-gray-700">
          Network: <span className="font-semibold capitalize">{bandwidthHealth}</span>
        </span>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded ${healthColor}`}>
          {bandwidth} kb/s
        </span>
      </div>
    </div>
  );
}
