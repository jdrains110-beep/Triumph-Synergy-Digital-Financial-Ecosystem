# Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
# Sovereign AI Bot — Docker Image
FROM python:3.13-slim

# Non-root sovereign user
RUN useradd -m -u 1001 -s /bin/sh saib

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

USER saib

EXPOSE 8099

HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=5 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8099/health', timeout=8)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8099", "--workers", "1", "--log-level", "info"]
