# ==============================================================================
# QUANTUM-FORTRESS — Super-Pod (2 services → 1 container)
# ==============================================================================
# Merges: quantum-shield (8094) + qpu-bridge (8098)
# Unified post-quantum cryptographic shield: ML-KEM-1024 + ML-DSA-87 + SPHINCS+
# Build context: docker/  (sibling COPY pattern)
# ==============================================================================

# ── Stage 1: builder — compile liboqs 0.14.0 ──
FROM python:3.13-slim AS builder

RUN apt-get update && apt-get upgrade -y --no-install-recommends && apt-get install -y --no-install-recommends \
    cmake gcc g++ make git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 --branch 0.14.0 https://github.com/open-quantum-safe/liboqs.git /tmp/liboqs && \
    cd /tmp/liboqs && mkdir build && cd build && \
    cmake -DCMAKE_INSTALL_PREFIX=/usr/local/liboqs \
    -DBUILD_SHARED_LIBS=ON \
    -DOQS_USE_OPENSSL=OFF .. && \
    make -j"$(nproc)" && make install && \
    rm -rf /tmp/liboqs

WORKDIR /build
COPY quantum-fortress/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: runtime — minimal CVE surface ──
FROM python:3.13-slim AS runtime

RUN apt-get update && apt-get upgrade -y --no-install-recommends && apt-get install -y --no-install-recommends \
    supervisor curl ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    groupadd --system --gid 1011 quantum && \
    useradd  --system --uid 1011 --gid quantum quantum

COPY --from=builder /usr/local/liboqs /usr/local/liboqs
RUN echo "/usr/local/liboqs/lib" > /etc/ld.so.conf.d/liboqs.conf && ldconfig

COPY --from=builder /install /usr/local

WORKDIR /app

COPY quantum-shield/main.py /app/shield.py
COPY quantum-shield/pqc.py  /app/pqc.py
COPY qpu-bridge/main.py     /app/qpu.py

COPY quantum-fortress/supervisord.conf /etc/supervisor/conf.d/quantum-fortress.conf

RUN mkdir -p /var/log/supervisor && chown -R quantum:quantum /app /var/log/supervisor

ENV PYTHONUNBUFFERED=1 \
    LD_LIBRARY_PATH=/usr/local/liboqs/lib

EXPOSE 8094 8098

LABEL org.triumph.pod="quantum-fortress" \
    org.triumph.merges="quantum-shield+qpu-bridge" \
    org.triumph.crypto="ML-KEM-1024+ML-DSA-87+SPHINCS+"

USER quantum

HEALTHCHECK --interval=25s --timeout=20s --retries=8 --start-period=180s \
    CMD python3 -c "import urllib.request as u; \
    [u.urlopen(f'http://127.0.0.1:{p}/health', timeout=10) for p in (8094, 8098)]" || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/quantum-fortress.conf", "-n"]
