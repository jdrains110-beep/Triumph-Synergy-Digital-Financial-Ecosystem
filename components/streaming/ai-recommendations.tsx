"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Star, TrendingUp } from "lucide-react";

interface Recommendation {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  relevanceScore: number;
  reason: string;
  isLive: boolean;
}

interface AIRecommendationsProps {
  recommendations?: Recommendation[];
  onSelect?: (recommendationId: string) => void;
}

/**
 * AI-powered content recommendations
 */
export function AIRecommendations({
  recommendations = [
    {
      id: "1",
      title: "Gaming Highlights Compilation",
      thumbnail: "https://via.placeholder.com/300x170?text=Gaming",
      category: "Gaming",
      relevanceScore: 0.95,
      reason: "Based on your watch history",
      isLive: false,
    },
    {
      id: "2",
      title: "Live Coding Session",
      thumbnail: "https://via.placeholder.com/300x170?text=Coding",
      category: "Technology",
      relevanceScore: 0.87,
      reason: "Trending in your interests",
      isLive: true,
    },
    {
      id: "3",
      title: "Music Production Tutorial",
      thumbnail: "https://via.placeholder.com/300x170?text=Music",
      category: "Music",
      relevanceScore: 0.82,
      reason: "Popular with viewers like you",
      isLive: false,
    },
  ],
  onSelect,
}: AIRecommendationsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={20} className="text-blue-600" />
        <h3 className="text-lg font-bold text-gray-900">Recommended For You</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((rec) => (
          <Card
            key={rec.id}
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => onSelect?.(rec.id)}
          >
            {/* Thumbnail */}
            <div className="relative overflow-hidden bg-gray-900 aspect-video">
              <img
                src={rec.thumbnail}
                alt={rec.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />

              {/* Live Badge */}
              {rec.isLive && (
                <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
              )}

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                <Play
                  size={48}
                  className="text-white opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                  fill="white"
                />
              </div>

              {/* Relevance Score */}
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                <Star size={12} className="text-yellow-400" fill="currentColor" />
                {Math.round(rec.relevanceScore * 100)}%
              </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
              <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">
                {rec.title}
              </h4>

              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {rec.category}
                </Badge>
              </div>

              <p className="text-xs text-gray-600">
                💡 {rec.reason}
              </p>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(rec.id);
                }}
              >
                <Play size={12} className="mr-1" />
                Watch Now
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* How This Works */}
      <Card className="bg-blue-50 p-4 border-blue-200">
        <p className="text-sm text-blue-900 font-semibold mb-2">
          ✨ How AI Recommendations Work
        </p>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Analyzes your viewing history and preferences</li>
          <li>• Uses collaborative filtering with similar users</li>
          <li>• Considers trending content in your interests</li>
          <li>• Updates in real-time based on engagement</li>
        </ul>
      </Card>
    </div>
  );
}
