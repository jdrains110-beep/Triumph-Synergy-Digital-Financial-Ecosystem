# ==============================================================================
# ML Engine Dockerfile
# ==============================================================================
# Triumph Synergy Machine Learning microservice — Python 3.11 + FastAPI
# IsolationForest anomaly detection, GradientBoosting fraud scoring,
# Ridge price prediction, RSI market sentiment.  Port: 8090
# ==============================================================================

FROM python:3.13-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends wget curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN groupadd --system --gid 1001 pinetwork && \
    useradd  --system --uid 1001 --gid pinetwork mlengine && \
    chown -R mlengine:pinetwork /app

LABEL org.pinetwork.service="ml-engine"
LABEL org.pinetwork.central-node="GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"

COPY --chown=mlengine:pinetwork main.py .

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8090
USER mlengine

HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
    CMD wget -qO- http://localhost:8090/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090"]
