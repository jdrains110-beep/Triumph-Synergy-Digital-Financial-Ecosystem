# ==============================================================================
# SOVEREIGN-INSURANCE — Super-Pod (7 services → 1 container)
# ==============================================================================
# Real-world utility for Pi Network across the entire insurance industry:
#   life      (port 8110)  — superior to Prudential / MetLife / NY Life
#   home      (port 8111)  — superior to State Farm / Allstate / Liberty Mutual
#   health    (port 8112)  — superior to BCBS / UnitedHealth / Aetna / Cigna
#   auto      (port 8113)  — superior to GEICO / Progressive / USAA
#   dental    (port 8114)  — superior to Delta Dental / MetLife Dental
#   vision    (port 8115)  — superior to VSP / EyeMed / Davis Vision
#   hospital  (port 8116)  — UF Health, Shands, Mayo, HCA, Cleveland Clinic
# Process supervisor: supervisord
# Build context: docker/
# ==============================================================================
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    supervisor curl ca-certificates \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY sovereign-insurance/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY sovereign-insurance/_common.py  /app/_common.py
COPY sovereign-insurance/life.py     /app/life.py
COPY sovereign-insurance/home.py     /app/home.py
COPY sovereign-insurance/health.py   /app/health.py
COPY sovereign-insurance/auto.py     /app/auto.py
COPY sovereign-insurance/dental.py   /app/dental.py
COPY sovereign-insurance/vision.py   /app/vision.py
COPY sovereign-insurance/hospital.py /app/hospital.py

COPY sovereign-insurance/supervisord.conf /etc/supervisor/conf.d/sovereign-insurance.conf

RUN groupadd --system --gid 1017 insure && \
    useradd  --system --uid 1017 --gid insure insure && \
    mkdir -p /var/log/supervisor && \
    chown -R insure:insure /app /var/log/supervisor

EXPOSE 8110 8111 8112 8113 8114 8115 8116

LABEL org.triumph.pod="sovereign-insurance" \
    org.triumph.merges="life+home+health+auto+dental+vision+hospital" \
    org.triumph.quantum="ML-DSA-87+ML-KEM-1024+SPHINCS+"

USER insure

HEALTHCHECK --interval=20s --timeout=15s --retries=8 --start-period=180s \
    CMD python -c "import socket; \
    [ (lambda p: (lambda s: (s.settimeout(5), s.connect(('127.0.0.1', p)), s.close()))(socket.socket()))(p) \
    for p in (8110, 8111, 8112, 8113, 8114, 8115, 8116) ]" || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/sovereign-insurance.conf", "-n"]
