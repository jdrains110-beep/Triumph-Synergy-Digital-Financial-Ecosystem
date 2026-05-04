FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get upgrade -y --no-install-recommends && apt-get install -y --no-install-recommends tini procps curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -r -u 1001 -s /bin/false pibridge

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

USER pibridge
EXPOSE 8092
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=15s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8092/health')"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "-u", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8092", "--log-level", "info"]
