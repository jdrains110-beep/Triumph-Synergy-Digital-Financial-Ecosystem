"""
Protocol Obfuscation Engine — Sovereign Nano SAIB
Pluggable transport: every outbound frame is re-shaped to a fixed MTU with
AES-256-GCM framing + random cover-traffic padding so DPI sees only uniformly
sized, uniformly spaced ciphertext (obfs4 / Shadowsocks principle, no deps).
"""
from __future__ import annotations

import os
import struct
import time
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Fixed frame size (bytes) — every packet padded / split to this boundary.
# Matches a common Ethernet MTU minus headers so shape is indistinguishable.
FRAME_SIZE = 1400
_KEY_SIZE   = 32   # AES-256
_NONCE_SIZE = 12   # GCM nonce
_TAG_SIZE   = 16   # GCM auth-tag
_HDR_SIZE   = _NONCE_SIZE + 2  # nonce + uint16 real-payload length


class ProtocolObfuscator:
    """
    Stateless framing layer.

    Frame format (inside AES-GCM envelope):
        [12B nonce][2B real_len][real_payload][random_pad_to_FRAME_SIZE]

    The nonce is random per-frame (not counter) so two encryptions of the
    same payload produce different ciphertext — indistinguishable from random.
    """

    def __init__(self, key: bytes | None = None) -> None:
        self._key = key or os.urandom(_KEY_SIZE)
        self._aesgcm = AESGCM(self._key)
        self.frames_out = 0
        self.frames_in  = 0

    # ------------------------------------------------------------------ #
    def obfuscate(self, payload: bytes) -> list[bytes]:
        """Split payload into FRAME_SIZE frames + pad; return list of frames."""
        frames: list[bytes] = []
        # Split into chunks that fit inside one frame after header overhead
        max_chunk = FRAME_SIZE - _HDR_SIZE - _TAG_SIZE
        for i in range(0, max(1, len(payload)), max_chunk):
            chunk = payload[i : i + max_chunk]
            nonce = os.urandom(_NONCE_SIZE)
            # Pad chunk to max_chunk with random bytes so all frames are same size
            pad_len = max_chunk - len(chunk)
            padded  = chunk + os.urandom(pad_len)
            # Encode real length in first 2 bytes of plaintext
            plaintext = struct.pack(">H", len(chunk)) + padded
            ct = self._aesgcm.encrypt(nonce, plaintext, None)
            frames.append(nonce + ct)
            self.frames_out += 1
        return frames

    def deobfuscate(self, frame: bytes) -> bytes:
        """Decrypt a single frame; return real payload (strips padding)."""
        nonce   = frame[:_NONCE_SIZE]
        ct      = frame[_NONCE_SIZE:]
        plain   = self._aesgcm.decrypt(nonce, ct, None)
        real_len = struct.unpack(">H", plain[:2])[0]
        self.frames_in += 1
        return plain[2 : 2 + real_len]

    # ------------------------------------------------------------------ #
    def cover_traffic_frame(self) -> bytes:
        """Generate a decoy frame that looks identical to real traffic."""
        return self.obfuscate(b"")[0]

    def stats(self) -> dict:
        return {"frames_out": self.frames_out, "frames_in": self.frames_in,
                "frame_size": FRAME_SIZE, "cipher": "AES-256-GCM"}
