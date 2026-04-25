FROM python:3.11-slim

RUN groupadd -r qpubridge && useradd -r -g qpubridge -d /app -s /sbin/nologin qpubridge

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

USER qpubridge

EXPOSE 8098

ENV PYTHONUNBUFFERED=1

HEALTHCHECK --interval=20s --timeout=10s --start-period=30s --retries=5 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8098/health', timeout=8)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8098", "--workers", "1", "--loop", "uvloop", "--no-access-log"]
