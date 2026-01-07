"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Plus, Copy, Check } from "lucide-react";

interface WatchPartyProps {
  sessionId?: string;
  maxParticipants?: number;
  onCreateWatchParty?: (sessionId: string) => string;
  enabled?: boolean;
}

/**
 * Watch party component for synchronized group viewing
 */
export function WatchParty({
  sessionId,
  maxParticipants = 100,
  onCreateWatchParty,
  enabled = true,
}: WatchPartyProps) {
  const [watchPartyCode, setWatchPartyCode] = React.useState<string | null>(null);
  const [participants, setParticipants] = React.useState<string[]>([]);
  const [copyClicked, setCopyClicked] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");

  const handleCreateWatchParty = () => {
    if (!sessionId) return;

    const code = onCreateWatchParty?.(sessionId) || `PARTY-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    setWatchPartyCode(code);
    setParticipants(["You"]);
  };

  const handleCopyCode = () => {
    if (watchPartyCode) {
      navigator.clipboard.writeText(watchPartyCode);
      setCopyClicked(true);
      setTimeout(() => setCopyClicked(false), 2000);
    }
  };

  const handleInvite = () => {
    if (inviteEmail.trim()) {
      // Simulate adding participant
      setParticipants([...participants, inviteEmail.split("@")[0]]);
      setInviteEmail("");
    }
  };

  if (!enabled) {
    return (
      <Card className="p-4">
        <p className="text-gray-500 text-center">Watch parties are disabled</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Users size={24} className="text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">Watch Party</h3>
        </div>

        {/* No Watch Party */}
        {!watchPartyCode ? (
          <div>
            <p className="text-gray-600 text-sm mb-4">
              Create a watch party to invite friends to watch together in real-time
            </p>
            <Button
              onClick={handleCreateWatchParty}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!sessionId}
            >
              <Plus size={16} className="mr-2" />
              Create Watch Party
            </Button>
          </div>
        ) : (
          /* Active Watch Party */
          <div className="space-y-4">
            {/* Party Code */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-600 mb-2">PARTY CODE</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white p-3 rounded border border-blue-200 font-mono text-lg font-bold text-gray-900">
                  {watchPartyCode}
                </div>
                <Button
                  onClick={handleCopyCode}
                  size="sm"
                  variant="outline"
                  className="px-3"
                >
                  {copyClicked ? (
                    <Check size={16} className="text-green-600" />
                  ) : (
                    <Copy size={16} />
                  )}
                </Button>
              </div>
            </div>

            {/* Invite Section */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Invite Friends
              </label>
              <div className="flex gap-2">
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@example.com"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
                <Button
                  onClick={handleInvite}
                  variant="outline"
                  size="sm"
                >
                  <Plus size={16} />
                </Button>
              </div>
            </div>

            {/* Participants */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Participants ({participants.length}/{maxParticipants})
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {participants.map((participant, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-gray-50 p-2 rounded"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      {participant.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700">{participant}</span>
                    {participant === "You" && (
                      <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Host
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="bg-purple-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-purple-700">Watch Party Features</p>
              <ul className="text-xs text-purple-600 space-y-1">
                <li>✓ Synchronized playback for all participants</li>
                <li>✓ Shared chat within the party</li>
                <li>✓ Host can control playback</li>
                <li>✓ Real-time reactions and emojis</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
