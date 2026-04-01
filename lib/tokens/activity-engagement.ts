/**
 * Activity Engagement System
 * 
 * Comprehensive activity tracking and rewards for:
 * - Watching videos
 * - Playing games
 * - Teaching and learning
 * - Working and productivity
 * - Content creation
 * - Social engagement
 */

import { EventEmitter } from "events";
import { tokenRewardSystem, type ActivityType, type TokenType } from "./token-reward-system";

// ============================================================================
// Types
// ============================================================================

export type EngagementType =
  | "video"
  | "game"
  | "course"
  | "lesson"
  | "teaching-session"
  | "work-task"
  | "work-shift"
  | "content"
  | "social"
  | "community";

export type VideoCategory = 
  | "educational"
  | "entertainment"
  | "tutorial"
  | "motivational"
  | "news"
  | "documentary"
  | "product"
  | "review"
  | "live-stream";

export type GameCategory =
  | "puzzle"
  | "trivia"
  | "arcade"
  | "strategy"
  | "educational"
  | "casual"
  | "competitive"
  | "multiplayer";

export interface VideoSession {
  id: string;
  userId: string;
  walletId: string;
  videoId: string;
  videoTitle: string;
  category: VideoCategory;
  duration: number;        // Total video duration in seconds
  watchedSeconds: number;
  completionPercent: number;
  tokensEarned: number;
  piEquivalent: number;
  startedAt: Date;
  lastUpdatedAt: Date;
  completedAt?: Date;
}

export interface GameSession {
  id: string;
  userId: string;
  walletId: string;
  gameId: string;
  gameName: string;
  category: GameCategory;
  score: number;
  level: number;
  achievements: string[];
  playTimeMinutes: number;
  tokensEarned: number;
  piEquivalent: number;
  won: boolean;
  startedAt: Date;
  endedAt?: Date;
}

export interface LearningSession {
  id: string;
  userId: string;
  walletId: string;
  type: "course" | "lesson" | "tutorial" | "quiz";
  contentId: string;
  contentTitle: string;
  category: string;
  progressPercent: number;
  quizScore?: number;
  timeSpentMinutes: number;
  tokensEarned: number;
  piEquivalent: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface TeachingSession {
  id: string;
  teacherId: string;
  teacherWalletId: string;
  sessionType: "live" | "recorded" | "mentoring" | "workshop";
  title: string;
  category: string;
  studentCount: number;
  duration: number;         // Minutes
  rating: number;
  tokensEarned: number;
  piEquivalent: number;
  startedAt: Date;
  endedAt?: Date;
}

export interface WorkSession {
  id: string;
  employeeId: string;
  employeeWalletId: string;
  employerId: string;
  employerWalletId?: string;
  taskType: "task" | "shift" | "project" | "milestone";
  taskId: string;
  taskTitle: string;
  hoursWorked: number;
  tokensEarned: number;
  bonusTokens: number;
  piEquivalent: number;
  approved: boolean;
  startedAt: Date;
  completedAt?: Date;
}

export interface ContentEngagement {
  id: string;
  userId: string;
  walletId: string;
  contentType: "post" | "article" | "video" | "image" | "poll";
  contentId: string;
  engagementType: "create" | "like" | "comment" | "share" | "view";
  tokensEarned: number;
  piEquivalent: number;
  timestamp: Date;
}

export interface SocialAction {
  id: string;
  userId: string;
  walletId: string;
  actionType: "refer" | "invite" | "help" | "review" | "survey";
  targetId?: string;
  description: string;
  tokensEarned: number;
  piEquivalent: number;
  verified: boolean;
  timestamp: Date;
}

export interface DailyStreak {
  userId: string;
  walletId: string;
  currentStreak: number;
  longestStreak: number;
  lastCheckIn: Date;
  totalCheckIns: number;
  streakBonusEarned: number;
}

// ============================================================================
// Activity Engagement Manager
// ============================================================================

class ActivityEngagementManager extends EventEmitter {
  private static instance: ActivityEngagementManager;
  
