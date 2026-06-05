# Sovereign Nano SAIB — Apex Defense Mesh
# Protocol obfuscation + traffic tunneling + Darktrace-superior anomaly engine
# + photonic-class scheduling + neural-logic fusion + Unreal Engine telemetry
FROM python:3.12-slim

LABEL maintainer="Jeremiah Joel Drains <triumph-synergy>" \
    org.triumph.service="sovereign-nano-saib" \
    org.triumph.role="apex-defense" \
    org.triumph.engines="obfuscation+tunneling+anomaly+photonic+neural+unreal"

RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends gcc libffi-dev build-essential ca-certificates && \
    update-ca-certificates && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade 'pip>=26.1.0' setuptools wheel

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --only-binary=numpy -r requirements.txt

RUN apt-get purge -y --auto-remove gcc libffi-dev build-essential && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY saib /app/saib

# Memory Alpha persistent data directory — writable by saib user
RUN mkdir -p /app/data && chown 1002:1002 /app/data

ENV PORT=8201 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8201

RUN useradd -r -s /sbin/nologin -u 1002 saib
# Add saib to root group (GID 0) so it can access /var/run/docker.sock
# (socket is rw-rw---- root:root in Docker Desktop macOS environments).
# docker-compose also sets group_add: ["0"] as a runtime-level guarantee.
RUN usermod -aG root saib
USER saib

CMD ["python", "-m", "uvicorn", "saib.app:app", "--host", "0.0.0.0", "--port", "8201", "--workers", "1"]
