# ==============================================================================
# Triumph Synergy — Sovereign Commerce & Frontier Authority (SCFA)
# Ultimate superior sovereign platform — Charter, Chamber, Port, Frontier,
# Arms, Marine — Pi-native, vault-backed, SAIB-enforced, MAXIMUM-APEX-QUANTUM.
# Port 8160. Replaces & exceeds SBA, U.S. Chamber, FL Ports, CBP, NRA, NOAA.
# ==============================================================================
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN groupadd -g 1019 scfa && \
    useradd -u 1019 -g scfa -s /bin/bash -m scfa

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

RUN chown -R scfa:scfa /app
USER scfa

EXPOSE 8160

LABEL org.triumph.service="sovereign-commerce-authority" \
      org.triumph.tier="apex-sovereign" \
      org.triumph.replaces="SBA+US-Chamber+FL-Ports+CBP+NRA+NOAA-Fisheries" \
      org.triumph.quantum="ML-DSA-87+ML-KEM-1024+SPHINCS+"

# Generous start_period + retries so transient Docker Desktop pressure
# doesn't flag us unhealthy. Uses python (already in image) — no apt-get bloat.
HEALTHCHECK --interval=45s --timeout=20s --start-period=90s --retries=6 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8160/health', timeout=15)" || exit 1

# Single worker — eliminates uvicorn fork death-spiral seen under macOS Docker
# Desktop memory pressure (workers exit immediately on SIGTERM-then-respawn).
# Throughput is fine; route handlers are async.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8160", "--workers", "1"]
