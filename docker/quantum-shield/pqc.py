"""
pqc.py — ctypes bindings for liboqs (Open Quantum Safe)
=========================================================
Direct C-level access to REAL Kyber-1024, Dilithium-5, SPHINCS+ via the
liboqs shared library. No pip package conflicts — just ctypes + the .so.

This module provides two classes that mirror the liboqs-python API:
  KeyEncapsulation(alg)  — KEM (Kyber/ML-KEM)
  Signature(alg)         — Digital signatures (Dilithium/SPHINCS+)
"""
# Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
# License: PiOS


import ctypes
import ctypes.util
from ctypes import c_char_p, c_size_t, c_int, c_uint8, POINTER, Structure, byref

# ── Load liboqs ────────────────────────────────────────────────────────────

_lib_path = ctypes.util.find_library("oqs")
if not _lib_path:
    raise ImportError("liboqs shared library not found — install liboqs first")

_lib = ctypes.CDLL(_lib_path)

# Version
_lib.OQS_version.restype = c_char_p


def version() -> str:
    return _lib.OQS_version().decode()


# ── OQS_KEM struct ─────────────────────────────────────────────────────────

class _OQS_KEM(Structure):
    _fields_ = [
        ("method_name", c_char_p),
        ("alg_version", c_char_p),
        ("claimed_nist_level", c_uint8),
        ("ind_cca", c_uint8),
        ("length_public_key", c_size_t),
        ("length_secret_key", c_size_t),
        ("length_ciphertext", c_size_t),
        ("length_shared_secret", c_size_t),
        ("keypair", ctypes.CFUNCTYPE(c_int, POINTER(c_uint8), POINTER(c_uint8))),
        ("encaps", ctypes.CFUNCTYPE(c_int, POINTER(c_uint8), POINTER(c_uint8), POINTER(c_uint8))),
        ("decaps", ctypes.CFUNCTYPE(c_int, POINTER(c_uint8), POINTER(c_uint8), POINTER(c_uint8))),
    ]


_lib.OQS_KEM_new.argtypes = [c_char_p]
_lib.OQS_KEM_new.restype = POINTER(_OQS_KEM)
_lib.OQS_KEM_free.argtypes = [POINTER(_OQS_KEM)]
_lib.OQS_KEM_keypair.argtypes = [POINTER(_OQS_KEM), POINTER(c_uint8), POINTER(c_uint8)]
_lib.OQS_KEM_keypair.restype = c_int
_lib.OQS_KEM_encaps.argtypes = [POINTER(_OQS_KEM), POINTER(c_uint8), POINTER(c_uint8), POINTER(c_uint8)]
_lib.OQS_KEM_encaps.restype = c_int
_lib.OQS_KEM_decaps.argtypes = [POINTER(_OQS_KEM), POINTER(c_uint8), POINTER(c_uint8), POINTER(c_uint8)]
_lib.OQS_KEM_decaps.restype = c_int


# ── OQS_SIG struct ─────────────────────────────────────────────────────────

class _OQS_SIG(Structure):
    _fields_ = [
        ("method_name", c_char_p),
        ("alg_version", c_char_p),
        ("claimed_nist_level", c_uint8),
        ("euf_cma", c_uint8),
        ("length_public_key", c_size_t),
        ("length_secret_key", c_size_t),
        ("length_signature", c_size_t),
        ("keypair", ctypes.CFUNCTYPE(c_int, POINTER(c_uint8), POINTER(c_uint8))),
        ("sign", ctypes.CFUNCTYPE(c_int, POINTER(c_uint8), POINTER(c_size_t), POINTER(c_uint8), c_size_t, POINTER(c_uint8))),
        ("verify", ctypes.CFUNCTYPE(c_int, POINTER(c_uint8), c_size_t, POINTER(c_uint8), c_size_t, POINTER(c_uint8))),
    ]


_lib.OQS_SIG_new.argtypes = [c_char_p]
_lib.OQS_SIG_new.restype = POINTER(_OQS_SIG)
_lib.OQS_SIG_free.argtypes = [POINTER(_OQS_SIG)]
_lib.OQS_SIG_keypair.argtypes = [POINTER(_OQS_SIG), POINTER(c_uint8), POINTER(c_uint8)]
_lib.OQS_SIG_keypair.restype = c_int
_lib.OQS_SIG_sign.argtypes = [POINTER(_OQS_SIG), POINTER(c_uint8), POINTER(c_size_t), POINTER(c_uint8), c_size_t, POINTER(c_uint8)]
_lib.OQS_SIG_sign.restype = c_int
_lib.OQS_SIG_verify.argtypes = [POINTER(_OQS_SIG), POINTER(c_uint8), c_size_t, POINTER(c_uint8), c_size_t, POINTER(c_uint8)]
_lib.OQS_SIG_verify.restype = c_int


# ── KeyEncapsulation class ─────────────────────────────────────────────────

