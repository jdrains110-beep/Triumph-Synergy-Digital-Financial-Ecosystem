"use client";

import { Check, Copy, Plus, Users } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type WatchPartyProps = {
  sessionId?: string;
  maxParticipants?: number;
  onCreateWatchParty?: (sessionId: string) => string;
  enabled?: boolean;
};

/**
 * Watch party component for synchronized group viewing
 */
export function WatchParty({
  sessionId,
  maxParticipants = 100,
  onCreateWatchParty,
  enabled = true,
}: WatchPartyProps) {
  const [watchPartyCode, setWatchPartyCode] = React.useState<string | null>(
    null
  );
  const [participants, setParticipants] = React.useState<string[]>([]);
  const [copyClicked, setCopyClicked] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");

  const handleCreateWatchParty = () => {
    if (!sessionId) {
      return;
    }

    const code =
      onCreateWatchParty?.(sessionId) ||
      `PARTY-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
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
        <p className="text-center text-gray-500">Watch parties are disabled</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Users className="text-blue-600" size={24} />
          <h3 className="font-bold text-gray-900 text-xl">Watch Party</h3>
        </div>

        {/* No Watch Party */}
        {watchPartyCode ? (
          /* Active Watch Party */
          <div className="space-y-4">
            {/* Party Code */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="mb-2 font-semibold text-blue-600 text-xs">
                PARTY CODE
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded border border-blue-200 bg-white p-3 font-bold font-mono text-gray-900 text-lg">
                  {watchPartyCode}
                </div>
                <Button
                  className="px-3"
                  onClick={handleCopyCode}
                  size="sm"
                  variant="outline"
                >
                  {copyClicked ? (
                    <Check className="text-green-600" size={16} />
                  ) : (
                    <Copy size={16} />
                  )}
                </Button>
              </div>
            </div>

            {/* Invite Section */}
            <div className="space-y-2">
              <label
                className="font-semibold text-gray-700 text-sm"
                htmlFor="invite-email"
              >
                Invite Friends
              </label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  placeholder="friend@example.com"
                  value={inviteEmail}
                />
                <Button onClick={handleInvite} size="sm" variant="outline">
                  <Plus size={16} />
                </Button>
              </div>
            </div>

            {/* Participants */}
            <div>
              <p className="mb-2 font-semibold text-gray-700 text-sm">
                Participants ({participants.length}/{maxParticipants})
              </p>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {participants.map((participant, idx) => (
                  <div
                    className="flex items-center gap-2 rounded bg-gray-50 p-2"
                    key={`participant-${participant}-${idx}`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-xs">
                      {participant.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-700 text-sm">{participant}</span>
                    {participant === "You" && (
                      <span className="ml-auto rounded bg-blue-100 px-2 py-1 text-blue-700 text-xs">
                        Host
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2 rounded-lg bg-purple-50 p-3">
              <p className="font-semibold text-purple-700 text-xs">
                Watch Party Features
              </p>
              <ul className="space-y-1 text-purple-600 text-xs">
                <li>✓ Synchronized playback for all participants</li>
                <li>✓ Shared chat within the party</li>
                <li>✓ Host can control playback</li>
                <li>✓ Real-time reactions and emojis</li>
              </ul>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-gray-600 text-sm">
              Create a watch party to invite friends to watch together in
              real-time
            </p>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!sessionId}
              onClick={handleCreateWatchParty}
            >
              <Plus className="mr-2" size={16} />
              Create Watch Party
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
