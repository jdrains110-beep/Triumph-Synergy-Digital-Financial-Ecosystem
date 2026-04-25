FROM python:3.11-slim

# Build dependencies for liboqs (Open Quantum Safe)
RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake gcc g++ make git && \
    rm -rf /var/lib/apt/lists/*

# Build liboqs 0.14.0 from source — provides real ML-KEM-1024, ML-DSA-87, SPHINCS+
RUN git clone --depth 1 --branch 0.14.0 https://github.com/open-quantum-safe/liboqs.git /tmp/liboqs && \
    cd /tmp/liboqs && mkdir build && cd build && \
    cmake -DCMAKE_INSTALL_PREFIX=/usr/local \
    -DBUILD_SHARED_LIBS=ON \
    -DOQS_USE_OPENSSL=OFF \
    .. && \
    make -j$(nproc) && make install && ldconfig && \
    rm -rf /tmp/liboqs

# Healthcheck tool + non-root hardened user
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/* && \
    groupadd -r quantumshield && useradd -r -g quantumshield -d /app -s /sbin/nologin quantumshield

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pqc.py .
COPY main.py .

USER quantumshield

EXPOSE 8094

ENV PYTHONUNBUFFERED=1

HEALTHCHECK --interval=25s --timeout=20s --start-period=60s --retries=5 \
    CMD wget -qO- http://localhost:8094/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8094", "--workers", "1", "--loop", "uvloop", "--no-access-log"]
