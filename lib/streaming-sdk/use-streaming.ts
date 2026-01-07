/**
 * Triumph Synergy useStreaming Hook
 * React hook for streaming state management and operations
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { streamingManager } from "./streaming";
import { STREAMING_CONFIG, StreamSession, StreamAnalytics, StreamRecommendation } from "./streaming-config";

export interface UseStreamingState {
  // Session Management
  activeSession: StreamSession | null;
  sessionId: string | null;
  status: "idle" | "initializing" | "live" | "ended" | "paused" | "error";

  // Viewer Management
  viewerCount: number;
  peakViewerCount: number;
  viewers: any[];

  // Quality & Performance
  currentQuality: string;
  recommendedQuality: string;
  bandwidth: number;
  bufferingTime: number;
  frameDrops: number;

  // Interactivity
  messages: any[];
  polls: any[];
  reactions: any[];
  superChats: any[];

  // Analytics
  analytics: StreamAnalytics | null;
  duration: number;
  engagement: number;

  // Recording
  isRecording: boolean;
  recordingId: string | null;

  // State Management
  loading: boolean;
  error: string | null;
}

/**
 * Main streaming hook
 */
export function useStreaming(userId: string) {
  const [state, setState] = useState<UseStreamingState>({
    activeSession: null,
    sessionId: null,
    status: "idle",
    viewerCount: 0,
    peakViewerCount: 0,
    viewers: [],
    currentQuality: "1080p",
    recommendedQuality: "1080p",
    bandwidth: 5000,
    bufferingTime: 0,
    frameDrops: 0,
    messages: [],
    polls: [],
    reactions: [],
    superChats: [],
    analytics: null,
    duration: 0,
    engagement: 0,
    isRecording: false,
    recordingId: null,
    loading: false,
    error: null,
  });

  const socketRef = useRef<any>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout>();
  const bandwidthCheckRef = useRef<NodeJS.Timeout>();

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Initialize a new streaming session
   */
  const initializeSession = useCallback(
    async (title: string, description: string, options?: any) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const session = await streamingManager.initializeSession(userId, title, description, options);

        setState((prev) => ({
          ...prev,
          activeSession: session,
          sessionId: session.id,
          currentQuality: session.quality,
          loading: false,
        }));

        return session;
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to initialize session",
        }));
        throw error;
      }
    },
    [userId]
  );

  /**
   * Start streaming
   */
  const startStream = useCallback(async () => {
    if (!state.sessionId) {
      setState((prev) => ({
        ...prev,
        error: "No session initialized",
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    try {
      await streamingManager.startStream(state.sessionId);

      setState((prev) => ({
        ...prev,
        status: "live",
        loading: false,
      }));

      // Start duration timer
      sessionTimerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);

      // Start bandwidth check
      bandwidthCheckRef.current = setInterval(() => {
        checkBandwidth();
      }, 5000);
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, [state.sessionId]);

  /**
   * End streaming
   */
  const endStream = useCallback(async () => {
    if (!state.sessionId) return;

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const result = await streamingManager.endStream(state.sessionId);

      setState((prev) => ({
        ...prev,
        status: "ended",
        loading: false,
        viewerCount: result.viewerCount,
      }));

      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (bandwidthCheckRef.current) clearInterval(bandwidthCheckRef.current);
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, [state.sessionId]);

  /**
   * Pause stream
   */
  const pauseStream = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      await streamingManager.pauseStream(state.sessionId);
      setState((prev) => ({ ...prev, status: "paused" }));
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    } catch (error: any) {
      setState((prev) => ({ ...prev, error: error.message }));
    }
  }, [state.sessionId]);

  /**
   * Resume stream
   */
  const resumeStream = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      await streamingManager.resumeStream(state.sessionId);
      setState((prev) => ({
        ...prev,
        status: "live",
      }));

      sessionTimerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);
    } catch (error: any) {
      setState((prev) => ({ ...prev, error: error.message }));
    }
  }, [state.sessionId]);

  // ============================================================================
  // QUALITY & PERFORMANCE
  // ============================================================================

  /**
   * Update stream quality
   */
  const updateQuality = useCallback(
    async (quality: string) => {
      if (!state.sessionId) return;

      try {
        const result = await streamingManager.updateQuality(state.sessionId, quality);
        setState((prev) => ({
          ...prev,
          currentQuality: quality,
        }));
        return result;
      } catch (error: any) {
        setState((prev) => ({ ...prev, error: error.message }));
      }
    },
    [state.sessionId]
  );

  /**
   * Check bandwidth and recommend quality
   */
  const checkBandwidth = useCallback(() => {
    // Simulate bandwidth check
    const bandwidth = 2000 + Math.random() * 3000;
    const result = streamingManager.checkBandwidthAndRecommend(bandwidth);

    setState((prev) => ({
      ...prev,
      bandwidth: Math.round(bandwidth),
      recommendedQuality: result.quality,
    }));
  }, []);

  // ============================================================================
  // INTERACTIVITY
  // ============================================================================

  /**
   * Send chat message
   */
  const sendMessage = useCallback(
    (message: string) => {
      if (!state.sessionId) return;

      const newMessage = {
        id: `msg_${Date.now()}`,
        userId,
        message,
        timestamp: new Date(),
        isModerated: false,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, newMessage],
      }));
    },
    [state.sessionId, userId]
  );

  /**
   * Create poll
   */
  const createPoll = useCallback(
    (question: string, options: string[]) => {
      if (!state.sessionId) return;

      const poll = {
        id: `poll_${Date.now()}`,
        question,
        options: options.map((text, i) => ({
          id: `opt_${i}`,
          text,
          votes: 0,
        })),
        closed: false,
      };

      setState((prev) => ({
        ...prev,
        polls: [...prev.polls, poll],
      }));
    },
    [state.sessionId]
  );

  /**
   * Vote on poll
   */
  const votePoll = useCallback((pollId: string, optionId: string) => {
    setState((prev) => ({
      ...prev,
      polls: prev.polls.map((poll) => {
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
      }),
    }));
  }, []);

  /**
   * Send reaction
   */
  const sendReaction = useCallback((emoji: string) => {
    if (!STREAMING_CONFIG.interactivity.reactions.enabled) return;

    const reaction = {
      id: `reaction_${Date.now()}`,
      emoji,
      timestamp: new Date(),
    };

    setState((prev) => ({
      ...prev,
      reactions: [...prev.reactions, reaction].slice(-50), // Keep last 50
    }));
  }, []);

  /**
   * Send super chat
   */
  const sendSuperChat = useCallback(
    (message: string, amount: number) => {
      if (!STREAMING_CONFIG.interactivity.superChat.enabled) return;
      if (amount < STREAMING_CONFIG.interactivity.superChat.minAmount) return;

      const superChat = {
        id: `sc_${Date.now()}`,
        userId,
        message,
        amount,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        superChats: [...prev.superChats, superChat],
      }));
    },
    [userId]
  );

  // ============================================================================
  // RECORDING
  // ============================================================================

  /**
   * Start recording
   */
  const startRecording = useCallback(async () => {
    if (!state.sessionId) return;

    try {
      const result = await streamingManager.startRecording(state.sessionId);
      setState((prev) => ({
        ...prev,
        isRecording: true,
        recordingId: result.recordingId,
      }));
    } catch (error: any) {
      setState((prev) => ({ ...prev, error: error.message }));
    }
  }, [state.sessionId]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(async () => {
    if (!state.recordingId) return;

    try {
      const result = await streamingManager.stopRecording(state.recordingId);
      setState((prev) => ({
        ...prev,
        isRecording: false,
        recordingId: null,
      }));
      return result;
    } catch (error: any) {
      setState((prev) => ({ ...prev, error: error.message }));
    }
  }, [state.recordingId]);

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Get session analytics
   */
  const getAnalytics = useCallback(() => {
    if (!state.sessionId) return null;

    try {
      return streamingManager.getSessionAnalytics(state.sessionId);
    } catch (error) {
      return null;
    }
  }, [state.sessionId]);

  /**
   * Refresh analytics
   */
  useEffect(() => {
    if (state.status === "live" && state.sessionId) {
      const interval = setInterval(() => {
        const analytics = getAnalytics();
        if (analytics) {
          setState((prev) => ({
            ...prev,
            analytics,
            viewerCount: analytics.totalViewers,
            peakViewerCount: analytics.peakViewers,
          }));
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [state.status, state.sessionId, getAnalytics]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (bandwidthCheckRef.current) clearInterval(bandwidthCheckRef.current);
    };
  }, []);

  return {
    // State
    ...state,

    // Session Management
    initializeSession,
    startStream,
    endStream,
    pauseStream,
    resumeStream,

    // Quality
    updateQuality,
    checkBandwidth,

    // Interactivity
    sendMessage,
    createPoll,
    votePoll,
    sendReaction,
    sendSuperChat,

    // Recording
    startRecording,
    stopRecording,

    // Analytics
    getAnalytics,
  };
}
