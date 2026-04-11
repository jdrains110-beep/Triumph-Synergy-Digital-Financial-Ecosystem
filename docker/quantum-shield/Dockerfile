FROM python:3.11-slim

# Hardened — non-root, read-only filesystem where possible
RUN groupadd -r quantumshield && useradd -r -g quantumshield -d /app -s /sbin/nologin quantumshield

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

USER quantumshield

EXPOSE 8094

ENV PYTHONUNBUFFERED=1

HEALTHCHECK --interval=20s --timeout=8s --start-period=25s --retries=4 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8094/health')"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8094", "--workers", "2", "--loop", "uvloop", "--no-access-log"]
