# Triumph Synergy Sovereign Military Bridge — CNSA Suite 2.0
# Python 3.13-slim (minimal attack surface)
FROM python:3.13-slim

LABEL maintainer="Jeremiah Joel Drains <triumph-synergy>" \
    org.triumph.service="sovereign-military-bridge" \
    org.triumph.crypto.standard="CNSA-Suite-2.0" \
    org.triumph.encryption="AES-256-GCM+ECDH-P384+RSA-3072+Kyber-1024+Dilithium-5" \
    org.triumph.network.architecture="ARPANET+NSFNet+DARPA+Interspace"

# APEX security hardening: full apt upgrade pulls every Debian security patch
# (closes the 90+ base-OS CVEs flagged by container scanning: ncurses, util-linux,
# tar, glibc, xz, systemd, sqlite, zlib, perl, etc.)
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
      gcc \
      libffi-dev \
      build-essential \
      ca-certificates && \
    update-ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# APEX security hardening: latest pip closes CVE-2026-6357 (arbitrary code execution
# via malicious wheel) and CVE-2026-3219 (incorrect file installation)
RUN pip install --no-cache-dir --upgrade 'pip>=26.1.0' setuptools wheel

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Remove build tools after install (reduce attack surface per CNSA guidance)
RUN apt-get purge -y --auto-remove gcc libffi-dev build-essential && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY main.py .

ENV PORT=8199 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    CNSA_ENFORCEMENT=true

EXPOSE 8199

# Run as non-root (CNSA operational security)
RUN useradd -r -s /sbin/nologin -u 1001 smb
USER smb

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8199", "--workers", "1"]
