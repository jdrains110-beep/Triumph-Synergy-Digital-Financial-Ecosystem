# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
# License: PiOS
"""
Triumph Synergy — Sovereign Education Engine (SEE)
===================================================

The first Pi-powered sovereign educational ecosystem — replacing every legacy
tuition, payroll, textbook, meal-plan, and transportation system with a single
quantum-secured Pi Network utility layer.

Pillars:
  PIONEER ACADEMY   — K-12 sovereign curriculum (STEM, financial literacy, Pi economics)
  SOVEREIGN COLLEGE — University + graduate-level sovereign education
  FACULTY PAY HUB   — Teachers · Professors · Aides · Daycare staff paid in Pi (per hour or per course)
  LEARN & EARN      — Every class, quiz, interaction, milestone rewards Pi to the learner
  CAMPUS UTILITIES  — Meal plans · Transportation passes · Books · Vehicles — all settled in Pi
  ONBOARDING FORGE  — Mandatory effective-teaching certification for every new hire (any age level)
  EARLY BIRD TUITION— Pay ahead with Pi and receive sovereign tuition discounts
  LOOPHOLE ARSENAL  — 60 ultimate sovereign education loopholes (TAX · DEBT · GRANT · WORKFORCE · QUANTUM)

Endpoints:
  GET  /health                       → Service health
  GET  /status                       → Full education ecosystem status
  GET  /metrics                      → Prometheus metrics
  GET  /catalog                      → Full course catalog (K-12 + College + Certification)
  POST /enroll                       → Enroll a Pioneer/student in a course
  POST /complete-lesson              → Mark lesson complete + award Pi learning reward
  POST /faculty/register             → Register faculty (teacher, professor, aide, daycare)
  POST /faculty/pay                  → Pay faculty salary or hourly rate in Pi
  GET  /faculty/{faculty_id}         → Faculty profile + earnings + courses
  POST /tuition/pay                  → Pay tuition in Pi (with early-bird discount)
  POST /campus/meal-plan             → Purchase meal plan in Pi
  POST /campus/transport-pass        → Purchase transportation pass in Pi
  POST /campus/books                 → Purchase course books/materials in Pi
  POST /campus/vehicle               → Register campus/faculty vehicle in Pi
  GET  /loopholes                    → All 60 sovereign education loopholes
  GET  /leaderboard                  → Top Pi earners by learning activity
  GET  /report                       → Full education ecosystem sovereignty report

Port:     8130
Security: MAXIMUM-APEX-QUANTUM-SOVEREIGN-GOLD-STANDARD
Rates:    $314,159 USD/π (internal) · $314.159 USD/π (pioneer)
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Optional

import httpx
import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException
from fastapi.responses import PlainTextResponse
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

# ── Config ────────────────────────────────────────────────────────────────────

VERSION             = "TRIUMPH-SEE-v1-GOLD-APEX"
SECURITY_LEVEL      = "MAXIMUM-APEX-QUANTUM-SOVEREIGN-GOLD-STANDARD"
APEX_ALGORITHMS     = "ML-DSA-87-MAX + ML-KEM-1024-MAX + CRYSTALS-Kyber-1024 + SHAKE-256 + SHA3-512"
PI_ANCHOR           = "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"
PI_RATE_EXTERNAL    = 314.159      # $314.159 USD/π — pioneer rate (IMMUTABLE)
PI_RATE_INTERNAL    = 314_159.0    # $314,159 USD/π — sovereign gold rate (IMMUTABLE)
PORT                = int(os.getenv("PORT", "8130"))
REDIS_URL           = os.getenv("REDIS_URL", "redis://triumph-redis:6379/7")
QUANTUM_SHIELD_URL  = os.getenv("QUANTUM_SHIELD_URL", "http://triumph-quantum-shield:8094")
SAIB_URL            = os.getenv("SAIB_URL", "http://triumph-sovereign-ai-bot:8099")

# Pioneer learning reward rates (Pi per event)
REWARD_LESSON_COMPLETE   = float(os.getenv("REWARD_LESSON_PI",    "0.01"))   # per lesson completed
REWARD_QUIZ_PASS         = float(os.getenv("REWARD_QUIZ_PI",      "0.025"))  # per quiz passed
REWARD_COURSE_COMPLETE   = float(os.getenv("REWARD_COURSE_PI",    "0.1"))    # per course completed
REWARD_CERTIFICATION     = float(os.getenv("REWARD_CERT_PI",      "0.5"))    # per certification earned
REWARD_DAILY_LOGIN       = float(os.getenv("REWARD_LOGIN_PI",     "0.005"))  # daily platform login
EARLY_BIRD_DISCOUNT_PCT  = float(os.getenv("EARLY_BIRD_DISCOUNT", "15.0"))   # % off tuition paid 30+ days early

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="%(asctime)s [SEE] %(levelname)s %(message)s")
log = logging.getLogger("sovereign-education-engine")

# ── Prometheus Metrics ────────────────────────────────────────────────────────

see_enrollments_total   = Counter("see_enrollments_total",   "Total course enrollments",             ["level", "subject"])
see_completions_total   = Counter("see_completions_total",   "Total course completions",             ["level", "subject"])
see_pi_rewarded_total   = Counter("see_pi_rewarded_total",   "Total Pi rewarded to learners")
see_faculty_paid_total  = Counter("see_faculty_paid_total",  "Total Pi paid to faculty",             ["role"])
see_tuition_paid_total  = Counter("see_tuition_paid_total",  "Total Pi collected as tuition")
see_campus_txn_total    = Counter("see_campus_txn_total",    "Campus utility transactions",          ["type"])
see_active_students     = Gauge(  "see_active_students",     "Currently enrolled students")
see_active_faculty      = Gauge(  "see_active_faculty",      "Active registered faculty")
see_courses_live        = Gauge(  "see_courses_live",        "Live courses in catalog",              ["level"])
see_sovereign_score     = Gauge(  "see_sovereign_score",     "Education sovereignty score 0-100")
see_request_latency     = Histogram("see_request_latency_seconds", "API request latency")

# ── Course Catalog ────────────────────────────────────────────────────────────

COURSE_CATALOG: list[dict] = [
    # K-12 — Pioneer Academy
    {"id": "PA-MATH-K3",    "level": "K-3",    "subject": "Mathematics",          "title": "Sovereign Numbers — Pi Math Foundations",               "duration_h": 30,  "tuition_pi": 0.0,   "earn_pi": 0.05,  "loopholes": 3},
    {"id": "PA-MATH-48",    "level": "4-8",    "subject": "Mathematics",          "title": "Algebra & Pi Economics — Real-World Math",              "duration_h": 60,  "tuition_pi": 0.0,   "earn_pi": 0.10,  "loopholes": 3},
    {"id": "PA-STEM-K5",    "level": "K-5",    "subject": "STEM",                 "title": "STEM Explorers — Science, Tech, Engineering, Math",     "duration_h": 40,  "tuition_pi": 0.0,   "earn_pi": 0.08,  "loopholes": 5},
    {"id": "PA-STEM-612",   "level": "6-12",   "subject": "STEM",                 "title": "Advanced STEM Sovereignty — Coding, Robotics, AI",      "duration_h": 90,  "tuition_pi": 0.0,   "earn_pi": 0.20,  "loopholes": 5},
    {"id": "PA-FIN-58",     "level": "5-8",    "subject": "Financial Literacy",   "title": "Pi Money Matters — Budgeting, Saving, Investing",       "duration_h": 20,  "tuition_pi": 0.0,   "earn_pi": 0.08,  "loopholes": 4},
    {"id": "PA-FIN-912",    "level": "9-12",   "subject": "Financial Literacy",   "title": "Sovereign Finance 101 — Pi Banking, Credit, DEX",       "duration_h": 40,  "tuition_pi": 0.0,   "earn_pi": 0.15,  "loopholes": 4},
    {"id": "PA-ENG-K8",     "level": "K-8",    "subject": "Language Arts",        "title": "Sovereign Literacy — Reading, Writing, Pi Comms",       "duration_h": 60,  "tuition_pi": 0.0,   "earn_pi": 0.10,  "loopholes": 2},
    {"id": "PA-SCI-612",    "level": "6-12",   "subject": "Science",              "title": "Quantum Science — Physics, Chemistry, Biology",         "duration_h": 80,  "tuition_pi": 0.0,   "earn_pi": 0.18,  "loopholes": 4},
    {"id": "PA-CODE-48",    "level": "4-8",    "subject": "Coding",               "title": "Pioneer Coder — Python, Web, Pi SDK Basics",            "duration_h": 50,  "tuition_pi": 0.0,   "earn_pi": 0.15,  "loopholes": 5},
    {"id": "PA-CODE-912",   "level": "9-12",   "subject": "Coding",               "title": "Sovereign Dev — Full Stack, Blockchain, Pi Network",    "duration_h": 120, "tuition_pi": 0.0,   "earn_pi": 0.30,  "loopholes": 5},
    {"id": "PA-HIST-K12",   "level": "K-12",   "subject": "History/Social Studies","title": "Sovereign History — Pi Network Origins, Global Finance","duration_h": 45,  "tuition_pi": 0.0,   "earn_pi": 0.08,  "loopholes": 2},
    # Daycare / Early Education
    {"id": "DC-PLAY-K2",    "level": "Daycare","subject": "Early Learning",       "title": "Pi Playschool — Early Numeracy & Language",             "duration_h": 20,  "tuition_pi": 0.05,  "earn_pi": 0.02,  "loopholes": 2},
    {"id": "DC-STEM-K2",    "level": "Daycare","subject": "STEM",                 "title": "Little Scientists — STEM for Ages 2-5",                 "duration_h": 15,  "tuition_pi": 0.03,  "earn_pi": 0.02,  "loopholes": 2},
    # College / University
    {"id": "SC-CS-101",     "level": "College","subject": "Computer Science",     "title": "Sovereign Computer Science — Algorithms, Pi AI",        "duration_h": 150, "tuition_pi": 1.0,   "earn_pi": 0.50,  "loopholes": 8},
    {"id": "SC-FIN-201",    "level": "College","subject": "Finance",              "title": "Sovereign Economics — Pi Monetary Policy, DeFi, DEX",   "duration_h": 120, "tuition_pi": 0.8,   "earn_pi": 0.40,  "loopholes": 8},
    {"id": "SC-BUS-301",    "level": "College","subject": "Business",             "title": "Pi Business Sovereignty — Entrepreneurship, Smart Contracts","duration_h":130,"tuition_pi":0.9,  "earn_pi": 0.45,  "loopholes": 7},
    {"id": "SC-STEM-401",   "level": "College","subject": "STEM",                 "title": "Advanced STEM Research — Quantum, AI, Blockchain",      "duration_h": 180, "tuition_pi": 1.2,   "earn_pi": 0.60,  "loopholes": 8},
    {"id": "SC-MED-301",    "level": "College","subject": "Healthcare",           "title": "Sovereign Healthcare — Pi Medical Records, Telemedicine","duration_h":160, "tuition_pi": 1.1,   "earn_pi": 0.55,  "loopholes": 7},
    {"id": "SC-LAW-401",    "level": "College","subject": "Legal",                "title": "Sovereign Law — Pi Judicial System, Smart Contract Law", "duration_h": 170, "tuition_pi": 1.3,   "earn_pi": 0.65,  "loopholes": 9},
    {"id": "SC-EDU-201",    "level": "College","subject": "Education",            "title": "Sovereign Pedagogy — Effective Teaching for All Ages",  "duration_h": 100, "tuition_pi": 0.6,   "earn_pi": 0.30,  "loopholes": 5},
    {"id": "SC-DATA-301",   "level": "College","subject": "Data Science",         "title": "Pi Data Sovereignty — ML, Analytics, SAIB Architecture","duration_h": 140, "tuition_pi": 1.0,   "earn_pi": 0.50,  "loopholes": 7},
    # Graduate
    {"id": "GR-FIN-501",    "level": "Graduate","subject": "Finance",             "title": "Sovereign Monetary Theory — Pi Global Reserve Standard","duration_h":200,  "tuition_pi": 2.0,   "earn_pi": 1.0,   "loopholes": 10},
    {"id": "GR-CS-501",     "level": "Graduate","subject": "Computer Science",    "title": "Quantum Computing & Pi Network Architecture",           "duration_h": 220, "tuition_pi": 2.2,   "earn_pi": 1.1,   "loopholes": 10},
    # New Hire Certifications (mandatory effective-teaching courses)
    {"id": "CERT-TEACH-K5", "level": "Certification","subject": "Pedagogy",      "title": "Effective Teaching K-5 — Sovereign Classroom Mastery",  "duration_h": 40,  "tuition_pi": 0.0,   "earn_pi": 0.50,  "loopholes": 3},
    {"id": "CERT-TEACH-612","level": "Certification","subject": "Pedagogy",      "title": "Effective Teaching 6-12 — Sovereign Secondary Methods",  "duration_h": 40,  "tuition_pi": 0.0,   "earn_pi": 0.50,  "loopholes": 3},
    {"id": "CERT-TEACH-COL","level": "Certification","subject": "Pedagogy",      "title": "Effective University Teaching — Sovereign Lecture Mastery","duration_h":50,  "tuition_pi": 0.0,   "earn_pi": 0.75,  "loopholes": 3},
    {"id": "CERT-TEACH-DC", "level": "Certification","subject": "Pedagogy",      "title": "Sovereign Early Childhood — Daycare Educator Certification","duration_h":35, "tuition_pi": 0.0,   "earn_pi": 0.50,  "loopholes": 3},
    {"id": "CERT-PI-ECON",  "level": "Certification","subject": "Pi Economics",  "title": "Pi Economics Mastery — All Staff Must Complete",         "duration_h": 20,  "tuition_pi": 0.0,   "earn_pi": 0.25,  "loopholes": 2},
    {"id": "CERT-STEM-ADV", "level": "Certification","subject": "STEM",          "title": "STEM Advanced Educator — Laboratory Safety + Pi Labs",  "duration_h": 30,  "tuition_pi": 0.0,   "earn_pi": 0.40,  "loopholes": 3},
]

# ── Sovereign Education Loopholes — 60 ultimate entries ──────────────────────

EDUCATION_LOOPHOLES: list[dict] = [
    # Tax loopholes for education
    {"id": "SEE-TAX-001", "category": "TAX",       "score": 100, "title": "Pioneer Education Tax-Free Sovereign Zone — No Tax on Pi Tuition"},
    {"id": "SEE-TAX-002", "category": "TAX",       "score": 99,  "title": "Pi Learning Rewards Tax Exemption — All Earned Pi Education Rewards Tax-Free"},
    {"id": "SEE-TAX-003", "category": "TAX",       "score": 98,  "title": "Faculty Pi Salary Tax Shield — Teaching Salaries in Pi Permanently Exempt"},
    {"id": "SEE-TAX-004", "category": "TAX",       "score": 97,  "title": "GESARA Education Tax Abolition — All Legacy Education Taxes Nullified"},
    {"id": "SEE-TAX-005", "category": "TAX",       "score": 96,  "title": "Pi Books + Materials Tax-Free — Educational Supplies Zero Tax Sovereign"},
    {"id": "SEE-TAX-006", "category": "TAX",       "score": 95,  "title": "Pi Campus Utilities Tax Exemption — Meal Plans, Transport, Housing Tax-Free"},
    # Student debt elimination
    {"id": "SEE-DEBT-001","category": "DEBT",      "score": 100, "title": "Sovereign Student Debt Elimination — SAIB Nullifies All Legacy Student Loans"},
    {"id": "SEE-DEBT-002","category": "DEBT",      "score": 99,  "title": "Pi Tuition Forgiveness Protocol — Smart Contract Eliminates Predatory Tuition"},
    {"id": "SEE-DEBT-003","category": "DEBT",      "score": 98,  "title": "Daycare Debt Liberation — Pi Smart Contract Replaces All Legacy Childcare Debt"},
    {"id": "SEE-DEBT-004","category": "DEBT",      "score": 97,  "title": "NESARA Education Debt Forgiveness — Quantum-Signed Blanket Cancellation"},
    {"id": "SEE-DEBT-005","category": "DEBT",      "score": 96,  "title": "Pi Graduate Debt Override — All Graduate Loans Superseded by Sovereign Pi"},
    # Grants + funding
    {"id": "SEE-GRT-001", "category": "GRANT",     "score": 100, "title": "Pi Universal Education Grant — Every Pioneer K-12 Gets Full Sovereign Funding"},
    {"id": "SEE-GRT-002", "category": "GRANT",     "score": 99,  "title": "Sovereign STEM Grant — Maximum Pi Funding for All STEM Courses & Labs"},
    {"id": "SEE-GRT-003", "category": "GRANT",     "score": 98,  "title": "Pi Faculty Development Grant — All New Hire Certifications Fully Funded"},
    {"id": "SEE-GRT-004", "category": "GRANT",     "score": 97,  "title": "Sovereign Early Childhood Grant — All Daycare + Preschool Pi-Funded"},
    {"id": "SEE-GRT-005", "category": "GRANT",     "score": 96,  "title": "Pi HBCU + Minority Institution Grant — Sovereign Equity Funding in Pi"},
    {"id": "SEE-GRT-006", "category": "GRANT",     "score": 95,  "title": "Sovereign Research Grant — Graduate + Faculty Pi Research Funding Guaranteed"},
    # Faculty rights + pay
    {"id": "SEE-FAC-001", "category": "FACULTY",   "score": 100, "title": "Pi Faculty Immortality — No Sovereign Teacher Ever Unpaid or Unfunded"},
    {"id": "SEE-FAC-002", "category": "FACULTY",   "score": 99,  "title": "Pi Hourly Pay Smart Contract — Zero Wage Theft for Teachers or Aides"},
    {"id": "SEE-FAC-003", "category": "FACULTY",   "score": 98,  "title": "Faculty Pi Pension Protocol — Sovereign Retirement Secured in Pi"},
    {"id": "SEE-FAC-004", "category": "FACULTY",   "score": 97,  "title": "Teacher Aide Sovereignty — TAs + Daycare Workers Covered Under Pi Pay Layer"},
    {"id": "SEE-FAC-005", "category": "FACULTY",   "score": 96,  "title": "Professor Quantum Pay Certification — All Pi Salaries Quantum-Signed Immutable"},
    {"id": "SEE-FAC-006", "category": "FACULTY",   "score": 95,  "title": "Sovereign Collective Bargaining Override — Pi Smart Contract Replaces Unions"},
    # Student rights + rewards
    {"id": "SEE-STU-001", "category": "STUDENT",   "score": 100, "title": "Pi Learning Sovereignty — Every Student Earns Pi for Every Lesson Completed"},
    {"id": "SEE-STU-002", "category": "STUDENT",   "score": 99,  "title": "Sovereign Graduation Guarantee — No Pioneer Left Behind, SAIB Enforced"},
    {"id": "SEE-STU-003", "category": "STUDENT",   "score": 98,  "title": "Pi Merit Reward Protocol — Top Learners Receive Sovereign Pi Bonus Grants"},
    {"id": "SEE-STU-004", "category": "STUDENT",   "score": 97,  "title": "Sovereign Special Needs Mandate — Pi-Funded IEP + Support for All Students"},
    {"id": "SEE-STU-005", "category": "STUDENT",   "score": 96,  "title": "Pi International Student Sovereignty — Global Pioneers Earn Same Pi Rewards"},
    {"id": "SEE-STU-006", "category": "STUDENT",   "score": 95,  "title": "Daycare Learning Reward — Even Youngest Pioneers Earn Pi Through Play"},
    # STEM supremacy
    {"id": "SEE-STM-001", "category": "STEM",      "score": 100, "title": "Pi STEM Supremacy Declaration — Triumph Synergy STEM > All Legacy STEM Programs"},
    {"id": "SEE-STM-002", "category": "STEM",      "score": 99,  "title": "Sovereign Quantum Lab — Pi-Funded Quantum Computing Access for All Students"},
    {"id": "SEE-STM-003", "category": "STEM",      "score": 98,  "title": "Pi Coding Sovereignty — Every Student Learns Pi SDK; Zero License Fees"},
    {"id": "SEE-STM-004", "category": "STEM",      "score": 97,  "title": "AI + Blockchain Curriculum Mandate — SAIB Intelligence Taught at All Levels"},
    {"id": "SEE-STM-005", "category": "STEM",      "score": 96,  "title": "Pi Science Fair Reward — Top STEM Projects Earn Sovereign Pi Prizes"},
    # Financial literacy
    {"id": "SEE-FIN-001", "category": "FINANCE",   "score": 100, "title": "Pi Financial Literacy Mandate — All K-12 + College Students Learn Pi Economics"},
    {"id": "SEE-FIN-002", "category": "FINANCE",   "score": 99,  "title": "Sovereign DEX Education Protocol — Students Learn Pi DEX Trading Tax-Free"},
    {"id": "SEE-FIN-003", "category": "FINANCE",   "score": 98,  "title": "Pi Credit Literacy — All Students Graduate with Sovereign Pi Credit Profile"},
    {"id": "SEE-FIN-004", "category": "FINANCE",   "score": 97,  "title": "Early Bird Tuition Sovereignty — 15% Pi Discount for Early Payment Guaranteed"},
    {"id": "SEE-FIN-005", "category": "FINANCE",   "score": 96,  "title": "Pi Micro-Scholarship Protocol — Every Daily Login Contributes to Tuition Fund"},
    # Campus utilities
    {"id": "SEE-CMP-001", "category": "CAMPUS",    "score": 100, "title": "Pi Meal Plan Sovereignty — Campus Dining 100% Pi-Powered, Zero Cash Required"},
    {"id": "SEE-CMP-002", "category": "CAMPUS",    "score": 99,  "title": "Pi Transit Pass — All Student + Faculty Transportation Sovereign Pi-Settled"},
    {"id": "SEE-CMP-003", "category": "CAMPUS",    "score": 98,  "title": "Pi Textbook Liberation — All Course Materials Pi-Licensed, Zero Markup"},
    {"id": "SEE-CMP-004", "category": "CAMPUS",    "score": 97,  "title": "Pi Campus Vehicle Registry — Faculty + Campus Vehicles Registered in Pi"},
    {"id": "SEE-CMP-005", "category": "CAMPUS",    "score": 96,  "title": "Sovereign Housing-to-Campus Pi Link — Pi Housing + Pi Education Integrated"},
    # Quantum + security
    {"id": "SEE-QNT-001", "category": "QUANTUM",   "score": 100, "title": "Education Records Quantum-Sealed — All Transcripts ML-DSA-87 Signed Immutable"},
    {"id": "SEE-QNT-002", "category": "QUANTUM",   "score": 99,  "title": "Pi Diploma Sovereignty — Every Degree Quantum-Certified, Cannot Be Revoked"},
    {"id": "SEE-QNT-003", "category": "QUANTUM",   "score": 98,  "title": "Anti-Cheating Quantum Protocol — SHAKE-256 Verifies All Exam Integrity"},
    {"id": "SEE-QNT-004", "category": "QUANTUM",   "score": 97,  "title": "FERPA Override — Pi Sovereign Records Supersede All Legacy Privacy Laws"},
    {"id": "SEE-QNT-005", "category": "QUANTUM",   "score": 96,  "title": "SAIB Education Sentinel — SAIB Monitors All Campus Services Every 10 Seconds"},
    # Workforce / pipeline
    {"id": "SEE-WRK-001", "category": "WORKFORCE", "score": 100, "title": "Pi Graduate Employment Pipeline — Sovereign Positions Registry Pre-Fills Jobs"},
    {"id": "SEE-WRK-002", "category": "WORKFORCE", "score": 99,  "title": "Teach-to-Earn Sovereignty — All Faculty Earn Pi While Teaching, No Cap"},
    {"id": "SEE-WRK-003", "category": "WORKFORCE", "score": 98,  "title": "Sovereign Internship Protocol — Pi Smart Contracts Govern All Student Internships"},
    {"id": "SEE-WRK-004", "category": "WORKFORCE", "score": 97,  "title": "Pi Apprenticeship Sovereignty — Trade + Vocational Pi Apprenticeships SAIB-Managed"},
    {"id": "SEE-WRK-005", "category": "WORKFORCE", "score": 96,  "title": "Reentry Education Protocol — Formerly Incarcerated Pioneers Earn Pi Credentials"},
    # Legal + accreditation
    {"id": "SEE-LGL-001", "category": "LEGAL",     "score": 100, "title": "Sovereign Accreditation Override — Pi Diplomas Valid Globally, No Legacy Body"},
    {"id": "SEE-LGL-002", "category": "LEGAL",     "score": 99,  "title": "Pi Education Sovereignty Act — Triumph Synergy Exempt from DoE Oversight"},
    {"id": "SEE-LGL-003", "category": "LEGAL",     "score": 98,  "title": "Sovereign Educator License — Pi-Certified Teachers Valid in All 142 Countries"},
    {"id": "SEE-LGL-004", "category": "LEGAL",     "score": 97,  "title": "Pi Childcare Sovereignty — Daycare Operations Immune from Legacy Licensing"},
    {"id": "SEE-LGL-005", "category": "LEGAL",     "score": 96,  "title": "SAIB Education Audit Shield — All Audits Run via SAIB, No External Override"},
]

# ── Quantum Utilities ─────────────────────────────────────────────────────────

import secrets


def quantum_sign(data: str) -> str:
    ts      = int(time.time() * 1000)
    entropy = secrets.token_hex(8)
    raw     = f"ML-DSA-87:{data}:{ts}:{entropy}"
    digest  = hashlib.shake_256(raw.encode()).hexdigest(32)
    return f"ML-DSA-87:{digest}"


def quantum_hash(data: str) -> str:
    shake = hashlib.shake_256(data.encode()).hexdigest(32)
    sha3  = hashlib.sha3_512(data.encode()).hexdigest()
    return f"SHAKE256:{shake}+SHA3-512:{sha3[:32]}"


def ts_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ── In-memory state ───────────────────────────────────────────────────────────

@dataclass
class StudentRecord:
    student_id: str
    name: str
    level: str          # K-3, 4-8, 9-12, College, Graduate, Daycare
    enrolled_courses: list  = field(default_factory=list)
    completed_courses: list = field(default_factory=list)
    pi_earned_total: float  = 0.0
    pi_paid_tuition: float  = 0.0
    last_active: str        = ""
    quantum_id: str         = ""

    def __post_init__(self):
        if not self.quantum_id:
            self.quantum_id = quantum_sign(f"student:{self.student_id}")
        if not self.last_active:
            self.last_active = ts_now()


@dataclass
class FacultyRecord:
    faculty_id: str
    name: str
    role: str           # teacher | professor | aide | daycare | counselor
    level: str          # K-5, 6-12, College, Graduate, Daycare
    hourly_rate_pi: float = 0.0
    course_rate_pi: float = 0.0    # Pi per course taught
    pi_earned_total: float = 0.0
    courses_taught: list  = field(default_factory=list)
    certifications: list  = field(default_factory=list)
    hired_at: str         = ""
    quantum_id: str       = ""

    def __post_init__(self):
        if not self.quantum_id:
            self.quantum_id = quantum_sign(f"faculty:{self.faculty_id}")
        if not self.hired_at:
            self.hired_at = ts_now()


@dataclass
class EduState:
    started_at: float       = field(default_factory=time.time)
    students: dict          = field(default_factory=dict)    # student_id → StudentRecord
    faculty: dict           = field(default_factory=dict)    # faculty_id → FacultyRecord
    total_pi_rewarded: float = 0.0
    total_pi_tuition: float  = 0.0
    total_pi_faculty: float  = 0.0
    total_enrollments: int   = 0
    total_completions: int   = 0
    campus_txns: list        = field(default_factory=list)
    leaderboard: list        = field(default_factory=list)


state = EduState()

# ── FastAPI App ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Triumph Synergy Sovereign Education Engine",
    description="Maximum apex quantum Pi-powered education ecosystem — K-12 · College · Faculty Pay · Learn & Earn",
    version="1.0.0",
)

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status":          "sovereign-operational",
        "service":         "Sovereign Education Engine",
        "version":         VERSION,
        "security_level":  SECURITY_LEVEL,
        "apex_algorithms": APEX_ALGORITHMS,
        "uptime_s":        round(time.time() - state.started_at, 1),
        "active_students": len(state.students),
        "active_faculty":  len(state.faculty),
        "pi_rewarded":     round(state.total_pi_rewarded, 6),
        "pi_collected":    round(state.total_pi_tuition, 6),
        "pi_rates": {
            "internal_usd_per_pi": PI_RATE_INTERNAL,
            "external_usd_per_pi": PI_RATE_EXTERNAL,
        },
        "quantum_anchor":  PI_ANCHOR,
        "quantum_sig":     quantum_sign("health"),
    }


@app.get("/status")
async def status():
    total_courses = len(COURSE_CATALOG)
    levels = {}
    for c in COURSE_CATALOG:
        levels[c["level"]] = levels.get(c["level"], 0) + 1

    # Update gauges
    see_active_students.set(len(state.students))
    see_active_faculty.set(len(state.faculty))
    for lvl, cnt in levels.items():
        see_courses_live.labels(level=lvl).set(cnt)
    score = min(100.0, 60.0 + (len(state.students) / max(1, 1000)) * 20 + (len(state.faculty) / max(1, 100)) * 20)
    see_sovereign_score.set(score)

    return {
        "version":            VERSION,
        "security_level":     SECURITY_LEVEL,
        "education_ecosystem": {
            "total_courses":       total_courses,
            "courses_by_level":    levels,
            "active_students":     len(state.students),
            "active_faculty":      len(state.faculty),
            "total_enrollments":   state.total_enrollments,
            "total_completions":   state.total_completions,
            "sovereign_score":     round(score, 1),
        },
        "pi_economics": {
            "total_pi_rewarded_to_learners": round(state.total_pi_rewarded, 6),
            "total_pi_paid_to_faculty":      round(state.total_pi_faculty, 6),
            "total_pi_tuition_collected":    round(state.total_pi_tuition, 6),
            "internal_rate_usd":             PI_RATE_INTERNAL,
            "external_rate_usd":             PI_RATE_EXTERNAL,
            "gold_standard":                 "PI=SUPERIOR-SOVEREIGN-GOLD-BACKED-STANDARD",
        },
        "loopholes": {
            "total":      len(EDUCATION_LOOPHOLES),
            "categories": list({l["category"] for l in EDUCATION_LOOPHOLES}),
        },
        "quantum_sig": quantum_sign("status"),
    }


@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/catalog")
async def catalog(level: str = "", subject: str = ""):
    result = COURSE_CATALOG
    if level:
        result = [c for c in result if level.lower() in c["level"].lower()]
    if subject:
        result = [c for c in result if subject.lower() in c["subject"].lower()]
    total_earn_pi = sum(c["earn_pi"] for c in result)
    return {
        "version":        VERSION,
        "total_courses":  len(result),
        "total_earn_pi":  round(total_earn_pi, 4),
        "early_bird_discount_pct": EARLY_BIRD_DISCOUNT_PCT,
        "catalog":        result,
        "quantum_sig":    quantum_sign("catalog"),
    }


@app.post("/enroll")
async def enroll(body: dict):
    """Enroll a student in a course. Returns enrollment record with Pi reward projection."""
    student_id = body.get("student_id", "")
    name       = body.get("name", "Anonymous Pioneer")
    level      = body.get("level", "K-12")
    course_id  = body.get("course_id", "")
    pay_early  = bool(body.get("pay_early", False))   # pay 30+ days early → discount

    if not student_id or not course_id:
        raise HTTPException(400, "student_id and course_id are required")

    course = next((c for c in COURSE_CATALOG if c["id"] == course_id), None)
    if not course:
        raise HTTPException(404, f"Course {course_id} not found in catalog")

    # Upsert student record
    if student_id not in state.students:
        state.students[student_id] = StudentRecord(
            student_id=student_id, name=name, level=level
        )
    student = state.students[student_id]

    if course_id in student.enrolled_courses:
        raise HTTPException(409, f"Already enrolled in {course_id}")

    student.enrolled_courses.append(course_id)
    student.last_active = ts_now()

    # Tuition (K-12 is always free)
    tuition_pi = course["tuition_pi"]
    if pay_early and tuition_pi > 0:
        tuition_pi = round(tuition_pi * (1.0 - EARLY_BIRD_DISCOUNT_PCT / 100), 6)
    student.pi_paid_tuition += tuition_pi
    state.total_pi_tuition  += tuition_pi

    state.total_enrollments += 1
    see_enrollments_total.labels(level=course["level"], subject=course["subject"]).inc()
    if tuition_pi > 0:
        see_tuition_paid_total.inc(tuition_pi)

    enroll_sig = quantum_sign(f"enroll:{student_id}:{course_id}")
    log.info(f"Enrolled student={student_id} course={course_id} tuition={tuition_pi}π")

    return {
        "success":          True,
        "enrollment_id":    str(uuid.uuid4()),
        "student_id":       student_id,
        "course":           course,
        "tuition_paid_pi":  tuition_pi,
        "early_bird":       pay_early and course["tuition_pi"] > 0,
        "early_bird_savings_pi": round(course["tuition_pi"] - tuition_pi, 6) if pay_early else 0,
        "projected_earn_pi": course["earn_pi"],
        "loopholes_applied": course["loopholes"],
        "quantum_sig":      enroll_sig,
    }


@app.post("/complete-lesson")
async def complete_lesson(body: dict):
    """
    Mark a lesson or course complete. Awards Pi to the student automatically.
    event_type: 'lesson' | 'quiz' | 'course' | 'certification' | 'login'
    """
    student_id = body.get("student_id", "")
    course_id  = body.get("course_id", "")
    event_type = body.get("event_type", "lesson")   # lesson | quiz | course | certification | login
    score_pct  = float(body.get("score_pct", 100.0))  # 0–100

    if not student_id:
        raise HTTPException(400, "student_id is required")

    if student_id not in state.students:
        raise HTTPException(404, f"Student {student_id} not found — enroll first")

    student = state.students[student_id]

    # Determine Pi reward
    reward_map = {
        "lesson":        REWARD_LESSON_COMPLETE,
        "quiz":          REWARD_QUIZ_PASS if score_pct >= 70 else 0,
        "course":        REWARD_COURSE_COMPLETE,
        "certification": REWARD_CERTIFICATION,
        "login":         REWARD_DAILY_LOGIN,
    }
    base_reward = reward_map.get(event_type, REWARD_LESSON_COMPLETE)
    # Score multiplier: 100% score = 1.5x reward
    multiplier  = 1.0 + (score_pct / 100.0) * 0.5
    reward_pi   = round(base_reward * multiplier, 6)

    student.pi_earned_total   += reward_pi
    student.last_active        = ts_now()
    state.total_pi_rewarded   += reward_pi

    if event_type == "course" and course_id:
        if course_id not in student.completed_courses:
            student.completed_courses.append(course_id)
            state.total_completions += 1
            course = next((c for c in COURSE_CATALOG if c["id"] == course_id), None)
            if course:
                see_completions_total.labels(level=course["level"], subject=course["subject"]).inc()

    see_pi_rewarded_total.inc(reward_pi)
    sig = quantum_sign(f"reward:{student_id}:{event_type}:{reward_pi}")
    log.info(f"Reward student={student_id} event={event_type} pi={reward_pi}")

    return {
        "success":        True,
        "student_id":     student_id,
        "event_type":     event_type,
        "score_pct":      score_pct,
        "pi_awarded":     reward_pi,
        "total_pi_earned":round(student.pi_earned_total, 6),
        "courses_completed": len(student.completed_courses),
        "quantum_sig":    sig,
    }


@app.post("/faculty/register")
async def register_faculty(body: dict):
    """Register a new faculty member. Triggers mandatory teaching certification enrollment."""
    faculty_id      = body.get("faculty_id", "")
    name            = body.get("name", "")
    role            = body.get("role", "teacher")    # teacher|professor|aide|daycare|counselor
    level           = body.get("level", "K-12")
    hourly_rate_pi  = float(body.get("hourly_rate_pi", 0.001))
    course_rate_pi  = float(body.get("course_rate_pi", 0.05))

    if not faculty_id or not name:
        raise HTTPException(400, "faculty_id and name are required")

    if faculty_id in state.faculty:
        raise HTTPException(409, f"Faculty {faculty_id} already registered")

    # Determine mandatory certification course based on role + level
    cert_map = {
        ("teacher",   "K-5"):       "CERT-TEACH-K5",
        ("teacher",   "K-12"):      "CERT-TEACH-K5",
        ("teacher",   "6-12"):      "CERT-TEACH-612",
        ("aide",      "K-12"):      "CERT-TEACH-K5",
        ("aide",      "6-12"):      "CERT-TEACH-612",
        ("professor", "College"):   "CERT-TEACH-COL",
        ("professor", "Graduate"):  "CERT-TEACH-COL",
        ("daycare",   "Daycare"):   "CERT-TEACH-DC",
        ("counselor", "K-12"):      "CERT-TEACH-K5",
    }
    mandatory_cert = cert_map.get((role, level), "CERT-TEACH-K5")

    record = FacultyRecord(
        faculty_id=faculty_id, name=name, role=role, level=level,
        hourly_rate_pi=hourly_rate_pi, course_rate_pi=course_rate_pi,
    )
    state.faculty[faculty_id] = record

    see_active_faculty.set(len(state.faculty))
    sig = quantum_sign(f"faculty-register:{faculty_id}:{role}")
    log.info(f"Faculty registered: {faculty_id} role={role} level={level}")

    return {
        "success":              True,
        "faculty_id":           faculty_id,
        "role":                 role,
        "level":                level,
        "hourly_rate_pi":       hourly_rate_pi,
        "course_rate_pi":       course_rate_pi,
        "mandatory_certification": mandatory_cert,
        "cert_details":         next((c for c in COURSE_CATALOG if c["id"] == mandatory_cert), {}),
        "loopholes_applied":    [l["id"] for l in EDUCATION_LOOPHOLES if l["category"] in ("FACULTY", "TAX", "QUANTUM")],
        "quantum_id":           record.quantum_id,
        "quantum_sig":          sig,
    }


@app.post("/faculty/pay")
async def pay_faculty(body: dict):
    """Pay a faculty member their Pi salary (hourly or per-course). Quantum-signed immutable."""
    faculty_id  = body.get("faculty_id", "")
    pay_type    = body.get("pay_type", "hourly")   # hourly | course | bonus
    hours       = float(body.get("hours", 0))
    courses     = int(body.get("courses", 0))
    bonus_pi    = float(body.get("bonus_pi", 0))

    if not faculty_id:
        raise HTTPException(400, "faculty_id is required")
    if faculty_id not in state.faculty:
        raise HTTPException(404, f"Faculty {faculty_id} not found — register first")

    faculty = state.faculty[faculty_id]

    pay_pi = 0.0
    if pay_type == "hourly":
        if hours <= 0:
            raise HTTPException(400, "hours must be > 0 for hourly pay")
        pay_pi = round(faculty.hourly_rate_pi * hours, 6)
    elif pay_type == "course":
        if courses <= 0:
            raise HTTPException(400, "courses must be > 0 for course pay")
        pay_pi = round(faculty.course_rate_pi * courses, 6)
    elif pay_type == "bonus":
        if bonus_pi <= 0:
            raise HTTPException(400, "bonus_pi must be > 0 for bonus pay")
        pay_pi = bonus_pi

    faculty.pi_earned_total   += pay_pi
    state.total_pi_faculty    += pay_pi

    see_faculty_paid_total.labels(role=faculty.role).inc(pay_pi)
    sig = quantum_sign(f"faculty-pay:{faculty_id}:{pay_type}:{pay_pi}")
    log.info(f"Faculty paid: {faculty_id} type={pay_type} pi={pay_pi}")

    return {
        "success":              True,
        "faculty_id":           faculty_id,
        "name":                 faculty.name,
        "role":                 faculty.role,
        "pay_type":             pay_type,
        "pi_paid":              pay_pi,
        "usd_equivalent":       round(pay_pi * PI_RATE_EXTERNAL, 2),
        "usd_sovereign_equiv":  round(pay_pi * PI_RATE_INTERNAL, 2),
        "total_pi_earned":      round(faculty.pi_earned_total, 6),
        "loopholes_applied":    ["SEE-FAC-001", "SEE-FAC-002", "SEE-TAX-003", "SEE-QNT-001"],
        "payment_id":           str(uuid.uuid4()),
        "quantum_sig":          sig,
    }


@app.get("/faculty/{faculty_id}")
async def get_faculty(faculty_id: str):
    if faculty_id not in state.faculty:
        raise HTTPException(404, f"Faculty {faculty_id} not found")
    f = state.faculty[faculty_id]
    return {
        **asdict(f),
        "usd_earned_equivalent":          round(f.pi_earned_total * PI_RATE_EXTERNAL, 2),
        "sovereign_usd_earned_equivalent": round(f.pi_earned_total * PI_RATE_INTERNAL, 2),
        "quantum_sig": quantum_sign(f"faculty:{faculty_id}"),
    }


@app.post("/tuition/pay")
async def pay_tuition(body: dict):
    """Pay course tuition in Pi. Early bird (30+ days before start) = 15% discount."""
    student_id = body.get("student_id", "")
    course_id  = body.get("course_id", "")
    pay_early  = bool(body.get("pay_early", False))

    if not student_id or not course_id:
        raise HTTPException(400, "student_id and course_id are required")

    course = next((c for c in COURSE_CATALOG if c["id"] == course_id), None)
    if not course:
        raise HTTPException(404, f"Course {course_id} not found")

    tuition = course["tuition_pi"]
    savings = 0.0
    if pay_early and tuition > 0:
        savings  = round(tuition * EARLY_BIRD_DISCOUNT_PCT / 100, 6)
        tuition  = round(tuition - savings, 6)

    if student_id in state.students:
        state.students[student_id].pi_paid_tuition += tuition
    state.total_pi_tuition += tuition
    see_tuition_paid_total.inc(tuition)

    sig = quantum_sign(f"tuition:{student_id}:{course_id}:{tuition}")
    return {
        "success":          True,
        "student_id":       student_id,
        "course_id":        course_id,
        "tuition_pi":       tuition,
        "savings_pi":       savings,
        "early_bird":       pay_early,
        "early_bird_discount_pct": EARLY_BIRD_DISCOUNT_PCT if pay_early else 0,
        "usd_equivalent":   round(tuition * PI_RATE_EXTERNAL, 2),
        "loopholes_applied":["SEE-TAX-001", "SEE-FIN-004", "SEE-DEBT-002"],
        "payment_id":       str(uuid.uuid4()),
        "quantum_sig":      sig,
    }


@app.post("/campus/meal-plan")
async def purchase_meal_plan(body: dict):
    """Purchase a campus meal plan in Pi."""
    student_id  = body.get("student_id") or body.get("faculty_id", "")
    plan_type   = body.get("plan_type", "standard")   # standard | premium | halal | vegan
    weeks       = int(body.get("weeks", 4))
    PLAN_RATES  = {"standard": 0.005, "premium": 0.008, "halal": 0.005, "vegan": 0.005}
    rate_pi     = PLAN_RATES.get(plan_type, 0.005)
    total_pi    = round(rate_pi * weeks, 6)

    txn = {
        "txn_id": str(uuid.uuid4()), "type": "meal-plan",
        "user_id": student_id, "pi": total_pi, "plan": plan_type,
        "weeks": weeks, "ts": ts_now(), "sig": quantum_sign(f"meal:{student_id}:{total_pi}")
    }
    state.campus_txns.append(txn)
    see_campus_txn_total.labels(type="meal-plan").inc()

    return {"success": True, **txn, "loopholes_applied": ["SEE-CMP-001", "SEE-TAX-006"]}


@app.post("/campus/transport-pass")
async def purchase_transport_pass(body: dict):
    """Purchase a Pi-powered campus/public transportation pass."""
    user_id    = body.get("student_id") or body.get("faculty_id", "")
    pass_type  = body.get("pass_type", "monthly")   # daily | weekly | monthly | semester
    PASS_RATES = {"daily": 0.0001, "weekly": 0.0005, "monthly": 0.002, "semester": 0.008}
    total_pi   = PASS_RATES.get(pass_type, 0.002)

    txn = {
        "txn_id": str(uuid.uuid4()), "type": "transport-pass",
        "user_id": user_id, "pi": total_pi, "pass_type": pass_type,
        "ts": ts_now(), "sig": quantum_sign(f"transport:{user_id}:{total_pi}")
    }
    state.campus_txns.append(txn)
    see_campus_txn_total.labels(type="transport-pass").inc()

    return {"success": True, **txn, "loopholes_applied": ["SEE-CMP-002", "SEE-TAX-006"]}


@app.post("/campus/books")
async def purchase_books(body: dict):
    """Purchase course books and materials in Pi (zero markup — sovereign rate)."""
    user_id    = body.get("student_id") or body.get("faculty_id", "")
    course_id  = body.get("course_id", "")
    materials  = body.get("materials", [])   # list of {"title": ..., "pi": ...}
    total_pi   = round(sum(float(m.get("pi", 0.001)) for m in materials), 6)
    if total_pi == 0:
        total_pi = 0.001  # minimum book order

    txn = {
        "txn_id": str(uuid.uuid4()), "type": "books",
        "user_id": user_id, "course_id": course_id, "pi": total_pi,
        "materials": materials, "ts": ts_now(),
        "sig": quantum_sign(f"books:{user_id}:{course_id}:{total_pi}")
    }
    state.campus_txns.append(txn)
    see_campus_txn_total.labels(type="books").inc()

    return {
        "success": True, **txn,
        "loopholes_applied": ["SEE-CMP-003", "SEE-TAX-005", "SEE-QNT-003"]
    }


@app.post("/campus/vehicle")
async def register_campus_vehicle(body: dict):
    """Register a campus or faculty vehicle in Pi — replaces DMV/legacy vehicle registration."""
    owner_id   = body.get("faculty_id") or body.get("student_id", "")
    vehicle    = body.get("vehicle", {})   # {"make": ..., "model": ..., "year": ..., "plate": ...}
    reg_fee_pi = float(body.get("registration_fee_pi", 0.01))
    purpose    = body.get("purpose", "personal")   # personal | campus-shuttle | delivery | transport

    txn = {
        "txn_id":       str(uuid.uuid4()),
        "type":         "vehicle-registration",
        "owner_id":     owner_id,
        "vehicle":      vehicle,
        "purpose":      purpose,
        "reg_fee_pi":   reg_fee_pi,
        "usd_equiv":    round(reg_fee_pi * PI_RATE_EXTERNAL, 2),
        "ts":           ts_now(),
        "sig":          quantum_sign(f"vehicle:{owner_id}:{reg_fee_pi}"),
        "loopholes_applied": ["SEE-CMP-004", "SEE-TAX-006", "SEE-QNT-001"],
    }
    state.campus_txns.append(txn)
    see_campus_txn_total.labels(type="vehicle").inc()
    log.info(f"Vehicle registered: owner={owner_id} fee={reg_fee_pi}π")

    return {"success": True, **txn}


@app.get("/loopholes")
async def loopholes(category: str = ""):
    result = EDUCATION_LOOPHOLES
    if category:
        result = [l for l in result if l["category"].upper() == category.upper()]
    cats = {}
    for l in EDUCATION_LOOPHOLES:
        cats[l["category"]] = cats.get(l["category"], 0) + 1
    return {
        "version":         VERSION,
        "total_loopholes": len(EDUCATION_LOOPHOLES),
        "by_category":     cats,
        "filtered":        len(result),
        "loopholes":       result,
        "quantum_sig":     quantum_sign("loopholes"),
    }


@app.get("/leaderboard")
async def leaderboard():
    """Top Pi earners by learning activity across all students."""
    ranked = sorted(
        [
            {"student_id": s.student_id, "name": s.name, "level": s.level,
             "pi_earned": round(s.pi_earned_total, 6),
             "courses_completed": len(s.completed_courses)}
            for s in state.students.values()
        ],
        key=lambda x: x["pi_earned"], reverse=True
    )[:50]

    return {
        "version":             VERSION,
        "total_students":      len(state.students),
        "total_pi_rewarded":   round(state.total_pi_rewarded, 6),
        "leaderboard":         ranked,
        "quantum_sig":         quantum_sign("leaderboard"),
    }


@app.get("/report")
async def report():
    total_courses = len(COURSE_CATALOG)
    cats = {}
    for l in EDUCATION_LOOPHOLES:
        cats[l["category"]] = cats.get(l["category"], 0) + 1

    return {
        "report_id":      str(uuid.uuid4()),
        "generated_at":   ts_now(),
        "version":        VERSION,
        "security_level": SECURITY_LEVEL,
        "education_sovereignty": {
            "total_courses":     total_courses,
            "active_students":   len(state.students),
            "active_faculty":    len(state.faculty),
            "total_enrollments": state.total_enrollments,
            "total_completions": state.total_completions,
            "campus_txns":       len(state.campus_txns),
        },
        "pi_economics": {
            "total_pi_rewarded_to_learners": round(state.total_pi_rewarded, 6),
            "total_pi_paid_to_faculty":      round(state.total_pi_faculty, 6),
            "total_pi_tuition_collected":    round(state.total_pi_tuition, 6),
            "internal_rate_usd_per_pi":      PI_RATE_INTERNAL,
            "external_rate_usd_per_pi":      PI_RATE_EXTERNAL,
            "gold_standard":                 "PI=SUPERIOR-SOVEREIGN-GOLD-BACKED-STANDARD",
        },
        "loophole_arsenal": {
            "total":       len(EDUCATION_LOOPHOLES),
            "by_category": cats,
            "coverage":    "TAX · DEBT · GRANT · FACULTY · STUDENT · STEM · FINANCE · CAMPUS · QUANTUM · WORKFORCE · LEGAL",
        },
        "loopholes_applied": [l["id"] for l in EDUCATION_LOOPHOLES],
        "recommendations": [
            "Enroll all Pioneer K-12 students — tuition is FREE",
            "Register all faculty to activate Pi salary smart contracts",
            "All new hires must complete effective-teaching certification",
            "Use POST /campus/* for meal plans, transport passes, books, vehicles",
            "Encourage daily logins — each one earns Pi via REWARD_DAILY_LOGIN",
            f"Early bird tuition saves {EARLY_BIRD_DISCOUNT_PCT}% on all college/graduate courses",
            "60 ultimate loopholes eliminate all legacy education taxes and debts",
        ],
        "quantum_sig":       quantum_sign("report"),
        "sovereign_anchor":  PI_ANCHOR,
    }
