"use client";

import { BarChart3, Plus } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Poll = {
  id: string;
  question: string;
  options: Array<{
    id: string;
    text: string;
    votes: number;
  }>;
  closed: boolean;
};

type LivePollsProps = {
  polls?: Poll[];
  onCreatePoll?: (question: string, options: string[]) => void;
  onVote?: (pollId: string, optionId: string) => void;
  enabled?: boolean;
};

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
        <p className="text-center text-gray-500">Polls are disabled</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Poll Button */}
      <Button
        className="w-full bg-purple-600 hover:bg-purple-700"
        disabled={!enabled}
        onClick={() => setIsCreating(!isCreating)}
      >
        <Plus className="mr-2" size={16} />
        Create Poll
      </Button>

      {/* Create Poll Form */}
      {isCreating && (
        <Card className="bg-purple-50 p-4">
          <div className="space-y-3">
            <div>
              <label
                className="font-semibold text-gray-700 text-sm"
                htmlFor="poll-question"
              >
                Poll Question
              </label>
              <Input
                className="mt-1"
                id="poll-question"
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What's your question?"
                value={question}
              />
            </div>

            <fieldset>
              <legend className="mb-2 block font-semibold text-gray-700 text-sm">
                Options (2-5)
              </legend>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <Input
                    id={`poll-option-${idx}`}
                    key={`poll-option-${idx}`}
                    onChange={(e) => handleUpdateOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                  />
                ))}
              </div>

              {options.length < 5 && (
                <Button
                  className="mt-2 w-full"
                  onClick={handleAddOption}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="mr-1" size={14} /> Add Option
                </Button>
              )}
            </fieldset>

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={handleCreatePoll}
              >
                Create Poll
              </Button>
              <Button
                className="flex-1"
                onClick={() => setIsCreating(false)}
                variant="outline"
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
            <BarChart3 className="mx-auto mb-2 text-gray-300" size={32} />
            <p className="text-gray-500">No polls yet</p>
          </div>
        </Card>
      ) : (
        polls.map((poll) => {
          const totalVotes = getTotalVotes(poll);

          return (
            <Card className="p-4" key={poll.id}>
              <p className="mb-3 font-semibold text-gray-900">
                {poll.question}
              </p>

              <div className="space-y-3">
                {poll.options.map((option) => {
                  const percentage = getPercentage(option.votes, totalVotes);

                  return (
                    <div key={option.id}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-medium text-gray-700 text-sm">
                          {option.text}
                        </span>
                        <span className="text-gray-500 text-xs">
                          {percentage}% ({option.votes})
                        </span>
                      </div>

                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-purple-600 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      {!poll.closed && (
                        <Button
                          className="mt-1 h-6 text-xs"
                          onClick={() => onVote?.(poll.id, option.id)}
                          size="sm"
                          variant="ghost"
                        >
                          Vote
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {poll.closed && (
                <div className="mt-3 rounded bg-gray-100 p-2 text-center">
                  <p className="font-semibold text-gray-700 text-xs">
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