class KeyEncapsulation:
    """Kyber/ML-KEM key encapsulation mechanism via liboqs."""

    def __init__(self, alg_name: str):
        self._kem = _lib.OQS_KEM_new(alg_name.encode())
        if not self._kem:
            raise ValueError(f"KEM algorithm '{alg_name}' not supported")
        self._alg = alg_name
        k = self._kem.contents
        self._pk_len = k.length_public_key
        self._sk_len = k.length_secret_key
        self._ct_len = k.length_ciphertext
        self._ss_len = k.length_shared_secret
        self._public_key = None
        self._secret_key = None

    @property
    def details(self) -> dict:
        return {
            "algorithm": self._alg,
            "pk_bytes": self._pk_len,
            "sk_bytes": self._sk_len,
            "ct_bytes": self._ct_len,
            "ss_bytes": self._ss_len,
        }

    def generate_keypair(self) -> bytes:
        """Generate a KEM keypair. Returns the public key."""
        pk = (c_uint8 * self._pk_len)()
        sk = (c_uint8 * self._sk_len)()
        rc = _lib.OQS_KEM_keypair(self._kem, pk, sk)
        if rc != 0:
            raise RuntimeError(f"KEM keypair generation failed (rc={rc})")
        self._public_key = bytes(pk)
        self._secret_key = bytes(sk)
        return self._public_key

    def export_secret_key(self) -> bytes:
        if self._secret_key is None:
            raise RuntimeError("No keypair generated yet")
        return self._secret_key

    def encap_secret(self, public_key: bytes) -> tuple[bytes, bytes]:
        """Encapsulate: returns (ciphertext, shared_secret)."""
        ct = (c_uint8 * self._ct_len)()
        ss = (c_uint8 * self._ss_len)()
        pk_buf = (c_uint8 * len(public_key))(*public_key)
        rc = _lib.OQS_KEM_encaps(self._kem, ct, ss, pk_buf)
        if rc != 0:
            raise RuntimeError(f"KEM encapsulation failed (rc={rc})")
        return bytes(ct), bytes(ss)

    def decap_secret(self, ciphertext: bytes) -> bytes:
        """Decapsulate using stored secret key. Returns shared_secret."""
        if self._secret_key is None:
            raise RuntimeError("No secret key — generate_keypair first")
        ss = (c_uint8 * self._ss_len)()
        ct_buf = (c_uint8 * len(ciphertext))(*ciphertext)
        sk_buf = (c_uint8 * self._sk_len)(*self._secret_key)
        rc = _lib.OQS_KEM_decaps(self._kem, ss, ct_buf, sk_buf)
        if rc != 0:
            raise RuntimeError(f"KEM decapsulation failed (rc={rc})")
        return bytes(ss)

    def __del__(self):
        if hasattr(self, '_kem') and self._kem:
            _lib.OQS_KEM_free(self._kem)


# ── Signature class ────────────────────────────────────────────────────────

class Signature:
    """Dilithium/SPHINCS+ digital signatures via liboqs."""

    def __init__(self, alg_name: str):
        self._sig = _lib.OQS_SIG_new(alg_name.encode())
        if not self._sig:
            raise ValueError(f"SIG algorithm '{alg_name}' not supported")
        self._alg = alg_name
        s = self._sig.contents
        self._pk_len = s.length_public_key
        self._sk_len = s.length_secret_key
        self._sig_len = s.length_signature
        self._public_key = None
        self._secret_key = None

    @property
    def details(self) -> dict:
        return {
            "algorithm": self._alg,
            "pk_bytes": self._pk_len,
            "sk_bytes": self._sk_len,
            "max_sig_bytes": self._sig_len,
        }

    def generate_keypair(self) -> bytes:
        """Generate a signature keypair. Returns the public key."""
        pk = (c_uint8 * self._pk_len)()
        sk = (c_uint8 * self._sk_len)()
        rc = _lib.OQS_SIG_keypair(self._sig, pk, sk)
        if rc != 0:
            raise RuntimeError(f"SIG keypair generation failed (rc={rc})")
        self._public_key = bytes(pk)
        self._secret_key = bytes(sk)
        return self._public_key

    def export_secret_key(self) -> bytes:
        if self._secret_key is None:
            raise RuntimeError("No keypair generated yet")
        return self._secret_key

    def sign(self, message: bytes) -> bytes:
        """Sign a message. Returns the signature bytes."""
        if self._secret_key is None:
            raise RuntimeError("No secret key — generate_keypair first")
        sig_buf = (c_uint8 * self._sig_len)()
        sig_len = c_size_t(0)
        msg_buf = (c_uint8 * len(message))(*message)
        sk_buf = (c_uint8 * self._sk_len)(*self._secret_key)
        rc = _lib.OQS_SIG_sign(self._sig, sig_buf, byref(sig_len), msg_buf, len(message), sk_buf)
        if rc != 0:
            raise RuntimeError(f"Signing failed (rc={rc})")
        return bytes(sig_buf[:sig_len.value])

    def verify(self, message: bytes, signature: bytes, public_key: bytes) -> bool:
        """Verify a signature against a public key. Returns True/False."""
        msg_buf = (c_uint8 * len(message))(*message)
        sig_buf = (c_uint8 * len(signature))(*signature)
        pk_buf = (c_uint8 * len(public_key))(*public_key)
        rc = _lib.OQS_SIG_verify(self._sig, msg_buf, len(message), sig_buf, len(signature), pk_buf)
        return rc == 0

    def __del__(self):
        if hasattr(self, '_sig') and self._sig:
            _lib.OQS_SIG_free(self._sig)