  private videoSessions: Map<string, VideoSession> = new Map();
  private gameSessions: Map<string, GameSession> = new Map();
  private learningSessions: Map<string, LearningSession> = new Map();
  private teachingSessions: Map<string, TeachingSession> = new Map();
  private workSessions: Map<string, WorkSession> = new Map();
  private contentEngagements: Map<string, ContentEngagement> = new Map();
  private socialActions: Map<string, SocialAction> = new Map();
  private dailyStreaks: Map<string, DailyStreak> = new Map();
  
  // User session tracking
  private activeVideoSessions: Map<string, string> = new Map(); // userId -> sessionId
  private activeGameSessions: Map<string, string> = new Map();
  
  private constructor() {
    super();
    this.setMaxListeners(100);
  }
  
  static getInstance(): ActivityEngagementManager {
    if (!ActivityEngagementManager.instance) {
      ActivityEngagementManager.instance = new ActivityEngagementManager();
    }
    return ActivityEngagementManager.instance;
  }
  
  // ==========================================================================
  // Video Engagement
  // ==========================================================================
  
  /**
   * Start watching a video
   */
  startVideo(params: {
    userId: string;
    walletId: string;
    videoId: string;
    videoTitle: string;
    category: VideoCategory;
    duration: number;
  }): VideoSession {
    // End any active video session
    const activeId = this.activeVideoSessions.get(params.userId);
    if (activeId) {
      this.endVideo(activeId);
    }
    
    const id = `video-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const session: VideoSession = {
      id,
      userId: params.userId,
      walletId: params.walletId,
      videoId: params.videoId,
      videoTitle: params.videoTitle,
      category: params.category,
      duration: params.duration,
      watchedSeconds: 0,
      completionPercent: 0,
      tokensEarned: 0,
      piEquivalent: 0,
      startedAt: now,
      lastUpdatedAt: now,
    };
    
    this.videoSessions.set(id, session);
    this.activeVideoSessions.set(params.userId, id);
    
    this.emit("video-started", { session });
    return session;
  }
  
  /**
   * Update video progress
   */
  updateVideoProgress(sessionId: string, watchedSeconds: number): VideoSession {
    const session = this.videoSessions.get(sessionId);
    if (!session) throw new Error("Video session not found");
    
    const previousWatched = session.watchedSeconds;
    session.watchedSeconds = Math.min(watchedSeconds, session.duration);
    session.completionPercent = (session.watchedSeconds / session.duration) * 100;
    session.lastUpdatedAt = new Date();
    
    // Reward every 60 seconds watched
    const previousMinutes = Math.floor(previousWatched / 60);
    const currentMinutes = Math.floor(session.watchedSeconds / 60);
    
    if (currentMinutes > previousMinutes) {
      const reward = tokenRewardSystem.rewardActivity({
        walletId: session.walletId,
        activityType: "video-watch",
        activityId: sessionId,
        multiplier: session.category === "educational" ? 1.5 : 1,
      });
      
      if (reward) {
        session.tokensEarned += reward.amount;
        session.piEquivalent += reward.piEquivalent;
      }
    }
    
    this.emit("video-progress", { session });
    return session;
  }
  
  /**
   * End video session
   */
  endVideo(sessionId: string): VideoSession {
    const session = this.videoSessions.get(sessionId);
    if (!session) throw new Error("Video session not found");
    
    session.completedAt = new Date();
    this.activeVideoSessions.delete(session.userId);
    
    // Completion bonus if watched > 90%
    if (session.completionPercent >= 90) {
      const reward = tokenRewardSystem.rewardActivity({
        walletId: session.walletId,
        activityType: "video-complete",
        activityId: sessionId,
        multiplier: session.category === "educational" ? 2 : 1,
      });
      
      if (reward) {
        session.tokensEarned += reward.amount;
        session.piEquivalent += reward.piEquivalent;
      }
    }
    
    this.emit("video-ended", { session });
    return session;
  }
  
  // ==========================================================================
  // Game Engagement
  // ==========================================================================
  
  /**
   * Start a game session
   */
  startGame(params: {
    userId: string;
    walletId: string;
    gameId: string;
    gameName: string;
    category: GameCategory;
  }): GameSession {
    const id = `game-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const session: GameSession = {
      id,
      userId: params.userId,
      walletId: params.walletId,
      gameId: params.gameId,
      gameName: params.gameName,
      category: params.category,
      score: 0,
      level: 1,
      achievements: [],
      playTimeMinutes: 0,
      tokensEarned: 0,
      piEquivalent: 0,
      won: false,
      startedAt: now,
    };
    
    this.gameSessions.set(id, session);
    this.activeGameSessions.set(params.userId, id);
    
    // Initial reward for playing
    const reward = tokenRewardSystem.rewardActivity({
      walletId: params.walletId,
      activityType: "game-play",
      activityId: id,
    });
    
    if (reward) {
      session.tokensEarned += reward.amount;
      session.piEquivalent += reward.piEquivalent;
    }
    
    this.emit("game-started", { session });
    return session;
  }
  
