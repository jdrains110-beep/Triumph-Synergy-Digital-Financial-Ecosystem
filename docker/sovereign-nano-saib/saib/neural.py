"""
Neural Logic Core — Sovereign Nano SAIB
Tiny fixed-topology feed-forward network (numpy only, no heavy ML deps) that
fuses four signals into a single sovereign threat verdict + autonomous response.

Inputs  (normalized 0-1):
  [0] anomaly_score   — from ApexThreatModel (z-score → sigmoid)
  [1] obfusc_entropy  — frame entropy (8 bits max → /8)
  [2] peer_trust      — 1 - (quarantine_fraction among active peers)
  [3] tunnel_health   — success_rate of recent tunnel packets

Output:
  threat_verdict (0-1) — above 0.5 triggers autonomous response tier
  action          — PASS / RATE_LIMIT / ISOLATE / FULL_BLOCK
"""
from __future__ import annotations

import math
import os
import time
from typing import Any

import numpy as np

# Network architecture: 4 → 8 → 4 → 1
_I, _H1, _H2, _O = 4, 8, 4, 1

_RNG = np.random.default_rng(seed=int.from_bytes(os.urandom(4), "little"))

def _he(fan_in: int, fan_out: int) -> np.ndarray:
    """He initialisation."""
    return _RNG.standard_normal((fan_in, fan_out)) * math.sqrt(2.0 / fan_in)

def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -30, 30)))

def _relu(x: np.ndarray) -> np.ndarray:
    return np.maximum(0, x)


class NeuralLogicCore:
    """
    Self-updating feed-forward threat classifier.
    Weights evolve via online gradient descent on every observation.
    """

    def __init__(self, lr: float = 0.01) -> None:
        self._lr = lr
        # Layers
        self._W1 = _he(_I, _H1);  self._b1 = np.zeros(_H1)
        self._W2 = _he(_H1, _H2); self._b2 = np.zeros(_H2)
        self._W3 = _he(_H2, _O);  self._b3 = np.zeros(_O)
        self._n_forward  = 0
        self._n_backward = 0

    # ------------------------------------------------------------------ #
    def _forward(self, x: np.ndarray) -> tuple[np.ndarray, ...]:
        """Return (a1, a2, output)."""
        a1  = _relu(x @ self._W1 + self._b1)
        a2  = _relu(a1 @ self._W2 + self._b2)
        out = _sigmoid(a2 @ self._W3 + self._b3)
        return a1, a2, out

    def predict(
        self,
        anomaly_score:  float,
        obfusc_entropy: float,
        peer_trust:     float,
        tunnel_health:  float,
    ) -> dict[str, Any]:
        """Forward pass — no weight update."""
        x = np.array([[
            min(1.0, anomaly_score / 6.0),   # normalise z 0-6 → 0-1
            obfusc_entropy / 8.0,
            peer_trust,
            tunnel_health,
        ]])
        _, _, out = self._forward(x)
        verdict   = float(out[0, 0])
        self._n_forward += 1
        return {
            "verdict":     round(verdict, 4),
            "action":      self._action(verdict),
            "inputs":      x[0].tolist(),
        }

    def learn(
        self,
        anomaly_score:  float,
        obfusc_entropy: float,
        peer_trust:     float,
        tunnel_health:  float,
        label:          float,          # 0 = benign, 1 = threat
    ) -> float:
        """Online backprop; return loss."""
        x = np.array([[
            min(1.0, anomaly_score / 6.0),
            obfusc_entropy / 8.0,
            peer_trust,
            tunnel_health,
        ]])
        a1, a2, out = self._forward(x)

        # Binary cross-entropy loss
        eps  = 1e-9
        loss = -label * math.log(out[0, 0] + eps) \
               - (1 - label) * math.log(1 - out[0, 0] + eps)

        # Output layer gradient
        dout = out - label
        dW3  = a2.T @ dout;         db3 = dout.sum(axis=0)

        # Hidden layer 2
        da2  = (dout @ self._W3.T) * (a2 > 0)
        dW2  = a1.T @ da2;          db2 = da2.sum(axis=0)

        # Hidden layer 1
        da1  = (da2 @ self._W2.T) * (a1 > 0)
        dW1  = x.T @ da1;           db1 = da1.sum(axis=0)

        # SGD update
        self._W3 -= self._lr * dW3; self._b3 -= self._lr * db3
        self._W2 -= self._lr * dW2; self._b2 -= self._lr * db2
        self._W1 -= self._lr * dW1; self._b1 -= self._lr * db1
        self._n_backward += 1
        return float(loss)

    @staticmethod
    def _action(verdict: float) -> str:
        if verdict >= 0.90:
            return "FULL_BLOCK"
        if verdict >= 0.70:
            return "ISOLATE"
        if verdict >= 0.50:
            return "RATE_LIMIT"
        return "PASS"

    def stats(self) -> dict:
        return {
            "architecture":  f"{_I}→{_H1}→{_H2}→{_O}",
            "n_forward":     self._n_forward,
            "n_backward":    self._n_backward,
            "learning_rate": self._lr,
        }
