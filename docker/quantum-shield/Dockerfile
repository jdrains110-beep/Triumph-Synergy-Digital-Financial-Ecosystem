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

# Hardened — non-root, read-only filesystem where possible
RUN groupadd -r quantumshield && useradd -r -g quantumshield -d /app -s /sbin/nologin quantumshield

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pqc.py .
COPY main.py .

USER quantumshield

EXPOSE 8094

ENV PYTHONUNBUFFERED=1

HEALTHCHECK --interval=20s --timeout=8s --start-period=25s --retries=4 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8094/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8094", "--workers", "1", "--loop", "uvloop", "--no-access-log"]
