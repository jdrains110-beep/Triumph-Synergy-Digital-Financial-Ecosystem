/**
 * Triumph Synergy - Global Entertainment & Education Streaming Hub
 * 
 * Superior streaming platform hub for:
 * - Colleges & Universities
 * - Professional content creators
 * - Sports & Athletics
 * - STEM Instructors teaching kids
 * - Entertainment industry
 * 
 * @module lib/streaming-sdk/entertainment-hub
 * @version 1.0.0
 */

// ============================================================================
// CONSTANTS - DUAL PI VALUE SYSTEM
// ============================================================================

const PI_EXTERNAL_RATE = 314.159;
const PI_INTERNAL_RATE = 314159;
const PI_INTERNAL_MULTIPLIER = 1000;

export type PiValueType = "internal" | "external";

export function getPiRate(type: PiValueType = "external"): number {
  return type === "internal" ? PI_INTERNAL_RATE : PI_EXTERNAL_RATE;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type CreatorCategory = 
  | "college"
  | "university"
  | "professional"
  | "sports"
  | "stem-education"
  | "entertainment"
  | "music"
  | "gaming"
  | "fitness"
  | "cooking"
  | "arts"
  | "business"
  | "tech"
  | "lifestyle";

export type CreatorTier = "starter" | "creator" | "professional" | "enterprise" | "institution";
export type CreatorStatus = "pending" | "active" | "suspended" | "verified" | "premium";

export type ContentRating = "all-ages" | "kids" | "teens" | "mature" | "educational";
export type AudienceType = "public" | "subscribers" | "members" | "students" | "private";

export interface StreamCreator {
  id: string;
  userId: string;
  
  // Profile
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  website: string | null;
  socialLinks: SocialLink[];
  
  // Category & Verification
  category: CreatorCategory;
  subcategories: string[];
  verified: boolean;
  verifiedType: "individual" | "organization" | "institution" | "celebrity" | null;
  
  // Subscription
  subscriptionTier: CreatorTier;
  subscriptionStatus: CreatorStatus;
  subscriptionStartDate: Date;
  subscriptionEndDate: Date;
  monthlyFee: number;
  monthlyFeeInPi: number;
  
  // Revenue
  revenueShare: number;
  piRevenueBonus: number;
  totalEarnings: number;
  totalPiEarnings: number;
  monthlyEarnings: number;
  
  // Audience
  subscribers: number;
  followers: number;
  totalViews: number;
  avgViewDuration: number;
  
  // Content
  totalVideos: number;
  totalLiveStreams: number;
  totalCourses: number;
  
  // For Educational Creators
  isEducator: boolean;
  educatorCredentials: EducatorCredentials | null;
  courses: Course[];
  students: number;
  
  // For Sports/Colleges
  institutionId: string | null;
  teamId: string | null;
  athleteProfile: AthleteProfile | null;
  
  // Monetization
  monetizationEnabled: boolean;
  adsEnabled: boolean;
  tipsEnabled: boolean;
  subscriptionTiersEnabled: boolean;
  merchandiseEnabled: boolean;
  piPaymentsEnabled: boolean;
  
  // Analytics Access
  analyticsLevel: "basic" | "advanced" | "enterprise";
  apiAccess: boolean;
  
  createdAt: Date;
  lastStreamAt: Date | null;
}

export interface SocialLink {
  platform: string;
  url: string;
  verified: boolean;
}

export interface EducatorCredentials {
  type: "teacher" | "professor" | "instructor" | "coach" | "tutor";
  institution: string | null;
  degrees: string[];
  certifications: string[];
  yearsExperience: number;
  subjectAreas: string[];
  ageGroupsFocus: ("kids" | "teens" | "adults" | "seniors")[];
  backgroundCheckVerified: boolean;
  teachingLicense: string | null;
}

export interface Course {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced" | "all-levels";
  ageGroup: "kids" | "teens" | "adults" | "all-ages";
  
  // Content
  modules: CourseModule[];
  totalDuration: number;
  totalLessons: number;
  
  // Pricing
  price: number;
  priceInPi: number;
  isFree: boolean;
  
  // Stats
  enrollments: number;
  completionRate: number;
  rating: number;
  reviews: number;
  
  // Status
  published: boolean;
  publishedAt: Date | null;
  
  // STEM Specific
  isSTEM: boolean;
  stemSubject: string | null;
  learningObjectives: string[];
  prerequisites: string[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  quizzes: Quiz[];
  duration: number;
  order: number;
}

export interface Lesson {
  id: string;
  title: string;
  type: "video" | "live" | "article" | "interactive" | "project";
  duration: number;
  contentUrl: string | null;
  isPreview: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  questions: number;
  passingScore: number;
}

export interface AthleteProfile {
  sport: string;
  position: string;
  team: string;
  league: string;
  stats: Record<string, number>;
  achievements: string[];
  endorsements: string[];
}

export interface CreatorSubscriptionPlan {
  tier: CreatorTier;
  name: string;
  monthlyPrice: number;
  monthlyPriceInPi: number;
  annualPrice: number;
  annualPriceInPi: number;
  revenueShare: number;
  piBonus: number;
  features: string[];
  maxMonthlyUploads: number | "unlimited";
  maxLiveStreamHours: number | "unlimited";
  maxCourses: number | "unlimited";
  storageGB: number | "unlimited";
  analyticsLevel: "basic" | "advanced" | "enterprise";
  apiAccess: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
}

export interface ViewerSubscription {
  id: string;
  viewerId: string;
  creatorId: string;
  tier: "free" | "supporter" | "member" | "vip";
  price: number;
  priceInPi: number;
  startDate: Date;
  renewDate: Date;
  status: "active" | "cancelled" | "expired";
  benefits: string[];
}

export interface StreamContent {
  id: string;
  creatorId: string;
  type: "video" | "live" | "short" | "podcast" | "course-lesson";
  title: string;
  description: string;
  thumbnailUrl: string;
  contentUrl: string | null;
  duration: number;
  
  // Categorization
  category: CreatorCategory;
  tags: string[];
  contentRating: ContentRating;
  audienceType: AudienceType;
  
  // Stats
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTime: number;
  
  // Monetization
  monetized: boolean;
  adRevenue: number;
  tipRevenue: number;
  piRevenue: number;
  
  // Status
  status: "processing" | "published" | "scheduled" | "private" | "deleted";
  publishedAt: Date | null;
  scheduledAt: Date | null;
  
  // Educational
  courseId: string | null;
  lessonNumber: number | null;
  isEducational: boolean;
  
  createdAt: Date;
}

// ============================================================================
// ENTERTAINMENT HUB CLASS
// ============================================================================

class EntertainmentHub {
  private creators: Map<string, StreamCreator> = new Map();
  private content: Map<string, StreamContent> = new Map();
  private courses: Map<string, Course> = new Map();
  private viewerSubscriptions: Map<string, ViewerSubscription> = new Map();
  private institutions: Map<string, Institution> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Initialize sample institutions
    this.institutions.set("inst-1", {
      id: "inst-1",
      name: "Triumph University",
      type: "university",
      verified: true,
      channels: [],
      students: 25000,
      streamingEnabled: true,
    });
  }

  // ==========================================================================
  // CREATOR SUBSCRIPTION PLANS
  // ==========================================================================

  getCreatorSubscriptionPlans(): CreatorSubscriptionPlan[] {
    return [
      {
        tier: "starter",
        name: "Starter Creator",
        monthlyPrice: 0,
        monthlyPriceInPi: 0,
        annualPrice: 0,
        annualPriceInPi: 0,
        revenueShare: 0.55,
        piBonus: 0.02,
        features: [
          "Upload up to 10 videos/month",
          "Basic analytics",
          "Community tab",
          "Tips enabled",
          "Pi payments accepted",
          "Standard quality streaming",
        ],
        maxMonthlyUploads: 10,
        maxLiveStreamHours: 10,
        maxCourses: 1,
        storageGB: 10,
        analyticsLevel: "basic",
        apiAccess: false,
        prioritySupport: false,
        customBranding: false,
      },
      {
        tier: "creator",
        name: "Content Creator",
        monthlyPrice: 29,
        monthlyPriceInPi: 29 / PI_EXTERNAL_RATE,
        annualPrice: 279,
        annualPriceInPi: 279 / PI_EXTERNAL_RATE,
        revenueShare: 0.65,
        piBonus: 0.03,
        features: [
          "Unlimited video uploads",
          "Advanced analytics",
          "Subscriber tiers",
          "Custom thumbnails",
          "HD streaming (1080p)",
          "Scheduled publishing",
          "Priority upload processing",
          "Merchandise integration",
        ],
        maxMonthlyUploads: "unlimited",
        maxLiveStreamHours: 50,
        maxCourses: 5,
        storageGB: 100,
        analyticsLevel: "advanced",
        apiAccess: false,
        prioritySupport: false,
        customBranding: false,
      },
      {
        tier: "professional",
        name: "Professional",
        monthlyPrice: 99,
        monthlyPriceInPi: 99 / PI_EXTERNAL_RATE,
        annualPrice: 950,
        annualPriceInPi: 950 / PI_EXTERNAL_RATE,
        revenueShare: 0.75,
        piBonus: 0.04,
        features: [
          "All Creator features",
          "4K streaming",
          "Multi-camera support",
          "Custom player branding",
          "API access",
          "Priority support",
          "Verified badge eligibility",
          "Course creation tools",
          "Student management",
          "Certificate generation",
          "Exclusive Pi bonuses",
        ],
        maxMonthlyUploads: "unlimited",
        maxLiveStreamHours: "unlimited",
        maxCourses: 25,
        storageGB: 500,
        analyticsLevel: "enterprise",
        apiAccess: true,
        prioritySupport: true,
        customBranding: true,
      },
      {
        tier: "enterprise",
        name: "Enterprise / Sports",
        monthlyPrice: 499,
        monthlyPriceInPi: 499 / PI_EXTERNAL_RATE,
        annualPrice: 4790,
        annualPriceInPi: 4790 / PI_EXTERNAL_RATE,
        revenueShare: 0.80,
        piBonus: 0.05,
        features: [
          "All Professional features",
          "Unlimited everything",
          "Multiple team channels",
          "Live sports broadcasting",
          "PPV event support",
          "Dedicated account manager",
          "Custom integrations",
          "White-label options",
          "Sponsorship integration",
          "Revenue analytics",
          "Team management",
        ],
        maxMonthlyUploads: "unlimited",
        maxLiveStreamHours: "unlimited",
        maxCourses: "unlimited",
        storageGB: "unlimited",
        analyticsLevel: "enterprise",
        apiAccess: true,
        prioritySupport: true,
        customBranding: true,
      },
      {
        tier: "institution",
        name: "Institution / University",
        monthlyPrice: 1999,
        monthlyPriceInPi: 1999 / PI_EXTERNAL_RATE,
        annualPrice: 19190,
        annualPriceInPi: 19190 / PI_EXTERNAL_RATE,
        revenueShare: 0.85,
        piBonus: 0.06,
        features: [
          "All Enterprise features",
          "Unlimited faculty channels",
          "Student portal integration",
          "LMS integration",
          "Athletic department tools",
          "Campus-wide streaming",
          "Graduation ceremonies",
          "Research presentation tools",
          "Alumni engagement",
          "Donor recognition",
          "Pi scholarship programs",
          "STEM outreach tools",
        ],
        maxMonthlyUploads: "unlimited",
        maxLiveStreamHours: "unlimited",
        maxCourses: "unlimited",
        storageGB: "unlimited",
        analyticsLevel: "enterprise",
        apiAccess: true,
        prioritySupport: true,
        customBranding: true,
      },
    ];
  }

  // ==========================================================================
  // CREATOR MANAGEMENT
  // ==========================================================================

  async registerCreator(data: {
    userId: string;
    displayName: string;
    username: string;
    bio: string;
    category: CreatorCategory;
    subcategories?: string[];
    subscriptionTier: CreatorTier;
    isEducator?: boolean;
    educatorCredentials?: EducatorCredentials;
    institutionId?: string;
    payWithPi?: boolean;
  }): Promise<StreamCreator> {
    const id = `creator-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const plans = this.getCreatorSubscriptionPlans();
    const plan = plans.find((p) => p.tier === data.subscriptionTier)!;

    const creator: StreamCreator = {
      id,
      userId: data.userId,
      displayName: data.displayName,
      username: data.username,
      bio: data.bio,
      avatarUrl: "",
      bannerUrl: "",
      website: null,
      socialLinks: [],
      category: data.category,
      subcategories: data.subcategories || [],
      verified: false,
      verifiedType: null,
      subscriptionTier: data.subscriptionTier,
      subscriptionStatus: "active",
      subscriptionStartDate: new Date(),
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      monthlyFee: plan.monthlyPrice,
      monthlyFeeInPi: plan.monthlyPriceInPi,
      revenueShare: plan.revenueShare,
      piRevenueBonus: plan.piBonus,
      totalEarnings: 0,
      totalPiEarnings: 0,
      monthlyEarnings: 0,
      subscribers: 0,
      followers: 0,
      totalViews: 0,
      avgViewDuration: 0,
      totalVideos: 0,
      totalLiveStreams: 0,
      totalCourses: 0,
      isEducator: data.isEducator || false,
      educatorCredentials: data.educatorCredentials || null,
      courses: [],
      students: 0,
      institutionId: data.institutionId || null,
      teamId: null,
      athleteProfile: null,
      monetizationEnabled: plan.tier !== "starter",
      adsEnabled: plan.tier !== "starter",
      tipsEnabled: true,
      subscriptionTiersEnabled: plan.tier !== "starter",
      merchandiseEnabled: plan.tier !== "starter",
      piPaymentsEnabled: true,
      analyticsLevel: plan.analyticsLevel,
      apiAccess: plan.apiAccess,
      createdAt: new Date(),
      lastStreamAt: null,
    };

    this.creators.set(id, creator);
    return creator;
  }

  async getCreator(creatorId: string): Promise<StreamCreator | null> {
    return this.creators.get(creatorId) || null;
  }

  async getCreatorByUsername(username: string): Promise<StreamCreator | null> {
    return Array.from(this.creators.values()).find((c) => c.username === username) || null;
  }

  async listCreators(filters?: {
    category?: CreatorCategory;
    tier?: CreatorTier;
    isEducator?: boolean;
    verified?: boolean;
    limit?: number;
  }): Promise<StreamCreator[]> {
    let creators = Array.from(this.creators.values());

    if (filters?.category) {
      creators = creators.filter((c) => c.category === filters.category);
    }
    if (filters?.tier) {
      creators = creators.filter((c) => c.subscriptionTier === filters.tier);
    }
    if (filters?.isEducator !== undefined) {
      creators = creators.filter((c) => c.isEducator === filters.isEducator);
    }
    if (filters?.verified !== undefined) {
      creators = creators.filter((c) => c.verified === filters.verified);
    }
    if (filters?.limit) {
      creators = creators.slice(0, filters.limit);
    }

    return creators;
  }

  async upgradeCreator(creatorId: string, newTier: CreatorTier): Promise<StreamCreator> {
    const creator = this.creators.get(creatorId);
    if (!creator) {
      throw new Error("Creator not found");
    }

    const plans = this.getCreatorSubscriptionPlans();
    const plan = plans.find((p) => p.tier === newTier)!;

    creator.subscriptionTier = newTier;
    creator.monthlyFee = plan.monthlyPrice;
    creator.monthlyFeeInPi = plan.monthlyPriceInPi;
    creator.revenueShare = plan.revenueShare;
    creator.piRevenueBonus = plan.piBonus;
    creator.analyticsLevel = plan.analyticsLevel;
    creator.apiAccess = plan.apiAccess;
    creator.monetizationEnabled = plan.tier !== "starter";
    creator.subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return creator;
  }

  // ==========================================================================
  // STEM & EDUCATION - INSTRUCTOR TOOLS
  // ==========================================================================

  async registerEducator(data: {
    userId: string;
    displayName: string;
    username: string;
    bio: string;
    credentials: EducatorCredentials;
    subscriptionTier: CreatorTier;
  }): Promise<StreamCreator> {
    return this.registerCreator({
      ...data,
      category: "stem-education",
      isEducator: true,
      educatorCredentials: data.credentials,
    });
  }

  async createCourse(creatorId: string, courseData: {
    title: string;
    description: string;
    category: string;
    level: Course["level"];
    ageGroup: Course["ageGroup"];
    price: number;
    isFree?: boolean;
    isSTEM?: boolean;
    stemSubject?: string;
    learningObjectives: string[];
    prerequisites?: string[];
  }): Promise<Course> {
    const creator = this.creators.get(creatorId);
    if (!creator) {
      throw new Error("Creator not found");
    }

    const id = `course-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const course: Course = {
      id,
      creatorId,
      title: courseData.title,
      description: courseData.description,
      category: courseData.category,
      level: courseData.level,
      ageGroup: courseData.ageGroup,
      modules: [],
      totalDuration: 0,
      totalLessons: 0,
      price: courseData.price,
      priceInPi: courseData.price / PI_EXTERNAL_RATE,
      isFree: courseData.isFree || false,
      enrollments: 0,
      completionRate: 0,
      rating: 0,
      reviews: 0,
      published: false,
      publishedAt: null,
      isSTEM: courseData.isSTEM || false,
      stemSubject: courseData.stemSubject || null,
      learningObjectives: courseData.learningObjectives,
      prerequisites: courseData.prerequisites || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.courses.set(id, course);
    creator.courses.push(course);
    creator.totalCourses += 1;

    return course;
  }

  async getCourse(courseId: string): Promise<Course | null> {
    return this.courses.get(courseId) || null;
  }

  async searchCourses(filters: {
    category?: string;
    level?: Course["level"];
    ageGroup?: Course["ageGroup"];
    isSTEM?: boolean;
    isFree?: boolean;
    minRating?: number;
    searchTerm?: string;
  }): Promise<Course[]> {
    let courses = Array.from(this.courses.values()).filter((c) => c.published);

    if (filters.category) {
      courses = courses.filter((c) => c.category === filters.category);
    }
    if (filters.level) {
      courses = courses.filter((c) => c.level === filters.level);
    }
    if (filters.ageGroup) {
      courses = courses.filter((c) => c.ageGroup === filters.ageGroup);
    }
    if (filters.isSTEM !== undefined) {
      courses = courses.filter((c) => c.isSTEM === filters.isSTEM);
    }
    if (filters.isFree !== undefined) {
      courses = courses.filter((c) => c.isFree === filters.isFree);
    }
    if (filters.minRating) {
      courses = courses.filter((c) => c.rating >= filters.minRating!);
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      courses = courses.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          c.description.toLowerCase().includes(term)
      );
    }

    return courses;
  }

  async enrollInCourse(courseId: string, studentId: string, payWithPi = false): Promise<{
    success: boolean;
    enrollmentId: string;
    accessUntil: Date;
  }> {
    const course = this.courses.get(courseId);
    if (!course) {
      throw new Error("Course not found");
    }

    const enrollmentId = `enroll-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    course.enrollments += 1;

    const creator = this.creators.get(course.creatorId);
    if (creator) {
      creator.students += 1;
      if (!course.isFree) {
        const earnings = course.price * creator.revenueShare;
        const piBonus = payWithPi ? course.price * creator.piRevenueBonus : 0;
        creator.totalEarnings += earnings;
        creator.totalPiEarnings += piBonus;
        creator.monthlyEarnings += earnings;
      }
    }

    return {
      success: true,
      enrollmentId,
      accessUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year access
    };
  }

  // ==========================================================================
  // SPORTS & ATHLETICS
  // ==========================================================================

  async registerSportsChannel(data: {
    userId: string;
    teamName: string;
    sport: string;
    league: string;
    subscriptionTier: CreatorTier;
  }): Promise<StreamCreator> {
    const creator = await this.registerCreator({
      userId: data.userId,
      displayName: data.teamName,
      username: data.teamName.toLowerCase().replace(/\s+/g, "-"),
      bio: `Official channel for ${data.teamName} - ${data.league}`,
      category: "sports",
      subcategories: [data.sport, data.league],
      subscriptionTier: data.subscriptionTier,
    });

    creator.athleteProfile = {
      sport: data.sport,
      position: "Team",
      team: data.teamName,
      league: data.league,
      stats: {},
      achievements: [],
      endorsements: [],
    };

    return creator;
  }

  // ==========================================================================
  // CONTENT MANAGEMENT
  // ==========================================================================

  async uploadContent(creatorId: string, contentData: {
    type: StreamContent["type"];
    title: string;
    description: string;
    thumbnailUrl?: string;
    duration: number;
    category?: CreatorCategory;
    tags?: string[];
    contentRating?: ContentRating;
    audienceType?: AudienceType;
    isEducational?: boolean;
    courseId?: string;
    lessonNumber?: number;
    scheduledAt?: Date;
  }): Promise<StreamContent> {
    const creator = this.creators.get(creatorId);
    if (!creator) {
      throw new Error("Creator not found");
    }

    const id = `content-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const content: StreamContent = {
      id,
      creatorId,
      type: contentData.type,
      title: contentData.title,
      description: contentData.description,
      thumbnailUrl: contentData.thumbnailUrl || "",
      contentUrl: null,
      duration: contentData.duration,
      category: contentData.category || creator.category,
      tags: contentData.tags || [],
      contentRating: contentData.contentRating || "all-ages",
      audienceType: contentData.audienceType || "public",
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      watchTime: 0,
      monetized: creator.monetizationEnabled,
      adRevenue: 0,
      tipRevenue: 0,
      piRevenue: 0,
      status: contentData.scheduledAt ? "scheduled" : "processing",
      publishedAt: null,
      scheduledAt: contentData.scheduledAt || null,
      courseId: contentData.courseId || null,
      lessonNumber: contentData.lessonNumber || null,
      isEducational: contentData.isEducational || false,
      createdAt: new Date(),
    };

    this.content.set(id, content);
    creator.totalVideos += 1;

    return content;
  }

  async getContent(contentId: string): Promise<StreamContent | null> {
    return this.content.get(contentId) || null;
  }

  async getCreatorContent(creatorId: string): Promise<StreamContent[]> {
    return Array.from(this.content.values()).filter((c) => c.creatorId === creatorId);
  }

  // ==========================================================================
  // VIEWER SUBSCRIPTIONS
  // ==========================================================================

  async subscribeToCreator(viewerId: string, creatorId: string, tier: ViewerSubscription["tier"], payWithPi = false): Promise<ViewerSubscription> {
    const creator = this.creators.get(creatorId);
    if (!creator) {
      throw new Error("Creator not found");
    }

    const tierPricing = {
      free: 0,
      supporter: 4.99,
      member: 9.99,
      vip: 24.99,
    };

    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const price = tierPricing[tier];

    const subscription: ViewerSubscription = {
      id,
      viewerId,
      creatorId,
      tier,
      price,
      priceInPi: price / PI_EXTERNAL_RATE,
      startDate: new Date(),
      renewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "active",
      benefits: this.getSubscriptionBenefits(tier),
    };

    this.viewerSubscriptions.set(id, subscription);
    creator.subscribers += 1;

    // Record earnings
    const earnings = price * creator.revenueShare;
    const piBonus = payWithPi ? price * creator.piRevenueBonus : 0;
    creator.totalEarnings += earnings;
    creator.totalPiEarnings += piBonus;
    creator.monthlyEarnings += earnings;

    return subscription;
  }

  private getSubscriptionBenefits(tier: ViewerSubscription["tier"]): string[] {
    const benefits: Record<ViewerSubscription["tier"], string[]> = {
      free: ["Access to free content", "Community access"],
      supporter: ["Ad-free viewing", "Supporter badge", "Early access", "Exclusive posts"],
      member: ["All Supporter benefits", "Member-only content", "Live chat privileges", "Monthly Q&A"],
      vip: ["All Member benefits", "1-on-1 sessions", "Behind the scenes", "Merchandise discounts", "Priority support"],
    };
    return benefits[tier];
  }

  // ==========================================================================
  // ANALYTICS & DASHBOARD
  // ==========================================================================

  async getCreatorDashboard(creatorId: string): Promise<{
    creator: StreamCreator;
    recentContent: StreamContent[];
    topContent: StreamContent[];
    recentSubscribers: number;
    monthlyStats: {
      views: number;
      watchTime: number;
      earnings: number;
      piEarnings: number;
      newSubscribers: number;
    };
    courses?: Course[];
    subscriptionInfo: CreatorSubscriptionPlan | null;
  }> {
    const creator = this.creators.get(creatorId);
    if (!creator) {
      throw new Error("Creator not found");
    }

    const content = Array.from(this.content.values()).filter((c) => c.creatorId === creatorId);
    const plans = this.getCreatorSubscriptionPlans();

    return {
      creator,
      recentContent: content.slice(-10),
      topContent: [...content].sort((a, b) => b.views - a.views).slice(0, 5),
      recentSubscribers: creator.subscribers,
      monthlyStats: {
        views: creator.totalViews,
        watchTime: content.reduce((sum, c) => sum + c.watchTime, 0),
        earnings: creator.monthlyEarnings,
        piEarnings: creator.totalPiEarnings,
        newSubscribers: creator.subscribers,
      },
      courses: creator.isEducator ? creator.courses : undefined,
      subscriptionInfo: plans.find((p) => p.tier === creator.subscriptionTier) || null,
    };
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  getPiToUsdRate(type: PiValueType = "external"): number {
    return getPiRate(type);
  }

  getDualRateInfo(): { internal: number; external: number; multiplier: number } {
    return {
      internal: PI_INTERNAL_RATE,
      external: PI_EXTERNAL_RATE,
      multiplier: PI_INTERNAL_MULTIPLIER,
    };
  }
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

interface Institution {
  id: string;
  name: string;
  type: "college" | "university" | "k12" | "organization";
  verified: boolean;
  channels: string[];
  students: number;
  streamingEnabled: boolean;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const entertainmentHub = new EntertainmentHub();

// Export helper functions
export async function registerStreamCreator(
  data: Parameters<typeof entertainmentHub.registerCreator>[0]
): Promise<StreamCreator> {
  return entertainmentHub.registerCreator(data);
}

export async function registerSTEMInstructor(
  data: Parameters<typeof entertainmentHub.registerEducator>[0]
): Promise<StreamCreator> {
  return entertainmentHub.registerEducator(data);
}

export async function createEducationalCourse(
  creatorId: string,
  data: Parameters<typeof entertainmentHub.createCourse>[1]
): Promise<Course> {
  return entertainmentHub.createCourse(creatorId, data);
}

export function getCreatorPlans(): CreatorSubscriptionPlan[] {
  return entertainmentHub.getCreatorSubscriptionPlans();
}
