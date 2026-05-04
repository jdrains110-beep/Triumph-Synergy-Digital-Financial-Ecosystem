FROM python:3.13-slim
WORKDIR /app
# build-essential + python3-dev needed to compile lz4 C extension wheel
RUN apt-get update && apt-get upgrade -y --no-install-recommends && \
    apt-get install -y --no-install-recommends build-essential python3-dev && \
    rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir --upgrade pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
RUN useradd -m -u 1001 cloudmem && \
    mkdir -p /backup/local /backup/offline && \
    chown -R 1000:1000 /backup
USER cloudmem
EXPOSE 8095
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8095", "--workers", "1", "--loop", "uvloop"]
