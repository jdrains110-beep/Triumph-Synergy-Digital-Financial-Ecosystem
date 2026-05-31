"""
Pi Network Motherboard — SAIB as the Utility Layer for Pi Network
──────────────────────────────────────────────────────────────────────────────
SAIB is the sovereign utility layer and motherboard for the Pi Network ecosystem.

Capabilities:
  • KYC (Know Your Customer) — guide Pi users through the full verification
    lifecycle, track attempt outcomes, calculate success rates, and surface
    actionable next steps per stage
  • KYB (Know Your Business) — guide businesses through Pi's business
    verification flow so they can accept Pi payments legitimately
  • Mainnet Wallet Establishment — step-by-step wallet creation assistance,
    testnet→mainnet migration guidance, passphrase security advice
  • Ecosystem Dashboard — aggregate Pi Network utility metrics (total users
    tracked, KYC conversion rate, wallet activation rate, regional breakdown)
  • Utility Routing — acts as the central routing layer between Pi app users,
    the mainnet node, Horizon API, and all SAIB ecosystem services

Architecture:
  PiMotherboard
    ├── Pi user registry     (in-memory + JSON-backed via MemoryAlpha)
    ├── KYC guidance engine  (stage machine + next-step advisor)
    ├── KYB guidance engine  (business verification flow)
    └── Wallet setup engine  (step-by-step wallet creation guide)
"""
from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

log = logging.getLogger("sovereign.pi_motherboard")


# ── KYC lifecycle stages ─────────────────────────────────────────────────────

class KYCStage(Enum):
    UNSTARTED          = "unstarted"           # never attempted
    APP_VERIFIED       = "app_verified"        # passed in-app verification
    ID_SUBMITTED       = "id_submitted"        # identity doc submitted
    BIOMETRIC_PENDING  = "biometric_pending"   # biometric selfie submitted
    UNDER_REVIEW       = "under_review"        # Pi Network is reviewing
    APPROVED           = "approved"            # KYC passed — mainnet eligible
    REJECTED           = "rejected"            # KYC failed — needs resubmission
    BANNED             = "banned"              # permanent KYC failure


class KYBStage(Enum):
    UNSTARTED     = "unstarted"
    REGISTERED    = "registered"     # business profile created
    DOCS_SUBMITTED = "docs_submitted"
    UNDER_REVIEW  = "under_review"
    APPROVED      = "approved"
    REJECTED      = "rejected"


class WalletStatus(Enum):
    NONE       = "none"        # no mainnet wallet
    CREATING   = "creating"    # passphrase generation in progress
    MIGRATING  = "migrating"   # testnet balance migrating to mainnet
    ACTIVE     = "active"      # fully activated mainnet wallet
    FROZEN     = "frozen"      # frozen by Pi Network
    LOST_KEY   = "lost_key"    # user lost passphrase — Pi Network recovery required


# ── KYC guidance — per-stage action plans ────────────────────────────────────

