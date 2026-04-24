"use client";

import { BarChart3, MessageSquare, Sparkles, Users, Video } from "lucide-react";
import React from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InteractiveChat } from "./interactive-chat";
import { LivePolls } from "./live-polls";
import { LiveStream } from "./live-stream";
import { StreamControls } from "./stream-controls";
import { VideoPlayer } from "./video-player";
import { WatchParty } from "./watch-party";

type StreamingDashboardProps = {
  userId: string;
  streamUrl?: string;
  sessionId?: string;
};

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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* Main Video Player and Stream */}
      <div className="space-y-6 lg:col-span-3">
        {/* Video Player */}
        <div className="space-y-2">
          <h2 className="font-bold text-2xl text-gray-900">Live Stream</h2>
          <VideoPlayer
            isLive={true}
            quality="1080p"
            streamUrl={streamUrl}
            title="Triumph Synergy Live Stream"
          />
        </div>

        {/* Stream Controls */}
        <StreamControls bandwidth={5000} bitrate={2500} quality="1080p" />

        {/* Interactive Features */}
        <Tabs className="w-full" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger className="flex items-center gap-2" value="stream">
              <Video size={16} />
              <span className="hidden sm:inline">Stream</span>
            </TabsTrigger>
            <TabsTrigger className="flex items-center gap-2" value="chat">
              <MessageSquare size={16} />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger className="flex items-center gap-2" value="polls">
              <BarChart3 size={16} />
              <span className="hidden sm:inline">Polls</span>
            </TabsTrigger>
            <TabsTrigger className="flex items-center gap-2" value="party">
              <Users size={16} />
              <span className="hidden sm:inline">Party</span>
            </TabsTrigger>
          </TabsList>

          {/* Stream Tab */}
          <TabsContent className="mt-4 space-y-4" value="stream">
            <LiveStream userId={userId} />
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent className="mt-4" value="chat">
            <Card className="h-[400px] overflow-hidden">
              <InteractiveChat
                enabled={true}
                messages={messages}
                onSendMessage={handleSendMessage}
              />
            </Card>
          </TabsContent>

          {/* Polls Tab */}
          <TabsContent className="mt-4 space-y-4" value="polls">
            <LivePolls
              enabled={true}
              onCreatePoll={handleCreatePoll}
              onVote={handleVotePoll}
              polls={polls}
            />
          </TabsContent>

          {/* Watch Party Tab */}
          <TabsContent className="mt-4" value="party">
            <WatchParty sessionId={sessionId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Stream Info */}
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white">
          <h3 className="mb-2 font-bold text-lg">Stream Info</h3>
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
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="text-purple-600" size={18} />
            <h3 className="font-bold text-gray-900">AI Recommends</h3>
          </div>
          <div className="max-h-[600px] space-y-3 overflow-y-auto">
            {[1, 2, 3].map((i) => (
              <Card
                className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                key={i}
              >
                <div className="flex aspect-video items-center justify-center bg-gray-300">
                  <span className="text-gray-600">Stream {i}</span>
                </div>
                <div className="p-2">
                  <p className="line-clamp-2 font-semibold text-gray-900 text-xs">
                    Recommended Stream Title {i}
                  </p>
                  <p className="mt-1 text-gray-600 text-xs">
                    {95 - i * 5}% match
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <Card className="border-purple-200 bg-purple-50 p-4">
          <h3 className="mb-3 font-semibold text-gray-900 text-sm">
            ⚡ Quick Stats
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Engagement</span>
              <span className="font-bold text-purple-600">42.5%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-purple-200">
              <div
                className="h-1 rounded-full bg-purple-600"
                style={{ width: "42.5%" }}
              />
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-gray-600">Chat Activity</span>
              <span className="font-bold text-purple-600">234 msgs</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
