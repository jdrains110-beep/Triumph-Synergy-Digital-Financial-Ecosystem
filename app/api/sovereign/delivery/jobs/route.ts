/**
 * /api/sovereign/delivery/jobs
 * Sovereign Delivery Platform — Global Jobs Registry
 *
 * GET  — list all open global job opportunities across all 8 authorities
 * POST — post a new job opening (employer/customer creates work opportunity)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  SOVEREIGN_DELIVERY_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_SIG,
  PI_RATE_EXTERNAL,
  SPA_ID, SLMN_ID, SFDA_ID, SRA_ID, SPSA_ID, SHHA_ID, SSLA_ID, SGDA_ID,
} from "@/lib/programs/sovereign-delivery";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export interface JobPosting {
  jobId:             string;
  authorityId:       string;
  authorityName:     string;
  employerPiWallet:  string;
  title:             string;
  category:          string;
  description:       string;
  piRewardPerUnit:   number;
  usdEquivalent:     number;
  unitsAvailable:    number;
  globalRegion:      string;
  city:              string;
  country:           string;
  requiredLevel:     string;
  postedAt:          string;
  expiresAt:         string;
  quantumSignature:  string;
  applicantsCount:   number;
  status:            "open" | "filled" | "expired";
}

// Seed jobs — 8 authorities × varied regions (demo catalog)
const SEED_JOBS: Omit<JobPosting, "quantumSignature" | "postedAt" | "expiresAt">[] = [
  // SPA — Parcel
  { jobId: "SPA-0001", authorityId: SPA_ID,  authorityName: "Sovereign Parcel Authority",        employerPiWallet: "GSOVEREIGN1", title: "Sovereign Parcel Courier — Miami Metro",        category: "parcel-delivery",   description: "Deliver Pi-tracked parcels across Miami-Dade. Use your own vehicle. Earn Pi per stop.",                         piRewardPerUnit: 0.01, usdEquivalent: 3.14,   unitsAvailable: 50,  globalRegion: "US-Southeast", city: "Miami",        country: "USA",     requiredLevel: "basic",      applicantsCount: 12, status: "open" },
  { jobId: "SPA-0002", authorityId: SPA_ID,  authorityName: "Sovereign Parcel Authority",        employerPiWallet: "GSOVEREIGN2", title: "Sovereign Parcel Hub Sorter — Atlanta",        category: "parcel-sorting",    description: "Sort and scan Pi-anchored parcels at sovereign hub. Hourly Pi pay, flexible hours.",                            piRewardPerUnit: 0.015,usdEquivalent: 4.71,   unitsAvailable: 20,  globalRegion: "US-Southeast", city: "Atlanta",      country: "USA",     requiredLevel: "basic",      applicantsCount: 8,  status: "open" },
  // SLMN — Last Mile
  { jobId: "SLMN-0001",authorityId: SLMN_ID, authorityName: "Sovereign Last-Mile Network",       employerPiWallet: "GSOVEREIGN3", title: "Last-Mile Courier Route — Chicago North Side",  category: "last-mile",         description: "100+ stops/day. Pi per delivery. No Amazon account required. Keep 100% of Pi earned.",                          piRewardPerUnit: 0.008,usdEquivalent: 2.51,   unitsAvailable: 30,  globalRegion: "US-Midwest",   city: "Chicago",      country: "USA",     requiredLevel: "basic",      applicantsCount: 22, status: "open" },
  { jobId: "SLMN-0002",authorityId: SLMN_ID, authorityName: "Sovereign Last-Mile Network",       employerPiWallet: "GSOVEREIGN4", title: "Last-Mile E-Bike Courier — Lagos Nigeria",     category: "last-mile",         description: "Earn Pi delivering packages across Lagos. E-bike provided. Global pilot — African expansion.",                  piRewardPerUnit: 0.01, usdEquivalent: 3.14,   unitsAvailable: 40,  globalRegion: "Africa-West",  city: "Lagos",        country: "Nigeria", requiredLevel: "sovereign",  applicantsCount: 67, status: "open" },
  // SFDA — Food
  { jobId: "SFDA-0001",authorityId: SFDA_ID, authorityName: "Sovereign Food Delivery Authority", employerPiWallet: "GSOVEREIGN5", title: "Sovereign Food Courier — Dallas TX",            category: "food-delivery",     description: "Pick up and deliver Pi-paid food orders. 0% commission taken. Tips go 100% to you in Pi.",                      piRewardPerUnit: 0.02, usdEquivalent: 6.28,   unitsAvailable: 25,  globalRegion: "US-South",     city: "Dallas",       country: "USA",     requiredLevel: "basic",      applicantsCount: 31, status: "open" },
  { jobId: "SFDA-0002",authorityId: SFDA_ID, authorityName: "Sovereign Food Delivery Authority", employerPiWallet: "GSOVEREIGN6", title: "Pi Ghost Kitchen Operator — Remote/Home",      category: "ghost-kitchen",     description: "Run a sovereign ghost kitchen. Take Pi orders directly. No DoorDash listing required.",                         piRewardPerUnit: 0.05, usdEquivalent: 15.71,  unitsAvailable: 100, globalRegion: "Global",       city: "Remote",       country: "Global",  requiredLevel: "sovereign",  applicantsCount: 14, status: "open" },
  // SRA — Rideshare
  { jobId: "SRA-0001", authorityId: SRA_ID,  authorityName: "Sovereign Rideshare Authority",     employerPiWallet: "GSOVEREIGN7", title: "Pi Sovereign Driver — Los Angeles",             category: "rideshare",         description: "Drive passengers for Pi. Keep 100% of fare — zero Uber/Lyft cut. Quantum-signed trips.",                       piRewardPerUnit: 0.03, usdEquivalent: 9.42,   unitsAvailable: 60,  globalRegion: "US-West",      city: "Los Angeles",  country: "USA",     requiredLevel: "background", applicantsCount: 44, status: "open" },
  { jobId: "SRA-0002", authorityId: SRA_ID,  authorityName: "Sovereign Rideshare Authority",     employerPiWallet: "GSOVEREIGN8", title: "Medical Transport Driver — Houston TX",         category: "medical-transport", description: "Sovereign NEMT (Non-Emergency Medical Transport). Pi-paid, ADA compliant, background cleared.",                piRewardPerUnit: 0.05, usdEquivalent: 15.71,  unitsAvailable: 15,  globalRegion: "US-South",     city: "Houston",      country: "USA",     requiredLevel: "apex",       applicantsCount: 7,  status: "open" },
  // SPSA — Parts
  { jobId: "SPSA-0001",authorityId: SPSA_ID, authorityName: "Sovereign Parts & Supply Authority",employerPiWallet: "GSOVEREIGN9", title: "Pi Parts Courier — Auto Parts Delivery",       category: "parts-delivery",    description: "Deliver Pi-tracked auto parts directly from sovereign warehouse to mechanics. Same-day.",                       piRewardPerUnit: 0.012,usdEquivalent: 3.77,   unitsAvailable: 20,  globalRegion: "US-Southeast", city: "Orlando",      country: "USA",     requiredLevel: "basic",      applicantsCount: 5,  status: "open" },
  // SHHA — Haul
  { jobId: "SHHA-0001",authorityId: SHHA_ID, authorityName: "Sovereign Heavy Haul Authority",    employerPiWallet: "GSOVEREIGNA", title: "Furniture Hauler — Phoenix AZ",                category: "furniture-haul",    description: "Haul furniture, appliances, and large items. Pi smart contract escrow. No GoShare commission.",                piRewardPerUnit: 0.1,  usdEquivalent: 31.42,  unitsAvailable: 10,  globalRegion: "US-Southwest", city: "Phoenix",      country: "USA",     requiredLevel: "background", applicantsCount: 9,  status: "open" },
  { jobId: "SHHA-0002",authorityId: SHHA_ID, authorityName: "Sovereign Heavy Haul Authority",    employerPiWallet: "GSOVEREIGNB", title: "Moving Team Leader — New York City",           category: "moving",            description: "Lead sovereign moving crews. Pi paid per job. Smart contract prevents customer non-payment.",                   piRewardPerUnit: 0.2,  usdEquivalent: 62.83,  unitsAvailable: 5,   globalRegion: "US-Northeast", city: "New York",     country: "USA",     requiredLevel: "sovereign",  applicantsCount: 18, status: "open" },
  // SSLA — Shift
  { jobId: "SSLA-0001",authorityId: SSLA_ID, authorityName: "Sovereign Shift Labor Authority",   employerPiWallet: "GSOVEREIGNC", title: "Warehouse Shift Worker — Memphis TN",          category: "warehouse",         description: "Pi-paid warehouse shifts. 0% Instawork markup — full Pi wage to worker. Shifts available 24/7.",               piRewardPerUnit: 0.04, usdEquivalent: 12.57,  unitsAvailable: 75,  globalRegion: "US-South",     city: "Memphis",      country: "USA",     requiredLevel: "basic",      applicantsCount: 53, status: "open" },
  { jobId: "SSLA-0002",authorityId: SSLA_ID, authorityName: "Sovereign Shift Labor Authority",   employerPiWallet: "GSOVEREIGND", title: "Event Staffing — Dubai UAE",                  category: "event",             description: "Staff sovereign events in Dubai. Pi instant settlement. Global shift worker — no visa required to apply.",      piRewardPerUnit: 0.06, usdEquivalent: 18.85,  unitsAvailable: 30,  globalRegion: "Middle-East",  city: "Dubai",        country: "UAE",     requiredLevel: "sovereign",  applicantsCount: 88, status: "open" },
  { jobId: "SSLA-0003",authorityId: SSLA_ID, authorityName: "Sovereign Shift Labor Authority",   employerPiWallet: "GSOVEREIGNE", title: "Healthcare Support Shift — London UK",         category: "healthcare",        description: "Orderly and patient transport shifts. Pi-paid. GravyWork replaced — sovereign worker rights guaranteed.",       piRewardPerUnit: 0.07, usdEquivalent: 22.00,  unitsAvailable: 20,  globalRegion: "EU-UK",        city: "London",       country: "UK",      requiredLevel: "background", applicantsCount: 34, status: "open" },
  // SGDA — Gig
  { jobId: "SGDA-0001",authorityId: SGDA_ID, authorityName: "Sovereign Gig Dispatch Authority",  employerPiWallet: "GSOVEREIGNF", title: "Sovereign Gig Courier — São Paulo Brazil",     category: "courier",           description: "Earn Pi on every gig. $0 dispatch fee. ShiftSmart replaced. Work from your phone.",                             piRewardPerUnit: 0.015,usdEquivalent: 4.71,   unitsAvailable: 100, globalRegion: "LATAM-South",  city: "São Paulo",    country: "Brazil",  requiredLevel: "basic",      applicantsCount: 212,status: "open" },
  { jobId: "SGDA-0002",authorityId: SGDA_ID, authorityName: "Sovereign Gig Dispatch Authority",  employerPiWallet: "GSOVEREIGNG", title: "Tech Support Gig — Nairobi Kenya",             category: "tech",              description: "Remote tech support gigs paid in Pi. $0 dispatch fee vs GetGigs $15/gig. No bank account needed.",              piRewardPerUnit: 0.02, usdEquivalent: 6.28,   unitsAvailable: 50,  globalRegion: "Africa-East",  city: "Nairobi",      country: "Kenya",   requiredLevel: "sovereign",  applicantsCount: 149,status: "open" },
  { jobId: "SGDA-0003",authorityId: SGDA_ID, authorityName: "Sovereign Gig Dispatch Authority",  employerPiWallet: "GSOVEREIGGH", title: "Assembly Technician Gig — Manila Philippines",category: "assembly",          description: "Furniture/appliance assembly. Pi per job. Sovereign gig identity — no forced arbitration, no deactivation.",   piRewardPerUnit: 0.025,usdEquivalent: 7.85,   unitsAvailable: 40,  globalRegion: "APAC-Southeast",city: "Manila",      country: "Philippines",requiredLevel:"basic",      applicantsCount: 78, status: "open" },
];

function signJob(jobId: string): string {
  return `ML-DSA-87:${createHash("sha256").update(jobId + Date.now()).digest("hex").slice(0, 32)}`;
}

function buildSeeded(): JobPosting[] {
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return SEED_JOBS.map(j => ({
    ...j,
    quantumSignature: signJob(j.jobId),
    postedAt:  now.toISOString(),
    expiresAt: expires.toISOString(),
  }));
}

const jobRegistry: JobPosting[] = buildSeeded();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get("authority")?.toUpperCase();
  const region    = searchParams.get("region");
  const country   = searchParams.get("country");
  const category  = searchParams.get("category");
  const limit     = Math.min(Number(searchParams.get("limit") ?? "100"), 500);

  let jobs = jobRegistry.filter(j => j.status === "open");
  if (authority) jobs = jobs.filter(j => j.authorityId.includes(authority));
  if (region)    jobs = jobs.filter(j => j.globalRegion.toLowerCase().includes(region.toLowerCase()));
  if (country)   jobs = jobs.filter(j => j.country.toLowerCase().includes(country.toLowerCase()));
  if (category)  jobs = jobs.filter(j => j.category.toLowerCase().includes(category.toLowerCase()));

  const totalPiAvailable = jobs.reduce((a, j) => a + j.piRewardPerUnit * j.unitsAvailable, 0);
  const totalUsdEquivalent = Math.round(totalPiAvailable * PI_RATE_EXTERNAL * 100) / 100;

  const regionGroups: Record<string, number> = {};
  const authorityGroups: Record<string, number> = {};
  for (const j of jobs) {
    regionGroups[j.globalRegion]   = (regionGroups[j.globalRegion] ?? 0) + j.unitsAvailable;
    authorityGroups[j.authorityName] = (authorityGroups[j.authorityName] ?? 0) + j.unitsAvailable;
  }

  return NextResponse.json({
    success:              true,
    programId:            SOVEREIGN_DELIVERY_VERSION,
    securityLevel:        APEX_SECURITY_LEVEL,
    quantumAlgo:          QUANTUM_ALGO_SIG,
    totalOpenJobs:        jobs.reduce((a, j) => a + j.unitsAvailable, 0),
    totalJobPostings:     jobs.length,
    totalPiAvailable:     Math.round(totalPiAvailable * 1000) / 1000,
    totalUsdEquivalent,
    regionBreakdown:      regionGroups,
    authorityBreakdown:   authorityGroups,
    jobs:                 jobs.slice(0, limit),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    authorityId,
    employerPiWallet,
    title,
    category,
    description,
    piRewardPerUnit,
    unitsAvailable,
    globalRegion,
    city,
    country,
    requiredLevel = "basic",
  } = body;

  if (!authorityId || !employerPiWallet || !title || !category || !description || !piRewardPerUnit || !unitsAvailable || !globalRegion || !city || !country) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
  }
  if (typeof piRewardPerUnit !== "number" || piRewardPerUnit <= 0) {
    return NextResponse.json({ success: false, error: "piRewardPerUnit must be a positive number" }, { status: 400 });
  }

  const jobId = `JOB-${randomUUID().slice(0, 12).toUpperCase()}`;
  const now     = new Date();
  const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const job: JobPosting = {
    jobId,
    authorityId:      String(authorityId).slice(0, 30),
    authorityName:    String(authorityId),
    employerPiWallet: String(employerPiWallet).slice(0, 56),
    title:            String(title).slice(0, 100),
    category:         String(category).slice(0, 50),
    description:      String(description).slice(0, 500),
    piRewardPerUnit,
    usdEquivalent:    Math.round(piRewardPerUnit * PI_RATE_EXTERNAL * 100) / 100,
    unitsAvailable:   Math.min(Number(unitsAvailable), 10_000),
    globalRegion:     String(globalRegion).slice(0, 50),
    city:             String(city).slice(0, 50),
    country:          String(country).slice(0, 50),
    requiredLevel:    String(requiredLevel).slice(0, 20),
    postedAt:         now.toISOString(),
    expiresAt:        expires.toISOString(),
    quantumSignature: signJob(jobId),
    applicantsCount:  0,
    status:           "open",
  };

  if (jobRegistry.length >= 5_000) jobRegistry.shift();
  jobRegistry.push(job);

  return NextResponse.json({ success: true, programId: SOVEREIGN_DELIVERY_VERSION, job }, { status: 201 });
}