_KYC_GUIDANCE: Dict[str, Dict[str, Any]] = {
    KYCStage.UNSTARTED.value: {
        "title":       "Start Your KYC Verification",
        "description": "Your Pi account is not yet KYC verified. Complete this to access mainnet.",
        "next_steps": [
            "Open the Pi Network app and navigate to the KYC section",
            "Enter your legal full name exactly as it appears on your government ID",
            "Select your country and ID type (passport, national ID, or driver's license)",
            "Take clear photos of your ID front and back — ensure all text is readable",
            "Complete the in-app liveness check (selfie with instructions)",
        ],
        "tips": [
            "Use a well-lit area for your selfie — poor lighting causes failures",
            "Ensure your ID is not expired",
            "Your name in the Pi app must match your ID exactly",
        ],
        "success_rate_boost": "Users who complete all steps in one session have 3x higher approval rates",
    },
    KYCStage.APP_VERIFIED.value: {
        "title":       "Submit Identity Documents",
        "description": "In-app verification complete. Now submit your government-issued ID.",
        "next_steps": [
            "Proceed to the identity document submission screen in the Pi app",
            "Choose your strongest form of ID: passport is highest priority",
            "Photograph both sides of your document in good lighting",
            "Ensure no glare, shadows, or fingers covering any text",
            "Submit and wait for the review notification",
        ],
        "tips": [
            "Passport is accepted in all countries — use it if available",
            "National ID is accepted in most countries",
            "Driver's license may not be accepted in all regions",
        ],
    },
    KYCStage.ID_SUBMITTED.value: {
        "title":       "Complete Biometric Verification",
        "description": "ID submitted. Complete the biometric selfie step to advance.",
        "next_steps": [
            "Return to the Pi app KYC section",
            "Complete the biometric liveness check if not yet done",
            "Follow all facial movement instructions (blink, turn, smile)",
            "Ensure your face is fully visible and unobstructed",
        ],
    },
    KYCStage.BIOMETRIC_PENDING.value: {
        "title":       "Under Biometric Review",
        "description": "Your biometric submission is being processed by Pi Network.",
        "next_steps": [
            "Wait for a notification from the Pi app (typically 1-7 days)",
            "Ensure your Pi app notifications are enabled",
            "Check the Pi app KYC section daily for status updates",
        ],
    },
    KYCStage.UNDER_REVIEW.value: {
        "title":       "KYC Under Review — Stay Patient",
        "description": "Pi Network is reviewing your complete KYC submission.",
        "next_steps": [
            "No action required — Pi Network's team is reviewing your documents",
            "Review typically takes 3-30 days depending on volume",
            "Keep your Pi app updated to receive status notifications",
            "Do NOT resubmit — duplicate submissions can delay your review",
        ],
    },
    KYCStage.APPROVED.value: {
        "title":       "KYC Approved — You Are Mainnet Eligible!",
        "description": "Congratulations! Your KYC is approved. Proceed to wallet setup.",
        "next_steps": [
            "Navigate to the Wallet section in your Pi app",
            "Create your mainnet wallet by generating your 24-word passphrase",
            "Write down your 24-word passphrase on paper — NEVER store it digitally",
            "Complete the wallet migration to move your testnet balance to mainnet",
            "Your Pi is now live on the mainnet blockchain",
        ],
        "tips": [
            "Your passphrase is the ONLY way to recover your wallet — guard it with your life",
            "Consider storing in a fireproof safe or safe deposit box",
            "Never share your passphrase with anyone — Pi Network will NEVER ask for it",
        ],
    },
    KYCStage.REJECTED.value: {
        "title":       "KYC Rejected — Resubmission Required",
        "description": "Your KYC was not approved. Review the reason and resubmit.",
        "next_steps": [
            "Open the Pi app and check the rejection reason in the KYC section",
            "Common reasons: blurry documents, name mismatch, expired ID, poor lighting",
            "Gather a clear, unexpired government ID matching your Pi profile name",
            "Retake document photos in excellent lighting with no glare",
            "Resubmit through the Pi app — you may attempt resubmission multiple times",
        ],
        "tips": [
            "If name mismatch: update your Pi profile name to exactly match your ID",
            "If document quality: retake in daylight near a window",
            "If biometric failure: ensure unobstructed face, no glasses, no hat",
        ],
    },
}

