"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { VideoPlayer } from "./video-player";
import { LiveStream } from "./live-stream";
import { InteractiveChat } from "./interactive-chat";
import { LivePolls } from "./live-polls";
import { WatchParty } from "./watch-party";
import { AIRecommendations } from "./ai-recommendations";
import { StreamControls } from "./stream-controls";
import { Video, MessageSquare, BarChart3, Users, Sparkles, Settings } from "lucide-react";

interface StreamingDashboardProps {
  userId: string;
  streamUrl?: string;
  sessionId?: string;
}

/**
 * Main streaming dashboard combining all features
 */
export function StreamingDashboard({
  userId,
  streamUrl,
  sessionId,
}: StreamingDashboardProps) {
  const [activeTab, setActiveTab] = React.useState("stream");
  const [messages, setMessages] = React.useState<any[]>([]);
  const [polls, setPolls] = React.useState<any[]>([]);

  const handleSendMessage = (message: string) => {
    setMessages([
      ...messages,
      {
        id: `msg_${Date.now()}`,
        userId,
        username: "You",
        message,
        timestamp: new Date(),
      },
    ]);
  };

  const handleCreatePoll = (question: string, options: string[]) => {
    setPolls([
      ...polls,
      {
        id: `poll_${Date.now()}`,
        question,
        options: options.map((text, i) => ({
          id: `opt_${i}`,
          text,
          votes: 0,
        })),
        closed: false,
      },
    ]);
  };

  const handleVotePoll = (pollId: string, optionId: string) => {
    setPolls(
      polls.map((poll) => {
        if (poll.id === pollId) {
          return {
            ...poll,
            options: poll.options.map((opt: any) => {
              if (opt.id === optionId) {
                return { ...opt, votes: opt.votes + 1 };
              }
              return opt;
            }),
          };
        }
        return poll;
      })
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Video Player and Stream */}
      <div className="lg:col-span-3 space-y-6">
        {/* Video Player */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Live Stream</h2>
          <VideoPlayer
            streamUrl={streamUrl}
            title="Triumph Synergy Live Stream"
            isLive={true}
            quality="1080p"
          />
        </div>

        {/* Stream Controls */}
        <StreamControls quality="1080p" bandwidth={5000} bitrate={2500} />

        {/* Interactive Features */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stream" className="flex items-center gap-2">
              <Video size={16} />
              <span className="hidden sm:inline">Stream</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare size={16} />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="polls" className="flex items-center gap-2">
              <BarChart3 size={16} />
              <span className="hidden sm:inline">Polls</span>
            </TabsTrigger>
            <TabsTrigger value="party" className="flex items-center gap-2">
              <Users size={16} />
              <span className="hidden sm:inline">Party</span>
            </TabsTrigger>
          </TabsList>

          {/* Stream Tab */}
          <TabsContent value="stream" className="space-y-4 mt-4">
            <LiveStream userId={userId} />
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-4">
            <Card className="h-[400px] overflow-hidden">
              <InteractiveChat
                messages={messages}
                onSendMessage={handleSendMessage}
                enabled={true}
              />
            </Card>
          </TabsContent>

          {/* Polls Tab */}
          <TabsContent value="polls" className="mt-4 space-y-4">
            <LivePolls
              polls={polls}
              onCreatePoll={handleCreatePoll}
              onVote={handleVotePoll}
              enabled={true}
            />
          </TabsContent>

          {/* Watch Party Tab */}
          <TabsContent value="party" className="mt-4">
            <WatchParty sessionId={sessionId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Stream Info */}
        <Card className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <h3 className="font-bold text-lg mb-2">Stream Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Viewers</span>
              <span className="font-semibold">1,234</span>
            </div>
            <div className="flex justify-between">
              <span>Duration</span>
              <span className="font-semibold">1h 23m</span>
            </div>
            <div className="flex justify-between">
              <span>Peak</span>
              <span className="font-semibold">2,890</span>
            </div>
          </div>
        </Card>

        {/* AI Recommendations */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-purple-600" />
            <h3 className="font-bold text-gray-900">AI Recommends</h3>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div className="bg-gray-300 aspect-video flex items-center justify-center">
                  <span className="text-gray-600">Stream {i}</span>
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-900 line-clamp-2">
                    Recommended Stream Title {i}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {95 - i * 5}% match
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <Card className="p-4 bg-purple-50 border-purple-200">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">
            ⚡ Quick Stats
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Engagement</span>
              <span className="font-bold text-purple-600">42.5%</span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-1">
              <div
                className="bg-purple-600 h-1 rounded-full"
                style={{ width: "42.5%" }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-gray-600">Chat Activity</span>
              <span className="font-bold text-purple-600">234 msgs</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
