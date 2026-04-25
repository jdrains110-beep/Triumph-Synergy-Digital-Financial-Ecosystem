FROM python:3.13-slim

RUN useradd -r -u 1001 -s /bin/false pibridge

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

USER pibridge
EXPOSE 8092
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=15s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8092/health')"

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8092", "--log-level", "info"]
