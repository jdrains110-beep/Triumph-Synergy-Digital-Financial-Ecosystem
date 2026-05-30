"""
Apex Threat Model — Sovereign Nano SAIB
Darktrace-superior: self-learning per-peer behavioral baseline with:
  • Online Bayesian update (no batch training, adapts in real time)
  • EWMA per-feature (rate, volume, entropy, error-rate)
  • Peer-relative outlier z-score (immune-system cross-peer comparison)
  • Autonomous response tiers: MONITOR → ALERT → QUARANTINE → BLOCK
No third-party ML libs — pure numpy + stdlib.
"""
from __future__ import annotations

import math
import time
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

import numpy as np


class ThreatLevel(str, Enum):
    NORMAL     = "NORMAL"
    MONITOR    = "MONITOR"
    ALERT      = "ALERT"
    QUARANTINE = "QUARANTINE"
    BLOCK      = "BLOCK"


@dataclass
class PeerProfile:
    """Running statistics for one peer (IP/node_id)."""
    peer_id: str
    # EWMA state — one slot per feature [request_rate, byte_rate, entropy, err_rate]
    ewma:    np.ndarray = field(default_factory=lambda: np.zeros(4))
    var:     np.ndarray = field(default_factory=lambda: np.ones(4))
    n:       int        = 0
    last_ts: float      = field(default_factory=time.time)
    threat:  ThreatLevel = ThreatLevel.NORMAL
    # Recent anomaly scores for trend window
    scores:  deque = field(default_factory=lambda: deque(maxlen=60))

    # Bayesian: log P(benign | observations)
    log_p_benign: float = 0.0


ALPHA = 0.05          # EWMA smoothing — low = slow adaptation (long baseline)
Z_MONITOR     = 2.0
Z_ALERT       = 3.0
Z_QUARANTINE  = 4.5
Z_BLOCK       = 6.0


def _entropy(data_hex: str) -> float:
    """Shannon entropy of a hex payload — high entropy → compressed/encrypted."""
    if not data_hex:
        return 0.0
    b = bytes.fromhex(data_hex[:512])  # cap to 256 bytes
    if not b:
        return 0.0
    counts = np.bincount(np.frombuffer(b, dtype=np.uint8), minlength=256)
    probs  = counts / counts.sum()
    probs  = probs[probs > 0]
    return float(-np.sum(probs * np.log2(probs)))


class ApexThreatModel:
    """
    Self-learning immune system.  Call .observe() on every event; call
    .verdict() to get the current threat level for a peer.
    """

    def __init__(self) -> None:
        self._peers: dict[str, PeerProfile] = {}

    # ------------------------------------------------------------------ #
    def _profile(self, peer_id: str) -> PeerProfile:
        if peer_id not in self._peers:
            self._peers[peer_id] = PeerProfile(peer_id=peer_id)
        return self._peers[peer_id]

    def observe(
        self,
        peer_id:      str,
        byte_count:   int  = 0,
        error:        bool = False,
        payload_hex:  str  = "",
    ) -> ThreatLevel:
        """Record one event, update baseline, return current threat level."""
        p   = self._profile(peer_id)
        now = time.time()
        dt  = max(now - p.last_ts, 1e-3)
        p.last_ts = now
        p.n      += 1

        # Feature vector: [request_rate/s, byte_rate/s, entropy, error_flag]
        feat = np.array([
            1.0 / dt,
            byte_count / dt,
            _entropy(payload_hex),
            1.0 if error else 0.0,
        ])

        # EWMA update
        p.ewma = ALPHA * feat + (1 - ALPHA) * p.ewma
        p.var  = ALPHA * (feat - p.ewma) ** 2 + (1 - ALPHA) * p.var
        std    = np.sqrt(p.var + 1e-9)

        # Z-score (Mahalanobis-lite, diagonal covariance)
        if p.n < 10:
            # Not enough history — stay NORMAL
            p.threat = ThreatLevel.NORMAL
            p.scores.append(0.0)
            return p.threat

        z = float(np.max(np.abs(feat - p.ewma) / std))

        # Bayesian log-likelihood update (Gaussian prior on each feature)
        log_l = float(-0.5 * np.sum(((feat - p.ewma) / std) ** 2))
        p.log_p_benign = 0.95 * p.log_p_benign + 0.05 * log_l
        p.scores.append(z)

        # Cross-peer outlier: compare this z to the population mean z
        pop_z = self._population_z(peer_id)
        composite = z * (1.0 + max(0.0, z - pop_z))

        # Tier assignment
        if composite >= Z_BLOCK:
            p.threat = ThreatLevel.BLOCK
        elif composite >= Z_QUARANTINE:
            p.threat = ThreatLevel.QUARANTINE
        elif composite >= Z_ALERT:
            p.threat = ThreatLevel.ALERT
        elif composite >= Z_MONITOR:
            p.threat = ThreatLevel.MONITOR
        else:
            # Gradual recovery: only drop one tier at a time
            tiers = list(ThreatLevel)
            idx   = tiers.index(p.threat)
            if idx > 0:
                p.threat = tiers[idx - 1]

        return p.threat

    def _population_z(self, exclude: str) -> float:
        scores = [
            float(np.mean(list(pr.scores))) if pr.scores else 0.0
            for pid, pr in self._peers.items() if pid != exclude
        ]
        return float(np.mean(scores)) if scores else 0.0

    def verdict(self, peer_id: str) -> dict[str, Any]:
        p = self._profile(peer_id)
        return {
            "peer_id":   peer_id,
            "threat":    p.threat.value,
            "n_events":  p.n,
            "log_p_benign": round(p.log_p_benign, 4),
            "ewma":      p.ewma.tolist(),
            "recent_z":  list(p.scores)[-5:],
        }

    def all_verdicts(self) -> list[dict]:
        return [self.verdict(pid) for pid in self._peers]

    def summary(self) -> dict:
        counts: dict[str, int] = {t.value: 0 for t in ThreatLevel}
        for p in self._peers.values():
            counts[p.threat.value] += 1
        return {"peer_count": len(self._peers), "by_level": counts}
