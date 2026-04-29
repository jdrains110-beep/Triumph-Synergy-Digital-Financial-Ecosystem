FROM python:3.13-slim

LABEL maintainer="Triumph Synergy <info@triumph-synergy.io>"
LABEL description="Sovereign Telecom Engine — 7-layer quantum mesh, SAIB-enforced, never offline"
LABEL version="1.0.0"

RUN groupadd --gid 1001 telecom && \
    useradd --uid 1001 --gid telecom --shell /bin/bash --create-home telecom

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

RUN chown -R telecom:telecom /app

USER telecom

EXPOSE 8140

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8140/health', timeout=8)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8140", "--workers", "2"]
