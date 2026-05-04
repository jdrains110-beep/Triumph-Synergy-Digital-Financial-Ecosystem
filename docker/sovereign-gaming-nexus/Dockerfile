# Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
# Sovereign Gaming Nexus — Docker Image
FROM python:3.13-slim

# Non-root sovereign user — uid 1010
RUN useradd -m -u 1010 -s /bin/sh gaming

WORKDIR /app
COPY requirements.txt .
RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

USER gaming

EXPOSE 8131

HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=5 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8131/health', timeout=8)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8131", "--workers", "1", "--log-level", "info"]
