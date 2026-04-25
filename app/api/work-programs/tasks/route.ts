/**
 * POST /api/work-programs/tasks
 * Post a new work task (employer / DOC facility).
 *
 * GET  /api/work-programs/tasks
 * Browse available tasks with filters.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sovereignWorkEngine,
  type TaskCategory,
  type ParticipantClass,
  type ClearanceLevel,
  SOVEREIGN_PROGRAM_ID,
  PI_WORK_RATE_EXTERNAL,
} from "@/lib/programs/sovereign-work-program";

// ── GET — browse open tasks ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category      = searchParams.get("category") as TaskCategory | null;
  const facilityId    = searchParams.get("facilityId");
  const isRemote      = searchParams.get("remote");
  const clearance     = searchParams.get("clearance") as ClearanceLevel | null;
  const minReward     = parseFloat(searchParams.get("minReward") ?? "0");

  const tasks = buildDemoTasks();
  const filtered = tasks.filter(t => {
    if (category && t.category !== category) return false;
    if (facilityId && t.facilityId !== facilityId) return false;
    if (isRemote === "true" && !t.isRemote) return false;
    if (isRemote === "false" && t.isRemote) return false;
    if (clearance && t.requiredClearanceLevel !== clearance) return false;
    if (t.rewardPi < minReward) return false;
    return true;
  });

  return NextResponse.json({
    success: true,
    programId: SOVEREIGN_PROGRAM_ID,
    tasks: filtered,
    total: filtered.length,
    piRate: PI_WORK_RATE_EXTERNAL,
    categories: [
      "facility-maintenance", "administrative", "manufacturing", "agricultural",
      "technology", "healthcare-support", "culinary", "construction",
      "education-support", "community-service", "logistics", "creative", "remote-digital",
    ],
  });
}

// ── POST — post a new task ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    employerId,
    title,
    description,
    category,
    rewardPi,
    eligibleClasses,
    requiredClearance,
    isRemote,
    facilityId,
    estimatedHours,
    deadline,
    requiresDocApproval,
    minBehavioralScore,
    tags,
  } = body as {
    employerId: string;
    title: string;
    description: string;
    category: TaskCategory;
    rewardPi: number;
    eligibleClasses: ParticipantClass[];
    requiredClearance?: ClearanceLevel;
    isRemote?: boolean;
    facilityId?: string;
    estimatedHours?: number;
    deadline?: string;
    requiresDocApproval?: boolean;
    minBehavioralScore?: number;
    tags?: string[];
  };

  if (!employerId || !title || !description || !category || rewardPi === undefined) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: employerId, title, description, category, rewardPi" },
      { status: 400 }
    );
  }

  if (!Array.isArray(eligibleClasses) || eligibleClasses.length === 0) {
    return NextResponse.json(
      { success: false, error: "eligibleClasses must be a non-empty array" },
      { status: 400 }
    );
  }

  const task = sovereignWorkEngine.createTask({
    employerId,
    programId: SOVEREIGN_PROGRAM_ID,
    title,
    description,
    category,
    rewardPi,
    eligibleClasses,
    requiredClearance,
    isRemote,
    facilityId,
    estimatedHours,
    deadline,
    requiresDocApproval,
    minBehavioralScore,
    tags,
  });

  return NextResponse.json(
    {
      success: true,
      task,
      message: "Task posted to Sovereign Work Program.",
      rewardUsd: task.rewardUsd,
    },
    { status: 201 }
  );
}

// ── Demo tasks ─────────────────────────────────────────────────────────────────

function buildDemoTasks() {
  const base = {
    programId: SOVEREIGN_PROGRAM_ID,
    employerId: "TS-EMPLOYER-001",
    status: "open" as const,
    postedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
    requiresDocApproval: false,
    bonusPiOnStreak: undefined,
    assignedTo: undefined,
    assignedAt: undefined,
    submittedAt: undefined,
    verifiedAt: undefined,
    verifiedBy: undefined,
    piPaymentId: undefined,
    paidAt: undefined,
    deadline: undefined,
    location: undefined,
  };

  return [
    sovereignWorkEngine.createTask({
      employerId: "TS-EMPLOYER-001",
      programId: SOVEREIGN_PROGRAM_ID,
      title: "Facility Laundry Operations",
      description: "Operate industrial laundry equipment, sort and fold institutional linens for 4-hour shift.",
      category: "facility-maintenance",
      rewardPi: 0.5,
      eligibleClasses: ["inmate-facility", "inmate-work-release"],
      requiredClearance: "standard",
      isRemote: false,
      facilityId: "TX-STATE-001",
      estimatedHours: 4,
      requiresDocApproval: true,
      minBehavioralScore: 60,
      tags: ["laundry", "facility", "supervised"],
    }),
    sovereignWorkEngine.createTask({
      employerId: "TS-EMPLOYER-001",
      programId: SOVEREIGN_PROGRAM_ID,
      title: "Digital Data Entry — Records Management",
      description: "Enter facility administrative records into digital system. Tablet-based task, supervised terminal access.",
      category: "administrative",
      rewardPi: 1.0,
      eligibleClasses: ["inmate-facility", "inmate-work-release", "employee"],
      requiredClearance: "elevated",
      isRemote: false,
      facilityId: "TX-STATE-001",
      estimatedHours: 3,
      requiresDocApproval: true,
      minBehavioralScore: 75,
      tags: ["data-entry", "digital", "administrative"],
    }),
    sovereignWorkEngine.createTask({
      employerId: "TS-EMPLOYER-001",
      programId: SOVEREIGN_PROGRAM_ID,
      title: "Remote Pi Network Micro-Task — Content Moderation",
      description: "Review and categorize content submissions for the Pi Network utility layer. Fully remote, completed via work portal.",
      category: "remote-digital",
      rewardPi: 2.0,
      eligibleClasses: ["inmate-work-release", "employee", "employer"],
      requiredClearance: "work-release",
      isRemote: true,
      estimatedHours: 2,
      requiresDocApproval: false,
      tags: ["remote", "pi-network", "digital", "content"],
    }),
    sovereignWorkEngine.createTask({
      employerId: "TS-EMPLOYER-001",
      programId: SOVEREIGN_PROGRAM_ID,
      title: "Kitchen Food Preparation — Culinary Program",
      description: "Assist certified culinary staff with meal preparation for 200+ residents. Vocational training credits awarded.",
      category: "culinary",
      rewardPi: 0.75,
      eligibleClasses: ["inmate-facility", "inmate-work-release"],
      requiredClearance: "standard",
      isRemote: false,
      facilityId: "CA-STATE-002",
      estimatedHours: 5,
      requiresDocApproval: true,
      minBehavioralScore: 65,
      tags: ["culinary", "vocational", "food-prep"],
    }),
    sovereignWorkEngine.createTask({
      employerId: "TS-EMPLOYER-001",
      programId: SOVEREIGN_PROGRAM_ID,
      title: "Community Garden & Agricultural Work",
      description: "Tend to facility community garden, harvest produce, and maintain agricultural plots for distribution to local food banks.",
      category: "agricultural",
      rewardPi: 1.5,
      eligibleClasses: ["inmate-facility", "inmate-work-release", "employee"],
      requiredClearance: "standard",
      isRemote: false,
      facilityId: "TX-STATE-001",
      estimatedHours: 6,
      requiresDocApproval: true,
      minBehavioralScore: 60,
      tags: ["agriculture", "community", "food-bank"],
    }),
    sovereignWorkEngine.createTask({
      employerId: "TS-EMPLOYER-001",
      programId: SOVEREIGN_PROGRAM_ID,
      title: "Peer Education Tutor — GED Prep",
      description: "Tutor fellow participants in GED preparation. Certificate of completion awarded alongside Pi earnings.",
      category: "education-support",
      rewardPi: 3.0,
      eligibleClasses: ["inmate-facility", "inmate-work-release"],
      requiredClearance: "elevated",
      isRemote: false,
      estimatedHours: 2,
      requiresDocApproval: true,
      minBehavioralScore: 80,
      tags: ["education", "ged", "tutoring", "peer"],
    }),
  ];
}
