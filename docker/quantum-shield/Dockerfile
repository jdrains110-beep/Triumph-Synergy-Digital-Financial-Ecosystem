# ── Stage 1: builder — compile liboqs from source (build tools stay here only) ──
FROM python:3.13-slim AS builder

RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    cmake gcc g++ make git && \
    rm -rf /var/lib/apt/lists/*

# Build liboqs 0.14.0 — ML-KEM-1024, ML-DSA-87, SPHINCS+
RUN git clone --depth 1 --branch 0.14.0 https://github.com/open-quantum-safe/liboqs.git /tmp/liboqs && \
    cd /tmp/liboqs && mkdir build && cd build && \
    cmake -DCMAKE_INSTALL_PREFIX=/usr/local/liboqs \
    -DBUILD_SHARED_LIBS=ON \
    -DOQS_USE_OPENSSL=OFF \
    .. && \
    make -j$(nproc) && make install && \
    rm -rf /tmp/liboqs

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: runtime — no compiler, no git, no cmake — minimal CVE surface ───
FROM python:3.13-slim AS runtime

RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/* && \
    groupadd -r quantumshield && useradd -r -g quantumshield -d /app -s /sbin/nologin quantumshield

# Copy compiled liboqs shared libraries
COPY --from=builder /usr/local/liboqs /usr/local/liboqs
RUN echo "/usr/local/liboqs/lib" > /etc/ld.so.conf.d/liboqs.conf && ldconfig

# Copy installed Python packages
COPY --from=builder /install /usr/local

WORKDIR /app
COPY pqc.py .
COPY main.py .

USER quantumshield
EXPOSE 8094
ENV PYTHONUNBUFFERED=1

HEALTHCHECK --interval=25s --timeout=20s --start-period=60s --retries=5 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8094/health', timeout=8)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8094", "--workers", "1", "--loop", "uvloop", "--no-access-log"]