  /**
   * Update game progress
   */
  updateGameProgress(sessionId: string, updates: {
    score?: number;
    level?: number;
    achievements?: string[];
  }): GameSession {
    const session = this.gameSessions.get(sessionId);
    if (!session) throw new Error("Game session not found");
    
    const previousLevel = session.level;
    
    if (updates.score !== undefined) session.score = updates.score;
    if (updates.level !== undefined) session.level = updates.level;
    
    // Reward for new achievements
    if (updates.achievements) {
      const newAchievements = updates.achievements.filter(a => !session.achievements.includes(a));
      for (const achievement of newAchievements) {
        session.achievements.push(achievement);
        
        const reward = tokenRewardSystem.rewardActivity({
          walletId: session.walletId,
          activityType: "game-achievement",
          activityId: `${sessionId}-${achievement}`,
        });
        
        if (reward) {
          session.tokensEarned += reward.amount;
          session.piEquivalent += reward.piEquivalent;
        }
      }
    }
    
    // Level up bonus
    if (session.level > previousLevel) {
      const levelBonus = (session.level - previousLevel) * 10;
      const wallet = tokenRewardSystem.getWallet(session.walletId);
      if (wallet) {
        const tx = tokenRewardSystem.mintTokens({
          toWalletId: session.walletId,
          tokenType: "PLAY",
          amount: levelBonus,
          activityType: "game-play",
          activityId: sessionId,
          description: `Level ${session.level} reached`,
        });
        session.tokensEarned += tx.amount;
        session.piEquivalent += tx.piEquivalent;
      }
    }
    
    this.emit("game-progress", { session });
    return session;
  }
  
  /**
   * End game session
   */
  endGame(sessionId: string, won: boolean): GameSession {
    const session = this.gameSessions.get(sessionId);
    if (!session) throw new Error("Game session not found");
    
    const now = new Date();
    session.endedAt = now;
    session.won = won;
    session.playTimeMinutes = Math.floor((now.getTime() - session.startedAt.getTime()) / 60000);
    
    this.activeGameSessions.delete(session.userId);
    
    // Win reward
    if (won) {
      const reward = tokenRewardSystem.rewardActivity({
        walletId: session.walletId,
        activityType: "game-win",
        activityId: sessionId,
        multiplier: session.category === "competitive" ? 2 : 1,
      });
      
      if (reward) {
        session.tokensEarned += reward.amount;
        session.piEquivalent += reward.piEquivalent;
      }
    }
    
    this.emit("game-ended", { session, won });
    return session;
  }
  
  // ==========================================================================
  // Learning Engagement
  // ==========================================================================
  
