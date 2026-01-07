"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BarChart3, Plus } from "lucide-react";

interface Poll {
  id: string;
  question: string;
  options: Array<{
    id: string;
    text: string;
    votes: number;
  }>;
  closed: boolean;
}

interface LivePollsProps {
  polls?: Poll[];
  onCreatePoll?: (question: string, options: string[]) => void;
  onVote?: (pollId: string, optionId: string) => void;
  enabled?: boolean;
}

/**
 * Live polls component for interactive engagement
 */
export function LivePolls({
  polls = [],
  onCreatePoll,
  onVote,
  enabled = true,
}: LivePollsProps) {
  const [isCreating, setIsCreating] = React.useState(false);
  const [question, setQuestion] = React.useState("");
  const [options, setOptions] = React.useState(["", ""]);

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, ""]);
    }
  };

  const handleUpdateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = () => {
    if (question.trim() && options.every((opt) => opt.trim())) {
      onCreatePoll?.(question, options);
      setQuestion("");
      setOptions(["", ""]);
      setIsCreating(false);
    }
  };

  const getTotalVotes = (poll: Poll): number => {
    return poll.options.reduce((sum, opt) => sum + opt.votes, 0);
  };

  const getPercentage = (votes: number, total: number): number => {
    return total > 0 ? Math.round((votes / total) * 100) : 0;
  };

  if (!enabled) {
    return (
      <Card className="p-4">
        <p className="text-gray-500 text-center">Polls are disabled</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Poll Button */}
      <Button
        onClick={() => setIsCreating(!isCreating)}
        className="w-full bg-purple-600 hover:bg-purple-700"
        disabled={!enabled}
      >
        <Plus size={16} className="mr-2" />
        Create Poll
      </Button>

      {/* Create Poll Form */}
      {isCreating && (
        <Card className="p-4 bg-purple-50">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Poll Question
              </label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What's your question?"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Options (2-5)
              </label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <Input
                    key={idx}
                    value={opt}
                    onChange={(e) => handleUpdateOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                  />
                ))}
              </div>

              {options.length < 5 && (
                <Button
                  onClick={handleAddOption}
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                >
                  <Plus size={14} className="mr-1" /> Add Option
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreatePoll}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                Create Poll
              </Button>
              <Button
                onClick={() => setIsCreating(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Polls Display */}
      {polls.length === 0 ? (
        <Card className="p-6">
          <div className="text-center">
            <BarChart3 size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No polls yet</p>
          </div>
        </Card>
      ) : (
        polls.map((poll) => {
          const totalVotes = getTotalVotes(poll);

          return (
            <Card key={poll.id} className="p-4">
              <p className="font-semibold text-gray-900 mb-3">{poll.question}</p>

              <div className="space-y-3">
                {poll.options.map((option) => {
                  const percentage = getPercentage(option.votes, totalVotes);

                  return (
                    <div key={option.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {option.text}
                        </span>
                        <span className="text-xs text-gray-500">
                          {percentage}% ({option.votes})
                        </span>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      {!poll.closed && (
                        <Button
                          onClick={() => onVote?.(poll.id, option.id)}
                          variant="ghost"
                          size="sm"
                          className="mt-1 text-xs h-6"
                        >
                          Vote
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {poll.closed && (
                <div className="mt-3 p-2 bg-gray-100 rounded text-center">
                  <p className="text-xs font-semibold text-gray-700">
                    Poll Closed - Total Votes: {totalVotes}
                  </p>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
