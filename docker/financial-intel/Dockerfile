# ==============================================================================
# FINANCIAL-INTEL — Super-Pod (3 services → 1 container)
# ==============================================================================
# Merges:
#   credit-engine      (8091) — PiCredit Score™
#   ml-engine          (8090) — scikit-learn / statsmodels
#   dual-value-engine  (8093) — internal/external Pi valuation
# Shared scientific Python stack: numpy + pandas + scikit-learn + scipy
# Build context: docker/  (sibling COPY pattern)
# ==============================================================================
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    supervisor curl ca-certificates \
    build-essential gfortran libopenblas-dev liblapack-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY financial-intel/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY credit-engine/main.py     /app/credit.py
COPY ml-engine/main.py         /app/ml.py
COPY dual-value-engine/main.py /app/dual_value.py

COPY financial-intel/supervisord.conf /etc/supervisor/conf.d/financial-intel.conf

RUN groupadd --system --gid 1012 fintel && \
    useradd  --system --uid 1012 --gid fintel fintel && \
    mkdir -p /var/log/supervisor && \
    chown -R fintel:fintel /app /var/log/supervisor

EXPOSE 8090 8091 8093

LABEL org.triumph.pod="financial-intel" \
    org.triumph.merges="credit-engine+ml-engine+dual-value-engine" \
    org.triumph.stack="scikit-learn+pandas+statsmodels+stellar-sdk"

USER fintel

HEALTHCHECK --interval=25s --timeout=20s --retries=8 --start-period=240s \
    CMD python -c "import socket; \
    [ (lambda p: (lambda s: (s.settimeout(8), s.connect(('127.0.0.1', p)), s.close()))(socket.socket()))(p) \
    for p in (8090, 8091, 8093) ]" || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/financial-intel.conf", "-n"]