  /**
   * Start a learning session
   */
  startLearning(params: {
    userId: string;
    walletId: string;
    type: LearningSession["type"];
    contentId: string;
    contentTitle: string;
    category: string;
  }): LearningSession {
    const id = `learn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const session: LearningSession = {
      id,
      userId: params.userId,
      walletId: params.walletId,
      type: params.type,
      contentId: params.contentId,
      contentTitle: params.contentTitle,
      category: params.category,
      progressPercent: 0,
      timeSpentMinutes: 0,
      tokensEarned: 0,
      piEquivalent: 0,
      startedAt: now,
    };
    
    this.learningSessions.set(id, session);
    this.emit("learning-started", { session });
    return session;
  }
  
  /**
   * Update learning progress
   */
  updateLearningProgress(sessionId: string, progressPercent: number, quizScore?: number): LearningSession {
    const session = this.learningSessions.get(sessionId);
    if (!session) throw new Error("Learning session not found");
    
    const previousProgress = session.progressPercent;
    session.progressPercent = Math.min(100, progressPercent);
    session.quizScore = quizScore;
    session.timeSpentMinutes = Math.floor(
      (Date.now() - session.startedAt.getTime()) / 60000
    );
    
    // Milestone rewards at 25%, 50%, 75%
    const milestones = [25, 50, 75];
    for (const milestone of milestones) {
      if (previousProgress < milestone && session.progressPercent >= milestone) {
        const reward = tokenRewardSystem.rewardActivity({
          walletId: session.walletId,
          activityType: "lesson-complete",
          activityId: `${sessionId}-${milestone}`,
          multiplier: 0.25,
        });
        
        if (reward) {
          session.tokensEarned += reward.amount;
          session.piEquivalent += reward.piEquivalent;
        }
      }
    }
    
    return session;
  }
  
  /**
   * Complete learning session
   */
  completeLearning(sessionId: string): LearningSession {
    const session = this.learningSessions.get(sessionId);
    if (!session) throw new Error("Learning session not found");
    
    session.completedAt = new Date();
    session.progressPercent = 100;
    session.timeSpentMinutes = Math.floor(
      (session.completedAt.getTime() - session.startedAt.getTime()) / 60000
    );
    
    // Completion reward
    const activityType: ActivityType = session.type === "course" ? "course-complete" : "lesson-complete";
    const multiplier = session.quizScore && session.quizScore >= 80 ? 1.5 : 1;
    
    const reward = tokenRewardSystem.rewardActivity({
      walletId: session.walletId,
      activityType,
      activityId: sessionId,
      multiplier,
    });
    
    if (reward) {
      session.tokensEarned += reward.amount;
      session.piEquivalent += reward.piEquivalent;
    }
    
    this.emit("learning-completed", { session });
    return session;
  }
  
  // ==========================================================================
  // Teaching Engagement
  // ==========================================================================
  
  /**
   * Start a teaching session
   */
  startTeaching(params: {
    teacherId: string;
    teacherWalletId: string;
    sessionType: TeachingSession["sessionType"];
    title: string;
    category: string;
  }): TeachingSession {
    const id = `teach-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const session: TeachingSession = {
      id,
      teacherId: params.teacherId,
      teacherWalletId: params.teacherWalletId,
      sessionType: params.sessionType,
      title: params.title,
      category: params.category,
      studentCount: 0,
      duration: 0,
      rating: 0,
      tokensEarned: 0,
      piEquivalent: 0,
      startedAt: now,
    };
    
    this.teachingSessions.set(id, session);
    this.emit("teaching-started", { session });
    return session;
  }
  
  /**
   * Add student to teaching session
   */
  addStudent(sessionId: string): TeachingSession {
    const session = this.teachingSessions.get(sessionId);
    if (!session) throw new Error("Teaching session not found");
    
    session.studentCount++;
    
    // Bonus for increased attendance
    if (session.studentCount % 5 === 0) {
      const bonus = tokenRewardSystem.mintTokens({
        toWalletId: session.teacherWalletId,
        tokenType: "TEACH",
        amount: 25,
        description: `Milestone: ${session.studentCount} students`,
      });
      session.tokensEarned += bonus.amount;
      session.piEquivalent += bonus.piEquivalent;
    }
    
    return session;
  }
  
