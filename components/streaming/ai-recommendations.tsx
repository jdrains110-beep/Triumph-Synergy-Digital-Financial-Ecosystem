"use client";

import { Play, Star, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Recommendation = {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  relevanceScore: number;
  reason: string;
  isLive: boolean;
};

type AIRecommendationsProps = {
  recommendations?: Recommendation[];
  onSelect?: (recommendationId: string) => void;
};

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
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="text-blue-600" size={20} />
        <h3 className="font-bold text-gray-900 text-lg">Recommended For You</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec) => (
          <Card
            className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
            key={rec.id}
            onClick={() => onSelect?.(rec.id)}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden bg-gray-900">
              <img
                alt={rec.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                src={rec.thumbnail}
              />

              {/* Live Badge */}
              {rec.isLive && (
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-red-600 px-2 py-1 font-bold text-white text-xs">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  LIVE
                </div>
              )}

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                <Play
                  className="ml-2 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  fill="white"
                  size={48}
                />
              </div>

              {/* Relevance Score */}
              <div className="absolute top-2 right-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 font-bold text-white text-xs">
                <Star
                  className="text-yellow-400"
                  fill="currentColor"
                  size={12}
                />
                {Math.round(rec.relevanceScore * 100)}%
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2 p-3">
              <h4 className="line-clamp-2 font-semibold text-gray-900 text-sm">
                {rec.title}
              </h4>

              <div className="flex items-center justify-between">
                <Badge className="text-xs" variant="outline">
                  {rec.category}
                </Badge>
              </div>

              <p className="text-gray-600 text-xs">💡 {rec.reason}</p>

              <Button
                className="h-7 w-full text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(rec.id);
                }}
                size="sm"
                variant="outline"
              >
                <Play className="mr-1" size={12} />
                Watch Now
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* How This Works */}
      <Card className="border-blue-200 bg-blue-50 p-4">
        <p className="mb-2 font-semibold text-blue-900 text-sm">
          ✨ How AI Recommendations Work
        </p>
        <ul className="space-y-1 text-blue-800 text-xs">
          <li>• Analyzes your viewing history and preferences</li>
          <li>• Uses collaborative filtering with similar users</li>
          <li>• Considers trending content in your interests</li>
          <li>• Updates in real-time based on engagement</li>
        </ul>
      </Card>
    </div>
  );
}
