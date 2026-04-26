FROM python:3.13-slim
WORKDIR /app
# gcc needed to compile lz4 C extension
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir --upgrade pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
RUN useradd -m -u 1001 cloudmem
USER cloudmem
EXPOSE 8095
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8095", "--workers", "1", "--loop", "uvloop"]