  /**
   * End teaching session
   */
  endTeaching(sessionId: string, rating: number): TeachingSession {
    const session = this.teachingSessions.get(sessionId);
    if (!session) throw new Error("Teaching session not found");
    
    const now = new Date();
    session.endedAt = now;
    session.duration = Math.floor((now.getTime() - session.startedAt.getTime()) / 60000);
    session.rating = Math.min(5, Math.max(0, rating));
    
    // Base reward
    const activityType: ActivityType = session.sessionType === "mentoring" ? "mentoring" : "teaching";
    const multiplier = session.rating >= 4 ? 1.5 : session.rating >= 3 ? 1.2 : 1;
    
    const reward = tokenRewardSystem.rewardActivity({
      walletId: session.teacherWalletId,
      activityType,
      activityId: sessionId,
      multiplier: multiplier * (1 + session.studentCount * 0.1),
    });
    
    if (reward) {
      session.tokensEarned += reward.amount;
      session.piEquivalent += reward.piEquivalent;
    }
    
    this.emit("teaching-ended", { session });
    return session;
  }
  
  // ==========================================================================
  // Work Engagement
  // ==========================================================================
  
  /**
   * Start a work session
   */
  startWork(params: {
    employeeId: string;
    employeeWalletId: string;
    employerId: string;
    employerWalletId?: string;
    taskType: WorkSession["taskType"];
    taskId: string;
    taskTitle: string;
  }): WorkSession {
    const id = `work-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const session: WorkSession = {
      id,
      employeeId: params.employeeId,
      employeeWalletId: params.employeeWalletId,
      employerId: params.employerId,
      employerWalletId: params.employerWalletId,
      taskType: params.taskType,
      taskId: params.taskId,
      taskTitle: params.taskTitle,
      hoursWorked: 0,
      tokensEarned: 0,
      bonusTokens: 0,
      piEquivalent: 0,
      approved: false,
      startedAt: now,
    };
    
    this.workSessions.set(id, session);
    this.emit("work-started", { session });
    return session;
  }
  
  /**
   * Complete work session
   */
  completeWork(sessionId: string, approved: boolean = true): WorkSession {
    const session = this.workSessions.get(sessionId);
    if (!session) throw new Error("Work session not found");
    
    const now = new Date();
    session.completedAt = now;
    session.hoursWorked = (now.getTime() - session.startedAt.getTime()) / 3600000;
    session.approved = approved;
    
    if (approved) {
      // Determine activity type
      let activityType: ActivityType;
      switch (session.taskType) {
        case "shift":
          activityType = "work-shift";
          break;
        case "milestone":
          activityType = "work-milestone";
          break;
        default:
          activityType = "work-task";
      }
      
      const reward = tokenRewardSystem.rewardActivity({
        walletId: session.employeeWalletId,
        activityType,
        activityId: sessionId,
        multiplier: 1 + Math.min(session.hoursWorked * 0.1, 1),
      });
      
      if (reward) {
        session.tokensEarned += reward.amount;
        session.piEquivalent += reward.piEquivalent;
      }
    }
    
    this.emit("work-completed", { session });
    return session;
  }
  
  /**
   * Award bonus to employee
   */
  awardBonus(sessionId: string, bonusTokens: number, tokenType: TokenType = "WORK"): WorkSession {
    const session = this.workSessions.get(sessionId);
    if (!session) throw new Error("Work session not found");
    
    const tx = tokenRewardSystem.mintTokens({
      toWalletId: session.employeeWalletId,
      tokenType,
      amount: bonusTokens,
      description: `Bonus for: ${session.taskTitle}`,
    });
    
    session.bonusTokens += bonusTokens;
    session.tokensEarned += tx.amount;
    session.piEquivalent += tx.piEquivalent;
    
    this.emit("bonus-awarded", { session, bonus: bonusTokens });
    return session;
  }
  
  // ==========================================================================
  // Content Engagement
  // ==========================================================================
  
  /**
   * Record content engagement
   */
  recordContentEngagement(params: {
    userId: string;
    walletId: string;
    contentType: ContentEngagement["contentType"];
    contentId: string;
    engagementType: ContentEngagement["engagementType"];
  }): ContentEngagement {
    const id = `content-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    let activityType: ActivityType;
    switch (params.engagementType) {
      case "create":
        activityType = "content-create";
        break;
      case "share":
        activityType = "social-share";
        break;
      default:
        activityType = "content-engage";
    }
    
    const reward = tokenRewardSystem.rewardActivity({
      walletId: params.walletId,
      activityType,
      activityId: params.contentId,
    });
    
    const engagement: ContentEngagement = {
      id,
      userId: params.userId,
      walletId: params.walletId,
      contentType: params.contentType,
      contentId: params.contentId,
      engagementType: params.engagementType,
      tokensEarned: reward?.amount || 0,
      piEquivalent: reward?.piEquivalent || 0,
      timestamp: new Date(),
    };
    
    this.contentEngagements.set(id, engagement);
    this.emit("content-engaged", { engagement });
    return engagement;
  }
  