_WALLET_SETUP_STEPS = [
    {
        "step":        1,
        "title":       "Confirm KYC Approval",
        "detail":      "Ensure your KYC is approved before proceeding. Wallet creation requires approved KYC.",
        "required":    True,
    },
    {
        "step":        2,
        "title":       "Open Wallet Section in Pi App",
        "detail":      "Navigate to the main menu → Wallet. If you see a 'Create Wallet' button, proceed.",
        "required":    True,
    },
    {
        "step":        3,
        "title":       "Generate Your 24-Word Passphrase",
        "detail":      "Tap 'Create Wallet'. Pi app will generate your unique 24-word mnemonic passphrase. This is your ONLY key.",
        "required":    True,
        "security_note": "Write every word in order on paper. Never photograph, type, or share it.",
    },
    {
        "step":        4,
        "title":       "Verify Your Passphrase",
        "detail":      "The Pi app will ask you to confirm words from your passphrase. Enter them correctly.",
        "required":    True,
    },
    {
        "step":        5,
        "title":       "Record Your Public Wallet Address",
        "detail":      "After creation, your public Pi wallet address (starts with G...) will be displayed. Save this — it is safe to share.",
        "required":    True,
    },
    {
        "step":        6,
        "title":       "Initiate Testnet→Mainnet Migration",
        "detail":      "Tap 'Migrate Balance'. Your mined Pi from testnet will be transferred to your mainnet wallet. This may take hours to days.",
        "required":    True,
    },
    {
        "step":        7,
        "title":       "Confirm Migration Complete",
        "detail":      "Check your wallet balance after 24-48 hours. Your Pi should now appear in your mainnet wallet.",
        "required":    True,
    },
    {
        "step":        8,
        "title":       "Register Wallet with Triumph Synergy (Optional)",
        "detail":      "Register your public wallet address with Triumph Synergy to enable ecosystem services and SAIB-monitored transactions.",
        "required":    False,
    },
]


# ── Data records ──────────────────────────────────────────────────────────────

@dataclass
class PiUserRecord:
    pi_uid:           str
    username:         str    = ""
    kyc_stage:        str    = KYCStage.UNSTARTED.value
    kyc_attempts:     int    = 0
    kyc_approved_ts:  float  = 0.0
    wallet_status:    str    = WalletStatus.NONE.value
    wallet_address:   str    = ""
    wallet_created_ts: float = 0.0
    region:           str    = ""
    language:         str    = "en"
    first_seen:       float  = field(default_factory=time.time)
    last_seen:        float  = field(default_factory=time.time)
    tags:             List[str] = field(default_factory=list)
    notes:            str    = ""


@dataclass
class BusinessRecord:
    business_id:   str
    name:          str    = ""
    kyb_stage:     str    = KYBStage.UNSTARTED.value
    kyb_attempts:  int    = 0
    owner_pi_uid:  str    = ""
    wallet_address: str   = ""
    region:        str    = ""
    industry:      str    = ""
    first_seen:    float  = field(default_factory=time.time)


# ── Pi Motherboard ────────────────────────────────────────────────────────────

