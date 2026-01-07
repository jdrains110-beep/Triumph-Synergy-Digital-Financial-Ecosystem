"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Smile, Send, Pin, Trash2 } from "lucide-react";

interface Message {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  isPinned?: boolean;
}

interface InteractiveChatProps {
  messages?: Message[];
  onSendMessage?: (message: string) => void;
  enabled?: boolean;
}

/**
 * Interactive live chat component
 */
export function InteractiveChat({
  messages = [],
  onSendMessage,
  enabled = true,
}: InteractiveChatProps) {
  const [message, setMessage] = React.useState("");
  const [pinnedMessage, setPinnedMessage] = React.useState<Message | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage?.(message);
      setMessage("");
    }
  };

  const handlePin = (msg: Message) => {
    setPinnedMessage(pinnedMessage?.id === msg.id ? null : msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!enabled) {
    return (
      <Card className="p-4">
        <p className="text-gray-500 text-center">Chat is disabled for this stream</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <h3 className="font-semibold">Live Chat</h3>
        <p className="text-sm text-blue-100">{messages.length} messages</p>
      </div>

      {/* Pinned Message */}
      {pinnedMessage && (
        <div className="bg-blue-50 border-l-4 border-blue-600 p-3 mx-3 mt-3 rounded">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-600">📌 Pinned Message</p>
              <p className="text-xs text-gray-700 mt-1">{pinnedMessage.message}</p>
            </div>
            <button
              onClick={() => setPinnedMessage(null)}
              className="text-blue-600 hover:text-blue-700 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-center">
              No messages yet. Be the first to chat!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="group bg-white rounded p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">
                    {msg.username}
                  </p>
                  <p className="text-sm text-gray-700 break-words mt-1">
                    {msg.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handlePin(msg)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title={msg.isPinned ? "Unpin" : "Pin"}
                  >
                    <Pin size={14} className="text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 space-y-2">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1"
            disabled={!enabled}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || !enabled}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send size={16} />
          </Button>
        </div>

        {/* Emoji Suggestions */}
        <div className="flex gap-2 text-lg">
          {["👍", "❤️", "😂", "😮", "🔥", "🎉"].map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setMessage((msg) => msg + emoji);
              }}
              className="hover:scale-125 transition-transform"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
