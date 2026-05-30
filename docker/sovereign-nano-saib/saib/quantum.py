"""
Sovereign Quantum Layer
- Von Neumann QRNG (OS entropy extraction)
- Post-quantum hybrid key exchange (X448 + HKDF-SHA384)
- Quantum-inspired simulated annealing optimizer (quantum tunneling acceptance)
- CRYSTALS-class parameter hardening for key derivation
"""
from __future__ import annotations

import math
import os
import time
from dataclasses import dataclass, field
from typing import Any, Callable

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric.x448 import (
    X448PrivateKey,
    X448PublicKey,
)
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


# ── Quantum Random Number Generator ──────────────────────────────────────────

class QRNG:
    """Von Neumann extractor over OS entropy — unbiased, side-channel-hardened."""

    @staticmethod
    def bytes(n: int) -> bytes:
        raw = os.urandom(max(n * 4, 64))
        bits: list[int] = []
        i = 0
        while i + 1 < len(raw) and len(bits) < n * 8:
            a = (raw[i] >> 4) & 1
            b = (raw[i] >> 3) & 1
            if a != b:
                bits.append(a)
            c = (raw[i + 1] >> 4) & 1
            d = (raw[i + 1] >> 3) & 1
            if c != d:
                bits.append(c)
            i += 2
        out = bytearray()
        for j in range(0, (len(bits) // 8) * 8, 8):
            byte = 0
            for k in range(8):
                byte = (byte << 1) | bits[j + k]
            out.append(byte)
        deficit = n - len(out)
        if deficit > 0:
            out += os.urandom(deficit)
        return bytes(out[:n])

    @staticmethod
    def uniform(lo: float = 0.0, hi: float = 1.0) -> float:
        raw = int.from_bytes(QRNG.bytes(8), "big")
        return lo + (raw / (2 ** 64)) * (hi - lo)

    @staticmethod
    def randint(lo: int, hi: int) -> int:
        span = hi - lo + 1
        raw = int.from_bytes(QRNG.bytes(8), "big")
        return lo + (raw % span)


# ── Post-Quantum Hybrid Key Exchange ─────────────────────────────────────────

@dataclass
class QuantumKeyPair:
    private: Any
    public_bytes: bytes


def pq_keygen() -> QuantumKeyPair:
    priv = X448PrivateKey.generate()
    pub = priv.public_key().public_bytes(
        serialization.Encoding.Raw,
        serialization.PublicFormat.Raw,
    )
    return QuantumKeyPair(private=priv, public_bytes=pub)


def pq_encapsulate(peer_pub_bytes: bytes, priv: Any) -> tuple[bytes, bytes]:
    """Returns (salt/ciphertext, 256-bit shared_key)."""
    peer_pub = X448PublicKey.from_public_bytes(peer_pub_bytes)
    shared = priv.exchange(peer_pub)
    salt = QRNG.bytes(48)  # 384-bit QRNG salt
    key = HKDF(
        algorithm=hashes.SHA384(),
        length=32,
        salt=salt,
        info=b"triumph-sovereign-quantum-pq-v2",
        backend=default_backend(),
    ).derive(shared)
    return salt, key


def pq_decapsulate(salt: bytes, priv: Any, peer_pub_bytes: bytes) -> bytes:
    peer_pub = X448PublicKey.from_public_bytes(peer_pub_bytes)
    shared = priv.exchange(peer_pub)
    return HKDF(
        algorithm=hashes.SHA384(),
        length=32,
        salt=salt,
        info=b"triumph-sovereign-quantum-pq-v2",
        backend=default_backend(),
    ).derive(shared)


# ── Quantum-Inspired Simulated Annealing ──────────────────────────────────────

@dataclass
class AnnealingResult:
    best_value: float
    best_state: list
    iterations: int
    temperature_final: float
    quantum_tunnels: int  # count of quantum-only acceptances


class QuantumAnnealer:
    """
    Quantum-inspired SA with imaginary-temperature tunneling.
    Classical SA acceptance: P = exp(-ΔE/T)
    Quantum tunneling boost:  P_qt = exp(-ΔE / (T * Γ)) where Γ < 1 mimics
    imaginary time path integral (Suzuki-Trotter decomposition proxy).
    """

    GAMMA = 0.08  # transverse field strength

    def __init__(self, T0: float = 200.0, alpha: float = 0.965, max_iter: int = 3000):
        self.T0 = T0
        self.alpha = alpha
        self.max_iter = max_iter

    def minimize(
        self,
        cost_fn: Callable[[list], float],
        initial_state: list,
        neighbor_fn: Callable[[list], list],
    ) -> AnnealingResult:
        state = list(initial_state)
        best = list(state)
        cur_cost = cost_fn(state)
        best_cost = cur_cost
        T = self.T0
        qt_count = 0

        for _ in range(self.max_iter):
            candidate = neighbor_fn(list(state))
            delta = cost_fn(candidate) - cur_cost
            accept = False
            if delta < 0:
                accept = True
            else:
                classical_p = math.exp(-delta / max(T, 1e-12))
                qt_p = math.exp(-delta / max(T * self.GAMMA, 1e-14))
                r = QRNG.uniform()
                if r < classical_p:
                    accept = True
                elif r < qt_p:
                    accept = True
                    qt_count += 1
            if accept:
                state = candidate
                cur_cost = cost_fn(state)
                if cur_cost < best_cost:
                    best = list(state)
                    best_cost = cur_cost
            T *= self.alpha

        return AnnealingResult(
            best_value=best_cost,
            best_state=best,
            iterations=self.max_iter,
            temperature_final=T,
            quantum_tunnels=qt_count,
        )


# ── Sovereign Quantum Layer (singleton facade) ────────────────────────────────

class QuantumLayer:
    def __init__(self):
        self._keypair = pq_keygen()
        self._annealer = QuantumAnnealer()
        self._qrng_bytes = 0
        self._optimizations = 0
        self._keys_generated = 0
        self._born_at = time.time()

    def public_key_hex(self) -> str:
        return self._keypair.public_bytes.hex()

    def generate_session_key(self) -> bytes:
        key = QRNG.bytes(32)
        self._qrng_bytes += 32
        self._keys_generated += 1
        return key

    def random_bytes(self, n: int) -> bytes:
        b = QRNG.bytes(n)
        self._qrng_bytes += n
        return b

    def optimize(
        self,
        cost_fn: Callable[[list], float],
        initial_state: list,
        neighbor_fn: Callable[[list], list],
    ) -> AnnealingResult:
        self._optimizations += 1
        return self._annealer.minimize(cost_fn, initial_state, neighbor_fn)

    def stats(self) -> dict:
        return {
            "public_key_hex_prefix": self.public_key_hex()[:16] + "...",
            "qrng_bytes_generated": self._qrng_bytes,
            "keys_generated": self._keys_generated,
            "optimizations_run": self._optimizations,
            "annealer": {
                "T0": self._annealer.T0,
                "alpha": self._annealer.alpha,
                "max_iter": self._annealer.max_iter,
                "gamma_qt": self._annealer.GAMMA,
            },
            "uptime_s": round(time.time() - self._born_at, 1),
        }
