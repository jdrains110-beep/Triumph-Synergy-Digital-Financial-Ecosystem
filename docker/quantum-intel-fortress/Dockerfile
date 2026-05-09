# ==============================================================================
# QUANTUM-INTEL-FORTRESS — Apex Super-Pod (5 services → 1 container)
# ==============================================================================
# Merges financial-intel + quantum-fortress to eliminate 1 daemon container:
#   financial-intel services:
#     ml-engine         (8090) — scikit-learn / statsmodels predictions
#     credit-engine     (8091) — PiCredit Score™
#     dual-value-engine (8093) — internal/external Pi valuation
#   quantum-fortress services:
#     quantum-shield    (8094) — ML-KEM-1024 + ML-DSA-87 + SPHINCS+
#     qpu-bridge        (8098) — QPU interface bridge
#
# Multi-stage: Stage 1 compiles liboqs C library; Stage 2 installs
# the merged scientific + crypto Python stack and runs all 5 via supervisord.
# Build context: docker/  (sibling COPY pattern, matches existing pods)
# ==============================================================================

# ── Stage 1: builder — compile liboqs 0.14.0 + install all Python deps ───────
FROM python:3.13-slim AS builder

RUN apt-get update && apt-get upgrade -y --no-install-recommends && apt-get install -y --no-install-recommends \
    cmake gcc g++ make git ca-certificates \
    build-essential gfortran libopenblas-dev liblapack-dev && \
    rm -rf /var/lib/apt/lists/*

# Compile liboqs (required by oqs Python binding for quantum-shield / qpu-bridge)
RUN git clone --depth 1 --branch 0.14.0 https://github.com/open-quantum-safe/liboqs.git /tmp/liboqs && \
    cd /tmp/liboqs && mkdir build && cd build && \
    cmake -DCMAKE_INSTALL_PREFIX=/usr/local/liboqs \
    -DBUILD_SHARED_LIBS=ON \
    -DOQS_USE_OPENSSL=OFF .. && \
    make -j"$(nproc)" && make install && \
    rm -rf /tmp/liboqs

WORKDIR /build
COPY quantum-intel-fortress/requirements.txt .
# Install merged requirements (scientific stack + quantum crypto)
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: runtime — minimal CVE surface ────────────────────────────────────
FROM python:3.13-slim AS runtime

RUN apt-get update && apt-get upgrade -y --no-install-recommends && apt-get install -y --no-install-recommends \
    supervisor curl ca-certificates \
    libopenblas0 libgfortran5 && \
    rm -rf /var/lib/apt/lists/*

# liboqs shared library
COPY --from=builder /usr/local/liboqs /usr/local/liboqs
RUN echo "/usr/local/liboqs/lib" > /etc/ld.so.conf.d/liboqs.conf && ldconfig

# Merged Python packages
COPY --from=builder /install /usr/local

WORKDIR /app

# ── financial-intel services ─────────────────────────────────────────────────
COPY credit-engine/main.py     /app/credit.py
COPY ml-engine/main.py         /app/ml.py
COPY dual-value-engine/main.py /app/dual_value.py

# ── quantum-fortress services ────────────────────────────────────────────────
COPY quantum-shield/main.py /app/shield.py
COPY quantum-shield/pqc.py  /app/pqc.py
COPY qpu-bridge/main.py     /app/qpu.py

COPY quantum-intel-fortress/supervisord.conf /etc/supervisor/conf.d/quantum-intel-fortress.conf

RUN mkdir -p /var/log/supervisor

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    LD_LIBRARY_PATH=/usr/local/liboqs/lib

EXPOSE 8090 8091 8093 8094 8098

LABEL org.triumph.pod="quantum-intel-fortress" \
    org.triumph.merges="financial-intel+quantum-fortress" \
    org.triumph.services="ml-engine+credit-engine+dual-value-engine+quantum-shield+qpu-bridge" \
    org.triumph.crypto="ML-KEM-1024+ML-DSA-87+SPHINCS+"

# Start-period generous: SPHINCS+ keygen is slow on Docker Desktop Mac VM
HEALTHCHECK --interval=30s --timeout=20s --retries=8 --start-period=300s \
    CMD python3 -c "import socket; \
    [( lambda p: (lambda s: (s.settimeout(10), s.connect(('127.0.0.1', p)), s.close()))(socket.socket()))(p) \
    for p in (8090, 8091, 8093, 8094, 8098)]" || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/quantum-intel-fortress.conf", "-n"]
