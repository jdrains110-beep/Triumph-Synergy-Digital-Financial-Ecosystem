# Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
# Sovereign Delivery Engine — Docker Image
# APEX-QUANTUM-SOVEREIGN · ML-DSA-87 · ML-KEM-1024 · 97 loopholes
# Port 8100
FROM python:3.13-slim

# Non-root sovereign user
RUN useradd -m -u 1002 -s /bin/sh delivery

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

USER delivery

EXPOSE 8100

HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=5 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8100/health', timeout=8)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8100", "--workers", "1", "--log-level", "info"]