  // ==========================================================================
  // Social Actions
  // ==========================================================================
  
  /**
   * Record social action
   */
  recordSocialAction(params: {
    userId: string;
    walletId: string;
    actionType: SocialAction["actionType"];
    targetId?: string;
    description: string;
  }): SocialAction {
    const id = `social-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    let activityType: ActivityType;
    switch (params.actionType) {
      case "refer":
        activityType = "social-refer";
        break;
      case "help":
        activityType = "community-help";
        break;
      case "review":
        activityType = "review";
        break;
      case "survey":
        activityType = "survey-complete";
        break;
      default:
        activityType = "social-share";
    }
    
    const reward = tokenRewardSystem.rewardActivity({
      walletId: params.walletId,
      activityType,
      activityId: params.targetId || id,
    });
    
    const action: SocialAction = {
      id,
      userId: params.userId,
      walletId: params.walletId,
      actionType: params.actionType,
      targetId: params.targetId,
      description: params.description,
      tokensEarned: reward?.amount || 0,
      piEquivalent: reward?.piEquivalent || 0,
      verified: params.actionType !== "refer", // Referrals need verification
      timestamp: new Date(),
    };
    
    this.socialActions.set(id, action);
    this.emit("social-action", { action });
    return action;
  }
  
  /**
   * Verify referral
   */
  verifyReferral(actionId: string): SocialAction {
    const action = this.socialActions.get(actionId);
    if (!action) throw new Error("Social action not found");
    
    if (action.actionType !== "refer") {
      throw new Error("Only referrals can be verified");
    }
    
    if (!action.verified) {
      action.verified = true;
      
      // Additional bonus for verified referral
      const bonus = tokenRewardSystem.mintTokens({
        toWalletId: action.walletId,
        tokenType: "SOCIAL",
        amount: 250,
        description: "Verified referral bonus",
      });
      
      action.tokensEarned += bonus.amount;
      action.piEquivalent += bonus.piEquivalent;
    }
    
    return action;
  }
  
  // ==========================================================================
  // Daily Streaks
  // ==========================================================================
  
  /**
   * Check in for daily streak
   */
  dailyCheckIn(userId: string, walletId: string): { streak: DailyStreak; reward: number } {
    let streak = this.dailyStreaks.get(userId);
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    
    if (!streak) {
      streak = {
        userId,
        walletId,
        currentStreak: 0,
        longestStreak: 0,
        lastCheckIn: new Date(0),
        totalCheckIns: 0,
        streakBonusEarned: 0,
      };
      this.dailyStreaks.set(userId, streak);
    }
    
    const lastCheckInDate = streak.lastCheckIn.toISOString().split("T")[0];
    
    if (lastCheckInDate === today) {
      // Already checked in today
      return { streak, reward: 0 };
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    
    // Update streak
    if (lastCheckInDate === yesterdayStr) {
      streak.currentStreak++;
    } else {
      streak.currentStreak = 1;
    }
    
    streak.lastCheckIn = now;
    streak.totalCheckIns++;
    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    
    // Daily login reward
    const loginReward = tokenRewardSystem.rewardActivity({
      walletId,
      activityType: "daily-login",
    });
    
    let totalReward = loginReward?.amount || 0;
    
    // Streak bonus (every 7 days)
    if (streak.currentStreak % 7 === 0) {
      const streakBonus = tokenRewardSystem.rewardActivity({
        walletId,
        activityType: "streak-bonus",
        multiplier: streak.currentStreak / 7,
      });
      
      if (streakBonus) {
        totalReward += streakBonus.amount;
        streak.streakBonusEarned += streakBonus.amount;
      }
    }
    
    this.emit("daily-check-in", { streak, reward: totalReward });
    return { streak, reward: totalReward };
  }
  
  /**
   * Get daily streak
   */
  getStreak(userId: string): DailyStreak | undefined {
    return this.dailyStreaks.get(userId);
  }
  
  // ==========================================================================
  // Queries
  // ==========================================================================
  
  /**
   * Get user's engagement summary
   */
  getUserSummary(userId: string): {
    videoMinutes: number;
    gamesPlayed: number;
    lessonsCompleted: number;
    hoursWorked: number;
    totalTokensEarned: number;
    totalPiEquivalent: number;
    currentStreak: number;
  } {
    let videoMinutes = 0;
    let gamesPlayed = 0;
    let lessonsCompleted = 0;
    let hoursWorked = 0;
    let totalTokensEarned = 0;
    let totalPiEquivalent = 0;
    
    for (const session of this.videoSessions.values()) {
      if (session.userId === userId) {
        videoMinutes += Math.floor(session.watchedSeconds / 60);
        totalTokensEarned += session.tokensEarned;
        totalPiEquivalent += session.piEquivalent;
      }
    }
    
    for (const session of this.gameSessions.values()) {
      if (session.userId === userId) {
        gamesPlayed++;
        totalTokensEarned += session.tokensEarned;
        totalPiEquivalent += session.piEquivalent;
      }
    }
    
    for (const session of this.learningSessions.values()) {
      if (session.userId === userId && session.completedAt) {
        lessonsCompleted++;
        totalTokensEarned += session.tokensEarned;
        totalPiEquivalent += session.piEquivalent;
      }
    }
    
    for (const session of this.workSessions.values()) {
      if (session.employeeId === userId) {
        hoursWorked += session.hoursWorked;
        totalTokensEarned += session.tokensEarned;
        totalPiEquivalent += session.piEquivalent;
      }
    }
    
    const streak = this.dailyStreaks.get(userId);
    
    return {
      videoMinutes,
      gamesPlayed,
      lessonsCompleted,
      hoursWorked,
      totalTokensEarned,
      totalPiEquivalent,
      currentStreak: streak?.currentStreak || 0,
    };
  }
  
  /**
   * Get statistics
   */
  getStatistics(): {
    totalVideoSessions: number;
    totalGameSessions: number;
    totalLearningSessions: number;
    totalTeachingSessions: number;
    totalWorkSessions: number;
    totalTokensDistributed: number;
  } {
    let totalTokensDistributed = 0;
    
    for (const s of this.videoSessions.values()) totalTokensDistributed += s.tokensEarned;
    for (const s of this.gameSessions.values()) totalTokensDistributed += s.tokensEarned;
    for (const s of this.learningSessions.values()) totalTokensDistributed += s.tokensEarned;
    for (const s of this.teachingSessions.values()) totalTokensDistributed += s.tokensEarned;
    for (const s of this.workSessions.values()) totalTokensDistributed += s.tokensEarned;
    for (const e of this.contentEngagements.values()) totalTokensDistributed += e.tokensEarned;
    for (const a of this.socialActions.values()) totalTokensDistributed += a.tokensEarned;
    
    return {
      totalVideoSessions: this.videoSessions.size,
      totalGameSessions: this.gameSessions.size,
      totalLearningSessions: this.learningSessions.size,
      totalTeachingSessions: this.teachingSessions.size,
      totalWorkSessions: this.workSessions.size,
      totalTokensDistributed,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const activityEngagement = ActivityEngagementManager.getInstance();

export { ActivityEngagementManager };
