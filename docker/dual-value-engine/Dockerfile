FROM python:3.13-slim

WORKDIR /app

# Install deps in a separate layer for cache efficiency
COPY requirements.txt .
RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt

# Application
COPY main.py .

# Non-root user
RUN addgroup --system dualvalue && adduser --system --ingroup dualvalue dualvalue
USER dualvalue

ENV PORT=8093
EXPOSE 8093

HEALTHCHECK --interval=30s --timeout=8s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8093/health')" || exit 1

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
