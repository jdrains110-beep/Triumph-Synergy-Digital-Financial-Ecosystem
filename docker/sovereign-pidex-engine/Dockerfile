# Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
# Sovereign Pi-DEX Engine — Docker Image
# APEX-QUANTUM-SOVEREIGN · ML-DSA-87 · ML-KEM-1024 · SPHINCS+ · 61 loopholes
# Port 8101
FROM python:3.13-slim

# Non-root sovereign user
RUN useradd -m -u 1003 -s /bin/sh pidex

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

USER pidex

EXPOSE 8101

HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=5 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8101/health', timeout=8)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8101", "--workers", "1", "--log-level", "info"]
