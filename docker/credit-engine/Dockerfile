# ==============================================================================
# Credit Engine Dockerfile
# ==============================================================================
# Triumph Synergy Credit Engine — PiCredit Score™ + Bureau Integration
# Port: 8091
# ==============================================================================

FROM python:3.13-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends wget curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN groupadd --system --gid 1002 pinetwork && \
    useradd  --system --uid 1002 --gid pinetwork creditengine && \
    chown -R creditengine:pinetwork /app

LABEL org.pinetwork.service="credit-engine"
LABEL org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"

COPY --chown=creditengine:pinetwork main.py .

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8091
USER creditengine

HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD wget -qO- http://localhost:8091/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8091"]