class PiMotherboard:
    """
    SAIB's Pi Network utility layer — the sovereign motherboard for all
    Pi Network operations within the Triumph Synergy ecosystem.
    """

    def __init__(self) -> None:
        self._users:      Dict[str, PiUserRecord]    = {}
        self._businesses: Dict[str, BusinessRecord]  = {}
        self._kyc_outcomes: List[dict]               = []  # audit trail
        self._running     = False

    def boot(self) -> None:
        self._running = True
        log.info("[PiMotherboard] Online — Pi Network utility layer active")

    # ── User registration ─────────────────────────────────────────────────────

    def register_user(
        self,
        pi_uid:   str,
        username: str  = "",
        region:   str  = "",
        language: str  = "en",
    ) -> PiUserRecord:
        if pi_uid not in self._users:
            self._users[pi_uid] = PiUserRecord(
                pi_uid   = pi_uid,
                username = username,
                region   = region,
                language = language,
            )
            log.info("[PiMotherboard] Registered Pi user %s", pi_uid)
        else:
            rec = self._users[pi_uid]
            if username: rec.username = username
            if region:   rec.region   = region
            if language: rec.language = language
            rec.last_seen = time.time()
        return self._users[pi_uid]

    def get_user(self, pi_uid: str) -> Optional[PiUserRecord]:
        return self._users.get(pi_uid)

    # ── KYC guidance ─────────────────────────────────────────────────────────

    def get_kyc_guidance(self, pi_uid: str) -> Dict[str, Any]:
        """Return stage-specific KYC action plan for this user."""
        rec = self._users.get(pi_uid)
        stage = rec.kyc_stage if rec else KYCStage.UNSTARTED.value
        guidance = _KYC_GUIDANCE.get(stage, _KYC_GUIDANCE[KYCStage.UNSTARTED.value])
        return {
            "pi_uid":          pi_uid,
            "current_stage":   stage,
            "guidance":        guidance,
            "kyc_attempts":    rec.kyc_attempts if rec else 0,
            "wallet_status":   rec.wallet_status if rec else WalletStatus.NONE.value,
            "is_complete":     stage == KYCStage.APPROVED.value,
        }

    def track_kyc_attempt(
        self,
        pi_uid:   str,
        stage:    str,
        success:  bool,
        reason:   str = "",
    ) -> Dict[str, Any]:
        """Log a KYC attempt outcome and advance the user's stage if successful."""
        rec = self.register_user(pi_uid)
        rec.kyc_attempts += 1

        if success:
            try:
                new_stage_idx = list(KYCStage).index(KYCStage(stage)) + 1
                if new_stage_idx < len(KYCStage):
                    rec.kyc_stage = list(KYCStage)[new_stage_idx].value
                else:
                    rec.kyc_stage = KYCStage.APPROVED.value
            except (ValueError, IndexError):
                rec.kyc_stage = stage

            if rec.kyc_stage == KYCStage.APPROVED.value:
                rec.kyc_approved_ts = time.time()
        else:
            if stage == KYCStage.REJECTED.value:
                rec.kyc_stage = KYCStage.REJECTED.value

        outcome = {
            "id":       str(uuid.uuid4())[:8],
            "ts":       time.time(),
            "pi_uid":   pi_uid,
            "stage":    stage,
            "success":  success,
            "reason":   reason,
            "new_stage": rec.kyc_stage,
        }
        self._kyc_outcomes.append(outcome)
        log.info("[PiMotherboard] KYC %s pi_uid=%s stage=%s→%s",
                 "OK" if success else "FAIL", pi_uid, stage, rec.kyc_stage)

        return {"outcome": outcome, "user": asdict(rec)}

    # ── KYB guidance ─────────────────────────────────────────────────────────

    def register_business(
        self,
        business_id: str,
        name:        str  = "",
        owner_pi_uid: str = "",
        region:      str  = "",
        industry:    str  = "",
    ) -> BusinessRecord:
        if business_id not in self._businesses:
            self._businesses[business_id] = BusinessRecord(
                business_id  = business_id,
                name         = name,
                owner_pi_uid = owner_pi_uid,
                region       = region,
                industry     = industry,
            )
        return self._businesses[business_id]

    def get_kyb_guidance(self, business_id: str) -> Dict[str, Any]:
        rec = self._businesses.get(business_id)
        stage = rec.kyb_stage if rec else KYBStage.UNSTARTED.value
        steps = {
            KYBStage.UNSTARTED.value: [
                "Register your business on the Pi Network developer portal (developers.minepi.com)",
                "Create a Pi App with your business name and description",
                "Complete business owner KYC first (individual verification required)",
                "Prepare: business registration certificate, tax ID, and address proof",
            ],
            KYBStage.REGISTERED.value: [
                "Upload your business registration certificate in the developer portal",
                "Upload proof of business address (utility bill or bank statement)",
                "Enter your business tax ID / EIN",
                "Submit for Pi Network's KYB review",
            ],
            KYBStage.DOCS_SUBMITTED.value: [
                "Wait for Pi Network review (typically 5-14 business days)",
                "Monitor your developer portal for status updates",
                "Ensure your contact email is accessible for follow-up requests",
            ],
            KYBStage.APPROVED.value: [
                "Your business is approved on Pi Network",
                "Integrate the Pi SDK to accept Pi payments",
                "Register your business wallet address with Triumph Synergy SAIB",
                "Test payments on the Pi sandbox before going live",
            ],
        }
        return {
            "business_id":  business_id,
            "current_stage": stage,
            "next_steps":   steps.get(stage, steps[KYBStage.UNSTARTED.value]),
            "is_approved":  stage == KYBStage.APPROVED.value,
        }

    # ── Wallet setup ─────────────────────────────────────────────────────────

    def get_wallet_setup_guide(self, pi_uid: str) -> Dict[str, Any]:
        """Return the full mainnet wallet setup guide for a Pi user."""
        rec = self._users.get(pi_uid)
        kyc_approved = rec and rec.kyc_stage == KYCStage.APPROVED.value

        steps = _WALLET_SETUP_STEPS
        if not kyc_approved:
            steps = [
                {
                    "step": 0,
                    "title": "Complete KYC First",
                    "detail": "Mainnet wallet creation requires approved KYC. "
                              "Complete your KYC verification before proceeding.",
                    "required": True,
                }
            ] + steps

        return {
            "pi_uid":          pi_uid,
            "kyc_approved":    kyc_approved,
            "wallet_status":   rec.wallet_status if rec else WalletStatus.NONE.value,
            "wallet_address":  rec.wallet_address if rec else "",
            "setup_steps":     steps,
            "ready_to_create": kyc_approved and (not rec or rec.wallet_status == WalletStatus.NONE.value),
        }

    def complete_wallet_setup(
        self,
        pi_uid:         str,
        wallet_address: str,
    ) -> Dict[str, Any]:
        """Mark a user's mainnet wallet as active."""
        rec = self.register_user(pi_uid)
        rec.wallet_address    = wallet_address
        rec.wallet_status     = WalletStatus.ACTIVE.value
        rec.wallet_created_ts = time.time()
        log.info("[PiMotherboard] Wallet activated pi_uid=%s addr=%s...", pi_uid, wallet_address[:8])
        return {"ok": True, "pi_uid": pi_uid, "wallet_address": wallet_address, "status": WalletStatus.ACTIVE.value}

    # ── Ecosystem stats ───────────────────────────────────────────────────────

    def ecosystem_stats(self) -> Dict[str, Any]:
        users = list(self._users.values())
        total = len(users)
        if total == 0:
            return {"total_users": 0, "kyc_approval_rate": 0.0, "wallet_activation_rate": 0.0}

        kyc_approved  = sum(1 for u in users if u.kyc_stage == KYCStage.APPROVED.value)
        wallets_active = sum(1 for u in users if u.wallet_status == WalletStatus.ACTIVE.value)
        total_attempts = sum(u.kyc_attempts for u in users)

        # stage breakdown
        stage_counts: Dict[str, int] = {}
        for u in users:
            stage_counts[u.kyc_stage] = stage_counts.get(u.kyc_stage, 0) + 1

        # regional breakdown
        region_counts: Dict[str, int] = {}
        for u in users:
            r = u.region or "UNKNOWN"
            region_counts[r] = region_counts.get(r, 0) + 1

        return {
            "total_users":          total,
            "total_businesses":     len(self._businesses),
            "kyc_approved":         kyc_approved,
            "kyc_approval_rate":    round(kyc_approved / total, 4),
            "wallets_active":       wallets_active,
            "wallet_activation_rate": round(wallets_active / max(kyc_approved, 1), 4),
            "total_kyc_attempts":   total_attempts,
            "avg_attempts_per_user": round(total_attempts / total, 2),
            "by_kyc_stage":         stage_counts,
            "by_region":            region_counts,
            "total_kyc_events":     len(self._kyc_outcomes),
        }

    def status(self) -> Dict[str, Any]:
        return {
            "running":   self._running,
            "role":      "Pi Network Utility Layer Motherboard",
            "stats":     self.ecosystem_stats(),
        }


# ── singleton ────────────────────────────────────────────────────────────────
pi_motherboard = PiMotherboard()
