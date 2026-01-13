/**
 * Triumph Synergy - Interactive Education Hub
 *
 * Superior interactive educational platform for:
 * - K-12 Students
 * - Kids (ages 4-12) with engaging STEM content
 * - Interactive learning experiences
 * - Gamified education
 * - Parent/Teacher dashboards
 *
 * @module lib/education/interactive-education-hub
 * @version 1.0.0
 */

// ============================================================================
// CONSTANTS - DUAL PI VALUE SYSTEM
// ============================================================================

const PI_EXTERNAL_RATE = 314.159;
const PI_INTERNAL_RATE = 314_159;
const PI_INTERNAL_MULTIPLIER = 1000;

export type PiValueType = "internal" | "external";

export function getPiRate(type: PiValueType = "external"): number {
	return type === "internal" ? PI_INTERNAL_RATE : PI_EXTERNAL_RATE;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AgeGroup =
	| "preschool"
	| "elementary"
	| "middle-school"
	| "high-school"
	| "adult";
export type Subject =
	| "math"
	| "science"
	| "technology"
	| "engineering"
	| "reading"
	| "writing"
	| "history"
	| "geography"
	| "art"
	| "music"
	| "language"
	| "coding"
	| "robotics"
	| "life-skills";

export type LearningStyle = "visual" | "auditory" | "reading" | "kinesthetic";
export type SubscriptionType =
	| "student"
	| "family"
	| "classroom"
	| "school"
	| "district";

export interface Student {
	id: string;
	userId: string;

	// Profile
	displayName: string;
	avatar: string;
	ageGroup: AgeGroup;
	gradeLevel: number | null;
	birthYear: number;

	// Learning Profile
	learningStyle: LearningStyle;
	preferredSubjects: Subject[];
	skillLevels: Record<Subject, SkillLevel>;

	// Progress
	totalXP: number;
	currentLevel: number;
	streakDays: number;
	longestStreak: number;
	totalLessonsCompleted: number;
	totalQuizzesCompleted: number;
	totalTimeSpent: number; // minutes

	// Achievements
	badges: Badge[];
	certificates: Certificate[];
	trophies: Trophy[];

	// Goals
	dailyGoal: number; // minutes
	weeklyGoal: number;
	currentGoalProgress: number;

	// Subscription
	subscriptionType: SubscriptionType;
	subscriptionStatus: "trial" | "active" | "expired" | "cancelled";
	subscriptionEndDate: Date;

	// Parent/Guardian Link
	parentId: string | null;
	teacherIds: string[];

	// Safety
	contentRestrictions: ContentRestriction[];
	chatEnabled: boolean;
	friendsEnabled: boolean;

	createdAt: Date;
	lastActiveAt: Date;
}

export interface SkillLevel {
	subject: Subject;
	level: number; // 1-100
	xp: number;
	lessonsCompleted: number;
	accuracy: number; // percentage
	lastPracticed: Date | null;
}

export interface Badge {
	id: string;
	name: string;
	description: string;
	icon: string;
	category: "achievement" | "streak" | "mastery" | "social" | "special";
	earnedAt: Date;
	rarity: "common" | "rare" | "epic" | "legendary";
}

export interface Certificate {
	id: string;
	courseId: string;
	courseName: string;
	issuedAt: Date;
	verificationCode: string;
	blockchain: boolean;
}

export interface Trophy {
	id: string;
	name: string;
	competition: string;
	rank: number;
	earnedAt: Date;
}

export interface ContentRestriction {
	type: "age" | "subject" | "time";
	value: string | number;
}

export interface Parent {
	id: string;
	userId: string;
	name: string;
	email: string;
	phone: string;

	// Family
	children: string[]; // Student IDs

	// Subscription
	subscriptionType: SubscriptionType;
	subscriptionTier: FamilySubscriptionTier;
	subscriptionStatus: "trial" | "active" | "past_due" | "cancelled";
	subscriptionStartDate: Date;
	subscriptionEndDate: Date;
	monthlyFee: number;
	monthlyFeeInPi: number;

	// Settings
	notificationsEnabled: boolean;
	weeklyReportsEnabled: boolean;
	screenTimeAlerts: boolean;

	// Payment
	piWalletLinked: boolean;
	autoRenew: boolean;

	createdAt: Date;
}

export type FamilySubscriptionTier = "basic" | "plus" | "premium" | "unlimited";

export interface Teacher {
	id: string;
	userId: string;

	// Profile
	name: string;
	email: string;
	school: string | null;
	gradesTaught: number[];
	subjectsTaught: Subject[];

	// Subscription
	subscriptionType: "classroom" | "school" | "district";
	subscriptionTier: EducatorSubscriptionTier;
	subscriptionStatus: "trial" | "active" | "past_due" | "cancelled";
	monthlyFee: number;
	monthlyFeeInPi: number;

	// Classroom
	classrooms: Classroom[];
	totalStudents: number;

	// Content
	customLessons: string[];
	assignedCourses: string[];

	// Analytics
	averageStudentProgress: number;
	averageEngagement: number;

	createdAt: Date;
	lastActiveAt: Date;
}

export type EducatorSubscriptionTier =
	| "starter"
	| "professional"
	| "school"
	| "district";

export interface Classroom {
	id: string;
	teacherId: string;
	name: string;
	gradeLevel: number;
	subject: Subject | "general";
	studentIds: string[];
	classCode: string;

	// Assignments
	activeAssignments: Assignment[];
	completedAssignments: Assignment[];

	// Progress
	averageProgress: number;
	topPerformers: string[];
	needsAttention: string[];

	createdAt: Date;
}

export interface Assignment {
	id: string;
	classroomId: string;
	title: string;
	description: string;
	lessonIds: string[];
	quizIds: string[];
	dueDate: Date;
	pointsWorth: number;
	status: "draft" | "active" | "completed" | "graded";
	submissions: number;
	averageScore: number;
}

export interface InteractiveLesson {
	id: string;
	title: string;
	description: string;
	subject: Subject;
	ageGroup: AgeGroup;
	gradeLevel: number | null;

	// Content
	type: "video" | "interactive" | "game" | "simulation" | "reading" | "project";
	contentUrl: string;
	duration: number; // minutes

	// Learning
	learningObjectives: string[];
	skills: string[];
	prerequisites: string[];

	// Interactivity
	interactivityLevel: "low" | "medium" | "high";
	hasQuiz: boolean;
	hasProject: boolean;
	hasGame: boolean;

	// Gamification
	xpReward: number;
	bonusXP: number;
	unlocksLesson: string | null;

	// Metadata
	difficulty: "easy" | "medium" | "hard";
	estimatedTime: number;
	rating: number;
	completions: number;

	// STEM Focus
	isSTEM: boolean;
	stemComponents: ("science" | "technology" | "engineering" | "math")[];

	createdAt: Date;
	updatedAt: Date;
}

export interface InteractiveQuiz {
	id: string;
	lessonId: string;
	title: string;
	questions: QuizQuestion[];
	passingScore: number;
	timeLimit: number | null;
	attemptsAllowed: number | "unlimited";
	xpReward: number;
	bonusXPPerfect: number;
}

export interface QuizQuestion {
	id: string;
	type:
		| "multiple-choice"
		| "true-false"
		| "fill-blank"
		| "matching"
		| "ordering"
		| "drawing";
	question: string;
	options: string[] | null;
	correctAnswer: string | string[];
	explanation: string;
	points: number;
	hint: string | null;
}

export interface LearningPath {
	id: string;
	name: string;
	description: string;
	subject: Subject;
	ageGroup: AgeGroup;

	// Structure
	lessons: string[];
	milestones: Milestone[];
	totalLessons: number;
	estimatedDuration: number; // hours

	// Progress
	difficulty: "beginner" | "intermediate" | "advanced";
	prerequisitePaths: string[];

	// Rewards
	completionBadge: string;
	completionCertificate: boolean;
	totalXP: number;

	// Stats
	enrollments: number;
	completionRate: number;
	rating: number;
}

export interface Milestone {
	id: string;
	name: string;
	lessonsRequired: number;
	reward: "badge" | "trophy" | "certificate" | "xp-bonus";
	rewardId: string;
}

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

export interface StudentSubscriptionPlan {
	tier: FamilySubscriptionTier;
	name: string;
	monthlyPrice: number;
	monthlyPriceInPi: number;
	annualPrice: number;
	annualPriceInPi: number;
	features: string[];
	maxChildren: number;
	subjectsIncluded: "limited" | "core" | "all";
	offlineAccess: boolean;
	printables: boolean;
	liveClasses: boolean;
	parentDashboard: boolean;
	progressReports: boolean;
}

export interface EducatorSubscriptionPlan {
	tier: EducatorSubscriptionTier;
	name: string;
	monthlyPrice: number;
	monthlyPriceInPi: number;
	annualPrice: number;
	annualPriceInPi: number;
	features: string[];
	maxStudents: number | "unlimited";
	maxClassrooms: number | "unlimited";
	customContent: boolean;
	analytics: "basic" | "advanced" | "enterprise";
	lmsIntegration: boolean;
	adminDashboard: boolean;
}

// ============================================================================
// INTERACTIVE EDUCATION HUB CLASS
// ============================================================================

class InteractiveEducationHub {
	private readonly students: Map<string, Student> = new Map();
	private readonly parents: Map<string, Parent> = new Map();
	private readonly teachers: Map<string, Teacher> = new Map();
	private readonly classrooms: Map<string, Classroom> = new Map();
	private readonly lessons: Map<string, InteractiveLesson> = new Map();
	private readonly learningPaths: Map<string, LearningPath> = new Map();

	constructor() {
		this.initializeSampleContent();
	}

	private initializeSampleContent(): void {
		// Initialize sample STEM lessons for kids
		const sampleLessons: InteractiveLesson[] = [
			{
				id: "lesson-math-001",
				title: "Fun with Numbers: Counting Adventures",
				description:
					"Join Triumph the Explorer on a counting adventure through magical lands!",
				subject: "math",
				ageGroup: "preschool",
				gradeLevel: null,
				type: "game",
				contentUrl: "/lessons/counting-adventures",
				duration: 15,
				learningObjectives: [
					"Count to 20",
					"Recognize number patterns",
					"Basic addition concepts",
				],
				skills: ["counting", "number-recognition", "pattern-finding"],
				prerequisites: [],
				interactivityLevel: "high",
				hasQuiz: true,
				hasProject: false,
				hasGame: true,
				xpReward: 50,
				bonusXP: 25,
				unlocksLesson: "lesson-math-002",
				difficulty: "easy",
				estimatedTime: 15,
				rating: 4.9,
				completions: 15_420,
				isSTEM: true,
				stemComponents: ["math"],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: "lesson-coding-001",
				title: "My First Code: Helping Robot Learn",
				description:
					"Teach a friendly robot to move and solve puzzles using simple commands!",
				subject: "coding",
				ageGroup: "elementary",
				gradeLevel: 2,
				type: "interactive",
				contentUrl: "/lessons/first-code",
				duration: 20,
				learningObjectives: [
					"Understand sequences",
					"Give simple commands",
					"Debug basic programs",
				],
				skills: ["logical-thinking", "sequencing", "problem-solving"],
				prerequisites: [],
				interactivityLevel: "high",
				hasQuiz: true,
				hasProject: true,
				hasGame: true,
				xpReward: 75,
				bonusXP: 40,
				unlocksLesson: "lesson-coding-002",
				difficulty: "easy",
				estimatedTime: 20,
				rating: 4.95,
				completions: 28_750,
				isSTEM: true,
				stemComponents: ["technology", "engineering"],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: "lesson-science-001",
				title: "Amazing Animals: Life Cycles",
				description:
					"Explore how butterflies, frogs, and other animals grow and change!",
				subject: "science",
				ageGroup: "elementary",
				gradeLevel: 3,
				type: "simulation",
				contentUrl: "/lessons/life-cycles",
				duration: 25,
				learningObjectives: [
					"Understand metamorphosis",
					"Identify life cycle stages",
					"Compare different animals",
				],
				skills: ["observation", "comparison", "scientific-thinking"],
				prerequisites: [],
				interactivityLevel: "high",
				hasQuiz: true,
				hasProject: true,
				hasGame: false,
				xpReward: 80,
				bonusXP: 45,
				unlocksLesson: "lesson-science-002",
				difficulty: "medium",
				estimatedTime: 25,
				rating: 4.85,
				completions: 19_200,
				isSTEM: true,
				stemComponents: ["science"],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		];

		sampleLessons.forEach((lesson) => {
			this.lessons.set(lesson.id, lesson);
		});

		// Initialize sample learning paths
		const stemPath: LearningPath = {
			id: "path-stem-kids",
			name: "STEM Explorer: Junior Scientist",
			description:
				"A fun journey through science, technology, engineering, and math for young learners!",
			subject: "science",
			ageGroup: "elementary",
			lessons: ["lesson-math-001", "lesson-coding-001", "lesson-science-001"],
			milestones: [
				{
					id: "m1",
					name: "Math Wizard",
					lessonsRequired: 5,
					reward: "badge",
					rewardId: "badge-math-wizard",
				},
				{
					id: "m2",
					name: "Code Champion",
					lessonsRequired: 10,
					reward: "badge",
					rewardId: "badge-code-champion",
				},
				{
					id: "m3",
					name: "Science Star",
					lessonsRequired: 15,
					reward: "certificate",
					rewardId: "cert-science-star",
				},
			],
			totalLessons: 30,
			estimatedDuration: 15,
			difficulty: "beginner",
			prerequisitePaths: [],
			completionBadge: "badge-stem-explorer",
			completionCertificate: true,
			totalXP: 2500,
			enrollments: 45_000,
			completionRate: 0.72,
			rating: 4.9,
		};

		this.learningPaths.set(stemPath.id, stemPath);
	}

	// ==========================================================================
	// SUBSCRIPTION PLANS
	// ==========================================================================

	getFamilySubscriptionPlans(): StudentSubscriptionPlan[] {
		return [
			{
				tier: "basic",
				name: "Basic Learner",
				monthlyPrice: 9.99,
				monthlyPriceInPi: 9.99 / PI_EXTERNAL_RATE,
				annualPrice: 95.88,
				annualPriceInPi: 95.88 / PI_EXTERNAL_RATE,
				features: [
					"1 child profile",
					"Core subjects (Math, Reading, Science)",
					"500+ lessons",
					"Progress tracking",
					"Achievement badges",
					"Pi rewards for learning",
				],
				maxChildren: 1,
				subjectsIncluded: "core",
				offlineAccess: false,
				printables: false,
				liveClasses: false,
				parentDashboard: true,
				progressReports: false,
			},
			{
				tier: "plus",
				name: "Family Plus",
				monthlyPrice: 14.99,
				monthlyPriceInPi: 14.99 / PI_EXTERNAL_RATE,
				annualPrice: 143.88,
				annualPriceInPi: 143.88 / PI_EXTERNAL_RATE,
				features: [
					"Up to 3 child profiles",
					"All subjects included",
					"2,000+ lessons",
					"Detailed progress reports",
					"Offline access",
					"Printable worksheets",
					"Priority support",
					"Enhanced Pi rewards",
				],
				maxChildren: 3,
				subjectsIncluded: "all",
				offlineAccess: true,
				printables: true,
				liveClasses: false,
				parentDashboard: true,
				progressReports: true,
			},
			{
				tier: "premium",
				name: "Premium Family",
				monthlyPrice: 24.99,
				monthlyPriceInPi: 24.99 / PI_EXTERNAL_RATE,
				annualPrice: 239.88,
				annualPriceInPi: 239.88 / PI_EXTERNAL_RATE,
				features: [
					"Up to 5 child profiles",
					"All content + premium courses",
					"5,000+ lessons",
					"Live tutoring sessions (2/month)",
					"Personalized learning paths",
					"Advanced analytics",
					"1-on-1 progress reviews",
					"Premium Pi rewards & bonuses",
				],
				maxChildren: 5,
				subjectsIncluded: "all",
				offlineAccess: true,
				printables: true,
				liveClasses: true,
				parentDashboard: true,
				progressReports: true,
			},
			{
				tier: "unlimited",
				name: "Unlimited Learning",
				monthlyPrice: 39.99,
				monthlyPriceInPi: 39.99 / PI_EXTERNAL_RATE,
				annualPrice: 383.88,
				annualPriceInPi: 383.88 / PI_EXTERNAL_RATE,
				features: [
					"Unlimited child profiles",
					"Everything in Premium",
					"Unlimited live tutoring",
					"College prep courses",
					"SAT/ACT prep included",
					"Career exploration",
					"Scholarship resources",
					"VIP Pi rewards program",
				],
				maxChildren: 99,
				subjectsIncluded: "all",
				offlineAccess: true,
				printables: true,
				liveClasses: true,
				parentDashboard: true,
				progressReports: true,
			},
		];
	}

	getEducatorSubscriptionPlans(): EducatorSubscriptionPlan[] {
		return [
			{
				tier: "starter",
				name: "Teacher Starter",
				monthlyPrice: 0,
				monthlyPriceInPi: 0,
				annualPrice: 0,
				annualPriceInPi: 0,
				features: [
					"1 classroom (up to 30 students)",
					"Basic lesson library",
					"Progress tracking",
					"Simple assignments",
					"Community support",
				],
				maxStudents: 30,
				maxClassrooms: 1,
				customContent: false,
				analytics: "basic",
				lmsIntegration: false,
				adminDashboard: false,
			},
			{
				tier: "professional",
				name: "Professional Educator",
				monthlyPrice: 29,
				monthlyPriceInPi: 29 / PI_EXTERNAL_RATE,
				annualPrice: 278,
				annualPriceInPi: 278 / PI_EXTERNAL_RATE,
				features: [
					"Up to 5 classrooms",
					"Full lesson library",
					"Custom lesson creation",
					"Advanced assignments",
					"Detailed analytics",
					"Parent communication tools",
					"Priority support",
				],
				maxStudents: 150,
				maxClassrooms: 5,
				customContent: true,
				analytics: "advanced",
				lmsIntegration: false,
				adminDashboard: false,
			},
			{
				tier: "school",
				name: "School License",
				monthlyPrice: 199,
				monthlyPriceInPi: 199 / PI_EXTERNAL_RATE,
				annualPrice: 1908,
				annualPriceInPi: 1908 / PI_EXTERNAL_RATE,
				features: [
					"Unlimited classrooms",
					"Up to 500 students",
					"School admin dashboard",
					"LMS integration",
					"Custom branding",
					"Staff training",
					"Dedicated support",
					"Pi rewards for students",
				],
				maxStudents: 500,
				maxClassrooms: "unlimited",
				customContent: true,
				analytics: "enterprise",
				lmsIntegration: true,
				adminDashboard: true,
			},
			{
				tier: "district",
				name: "District Enterprise",
				monthlyPrice: 999,
				monthlyPriceInPi: 999 / PI_EXTERNAL_RATE,
				annualPrice: 9588,
				annualPriceInPi: 9588 / PI_EXTERNAL_RATE,
				features: [
					"Unlimited everything",
					"District-wide admin",
					"API access",
					"Custom integrations",
					"Curriculum alignment",
					"Professional development",
					"24/7 enterprise support",
					"Data analytics & reporting",
					"Pi scholarship program",
				],
				maxStudents: "unlimited",
				maxClassrooms: "unlimited",
				customContent: true,
				analytics: "enterprise",
				lmsIntegration: true,
				adminDashboard: true,
			},
		];
	}

	// ==========================================================================
	// STUDENT MANAGEMENT
	// ==========================================================================

	async registerStudent(data: {
		userId: string;
		displayName: string;
		ageGroup: AgeGroup;
		gradeLevel?: number;
		birthYear: number;
		parentId?: string;
		learningStyle?: LearningStyle;
		preferredSubjects?: Subject[];
	}): Promise<Student> {
		const id = `student-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

		const initialSkillLevels: Record<Subject, SkillLevel> = {} as Record<
			Subject,
			SkillLevel
		>;
		const subjects: Subject[] = [
			"math",
			"science",
			"technology",
			"engineering",
			"reading",
			"writing",
			"coding",
		];
		subjects.forEach((subject) => {
			initialSkillLevels[subject] = {
				subject,
				level: 1,
				xp: 0,
				lessonsCompleted: 0,
				accuracy: 0,
				lastPracticed: null,
			};
		});

		const student: Student = {
			id,
			userId: data.userId,
			displayName: data.displayName,
			avatar: "",
			ageGroup: data.ageGroup,
			gradeLevel: data.gradeLevel || null,
			birthYear: data.birthYear,
			learningStyle: data.learningStyle || "visual",
			preferredSubjects: data.preferredSubjects || [],
			skillLevels: initialSkillLevels,
			totalXP: 0,
			currentLevel: 1,
			streakDays: 0,
			longestStreak: 0,
			totalLessonsCompleted: 0,
			totalQuizzesCompleted: 0,
			totalTimeSpent: 0,
			badges: [],
			certificates: [],
			trophies: [],
			dailyGoal: 20,
			weeklyGoal: 100,
			currentGoalProgress: 0,
			subscriptionType: "student",
			subscriptionStatus: "trial",
			subscriptionEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			parentId: data.parentId || null,
			teacherIds: [],
			contentRestrictions: [],
			chatEnabled: false,
			friendsEnabled: false,
			createdAt: new Date(),
			lastActiveAt: new Date(),
		};

		this.students.set(id, student);
		return student;
	}

	async getStudent(studentId: string): Promise<Student | null> {
		return this.students.get(studentId) || null;
	}

	async completeLesson(
		studentId: string,
		lessonId: string,
		score: number,
		timeSpent: number,
	): Promise<{
		xpEarned: number;
		newLevel: boolean;
		badgeEarned: Badge | null;
		streakUpdated: boolean;
	}> {
		const student = this.students.get(studentId);
		if (!student) {
			throw new Error("Student not found");
		}

		const lesson = this.lessons.get(lessonId);
		if (!lesson) {
			throw new Error("Lesson not found");
		}

		// Calculate XP
		let xpEarned = lesson.xpReward;
		if (score >= 90) {
			xpEarned += lesson.bonusXP;
		}

		// Update student progress
		student.totalXP += xpEarned;
		student.totalLessonsCompleted += 1;
		student.totalTimeSpent += timeSpent;
		student.currentGoalProgress += timeSpent;
		student.lastActiveAt = new Date();

		// Update skill level
		const skillLevel = student.skillLevels[lesson.subject];
		if (skillLevel) {
			skillLevel.xp += xpEarned;
			skillLevel.lessonsCompleted += 1;
			skillLevel.accuracy =
				(skillLevel.accuracy * (skillLevel.lessonsCompleted - 1) + score) /
				skillLevel.lessonsCompleted;
			skillLevel.lastPracticed = new Date();
			skillLevel.level = Math.floor(skillLevel.xp / 100) + 1;
		}

		// Check for level up
		const newLevel = Math.floor(student.totalXP / 500) + 1;
		const leveledUp = newLevel > student.currentLevel;
		if (leveledUp) {
			student.currentLevel = newLevel;
		}

		// Update streak
		const today = new Date().toDateString();
		const lastActive = student.lastActiveAt.toDateString();
		const isNewDay = today !== lastActive;
		if (isNewDay) {
			student.streakDays += 1;
			if (student.streakDays > student.longestStreak) {
				student.longestStreak = student.streakDays;
			}
		}

		// Check for badges
		let badgeEarned: Badge | null = null;
		if (student.totalLessonsCompleted === 1) {
			badgeEarned = {
				id: `badge-${Date.now()}`,
				name: "First Steps",
				description: "Completed your first lesson!",
				icon: "🌟",
				category: "achievement",
				earnedAt: new Date(),
				rarity: "common",
			};
			student.badges.push(badgeEarned);
		}

		return {
			xpEarned,
			newLevel: leveledUp,
			badgeEarned,
			streakUpdated: isNewDay,
		};
	}

	// ==========================================================================
	// PARENT MANAGEMENT
	// ==========================================================================

	async registerParent(data: {
		userId: string;
		name: string;
		email: string;
		phone: string;
		subscriptionTier: FamilySubscriptionTier;
		payWithPi?: boolean;
	}): Promise<Parent> {
		const id = `parent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const plans = this.getFamilySubscriptionPlans();
		const plan = plans.find((p) => p.tier === data.subscriptionTier)!;

		const parent: Parent = {
			id,
			userId: data.userId,
			name: data.name,
			email: data.email,
			phone: data.phone,
			children: [],
			subscriptionType: "family",
			subscriptionTier: data.subscriptionTier,
			subscriptionStatus: "trial",
			subscriptionStartDate: new Date(),
			subscriptionEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
			monthlyFee: plan.monthlyPrice,
			monthlyFeeInPi: plan.monthlyPriceInPi,
			notificationsEnabled: true,
			weeklyReportsEnabled: true,
			screenTimeAlerts: true,
			piWalletLinked: data.payWithPi || false,
			autoRenew: true,
			createdAt: new Date(),
		};

		this.parents.set(id, parent);
		return parent;
	}

	async addChildToParent(parentId: string, studentId: string): Promise<void> {
		const parent = this.parents.get(parentId);
		if (!parent) {
			throw new Error("Parent not found");
		}

		const student = this.students.get(studentId);
		if (!student) {
			throw new Error("Student not found");
		}

		parent.children.push(studentId);
		student.parentId = parentId;
	}

	async getParentDashboard(parentId: string): Promise<{
		parent: Parent;
		children: Student[];
		weeklyProgress: {
			totalTime: number;
			lessonsCompleted: number;
			xpEarned: number;
			streakDays: number;
		};
		recommendations: InteractiveLesson[];
		subscriptionInfo: StudentSubscriptionPlan | null;
	}> {
		const parent = this.parents.get(parentId);
		if (!parent) {
			throw new Error("Parent not found");
		}

		const children = parent.children
			.map((id) => this.students.get(id))
			.filter((s): s is Student => s !== undefined);

		const plans = this.getFamilySubscriptionPlans();

		return {
			parent,
			children,
			weeklyProgress: {
				totalTime: children.reduce((sum, c) => sum + c.totalTimeSpent, 0),
				lessonsCompleted: children.reduce(
					(sum, c) => sum + c.totalLessonsCompleted,
					0,
				),
				xpEarned: children.reduce((sum, c) => sum + c.totalXP, 0),
				streakDays: Math.max(...children.map((c) => c.streakDays), 0),
			},
			recommendations: Array.from(this.lessons.values()).slice(0, 5),
			subscriptionInfo:
				plans.find((p) => p.tier === parent.subscriptionTier) || null,
		};
	}

	// ==========================================================================
	// TEACHER MANAGEMENT
	// ==========================================================================

	async registerTeacher(data: {
		userId: string;
		name: string;
		email: string;
		school?: string;
		gradesTaught: number[];
		subjectsTaught: Subject[];
		subscriptionTier: EducatorSubscriptionTier;
		payWithPi?: boolean;
	}): Promise<Teacher> {
		const id = `teacher-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const plans = this.getEducatorSubscriptionPlans();
		const plan = plans.find((p) => p.tier === data.subscriptionTier)!;

		const teacher: Teacher = {
			id,
			userId: data.userId,
			name: data.name,
			email: data.email,
			school: data.school || null,
			gradesTaught: data.gradesTaught,
			subjectsTaught: data.subjectsTaught,
			subscriptionType:
				data.subscriptionTier === "district"
					? "district"
					: data.subscriptionTier === "school"
						? "school"
						: "classroom",
			subscriptionTier: data.subscriptionTier,
			subscriptionStatus: "trial",
			monthlyFee: plan.monthlyPrice,
			monthlyFeeInPi: plan.monthlyPriceInPi,
			classrooms: [],
			totalStudents: 0,
			customLessons: [],
			assignedCourses: [],
			averageStudentProgress: 0,
			averageEngagement: 0,
			createdAt: new Date(),
			lastActiveAt: new Date(),
		};

		this.teachers.set(id, teacher);
		return teacher;
	}

	async createClassroom(
		teacherId: string,
		data: {
			name: string;
			gradeLevel: number;
			subject: Subject | "general";
		},
	): Promise<Classroom> {
		const teacher = this.teachers.get(teacherId);
		if (!teacher) {
			throw new Error("Teacher not found");
		}

		const id = `classroom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const classCode = Math.random().toString(36).slice(2, 8).toUpperCase();

		const classroom: Classroom = {
			id,
			teacherId,
			name: data.name,
			gradeLevel: data.gradeLevel,
			subject: data.subject,
			studentIds: [],
			classCode,
			activeAssignments: [],
			completedAssignments: [],
			averageProgress: 0,
			topPerformers: [],
			needsAttention: [],
			createdAt: new Date(),
		};

		this.classrooms.set(id, classroom);
		teacher.classrooms.push(classroom);

		return classroom;
	}

	async joinClassroom(
		studentId: string,
		classCode: string,
	): Promise<Classroom> {
		const student = this.students.get(studentId);
		if (!student) {
			throw new Error("Student not found");
		}

		const classroom = Array.from(this.classrooms.values()).find(
			(c) => c.classCode === classCode,
		);
		if (!classroom) {
			throw new Error("Classroom not found");
		}

		classroom.studentIds.push(studentId);
		student.teacherIds.push(classroom.teacherId);

		const teacher = this.teachers.get(classroom.teacherId);
		if (teacher) {
			teacher.totalStudents += 1;
		}

		return classroom;
	}

	// ==========================================================================
	// CONTENT ACCESS
	// ==========================================================================

	async getLesson(lessonId: string): Promise<InteractiveLesson | null> {
		return this.lessons.get(lessonId) || null;
	}

	async searchLessons(filters: {
		subject?: Subject;
		ageGroup?: AgeGroup;
		gradeLevel?: number;
		isSTEM?: boolean;
		difficulty?: InteractiveLesson["difficulty"];
		type?: InteractiveLesson["type"];
		searchTerm?: string;
	}): Promise<InteractiveLesson[]> {
		let lessons = Array.from(this.lessons.values());

		if (filters.subject) {
			lessons = lessons.filter((l) => l.subject === filters.subject);
		}
		if (filters.ageGroup) {
			lessons = lessons.filter((l) => l.ageGroup === filters.ageGroup);
		}
		if (filters.gradeLevel) {
			lessons = lessons.filter(
				(l) => l.gradeLevel === filters.gradeLevel || l.gradeLevel === null,
			);
		}
		if (filters.isSTEM !== undefined) {
			lessons = lessons.filter((l) => l.isSTEM === filters.isSTEM);
		}
		if (filters.difficulty) {
			lessons = lessons.filter((l) => l.difficulty === filters.difficulty);
		}
		if (filters.type) {
			lessons = lessons.filter((l) => l.type === filters.type);
		}
		if (filters.searchTerm) {
			const term = filters.searchTerm.toLowerCase();
			lessons = lessons.filter(
				(l) =>
					l.title.toLowerCase().includes(term) ||
					l.description.toLowerCase().includes(term),
			);
		}

		return lessons;
	}

	async getLearningPath(pathId: string): Promise<LearningPath | null> {
		return this.learningPaths.get(pathId) || null;
	}

	async getRecommendedLessons(
		studentId: string,
		limit = 5,
	): Promise<InteractiveLesson[]> {
		const student = this.students.get(studentId);
		if (!student) {
			throw new Error("Student not found");
		}

		// Simple recommendation based on preferred subjects and skill level
		const lessons = Array.from(this.lessons.values())
			.filter((l) => l.ageGroup === student.ageGroup)
			.filter(
				(l) =>
					student.preferredSubjects.length === 0 ||
					student.preferredSubjects.includes(l.subject),
			);

		// Sort by rating and completions
		lessons.sort((a, b) => b.rating * b.completions - a.rating * a.completions);

		return lessons.slice(0, limit);
	}

	// ==========================================================================
	// UTILITIES
	// ==========================================================================

	getPiToUsdRate(type: PiValueType = "external"): number {
		return getPiRate(type);
	}

	getDualRateInfo(): {
		internal: number;
		external: number;
		multiplier: number;
	} {
		return {
			internal: PI_INTERNAL_RATE,
			external: PI_EXTERNAL_RATE,
			multiplier: PI_INTERNAL_MULTIPLIER,
		};
	}
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const interactiveEducationHub = new InteractiveEducationHub();

// Export helper functions
export async function registerLearner(
	data: Parameters<typeof interactiveEducationHub.registerStudent>[0],
): Promise<Student> {
	return interactiveEducationHub.registerStudent(data);
}

export async function registerEducator(
	data: Parameters<typeof interactiveEducationHub.registerTeacher>[0],
): Promise<Teacher> {
	return interactiveEducationHub.registerTeacher(data);
}

export function getFamilyPlans(): StudentSubscriptionPlan[] {
	return interactiveEducationHub.getFamilySubscriptionPlans();
}

export function getEducatorPlans(): EducatorSubscriptionPlan[] {
	return interactiveEducationHub.getEducatorSubscriptionPlans();
}
