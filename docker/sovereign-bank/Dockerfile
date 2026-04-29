FROM python:3.13-slim

RUN groupadd -g 1001 bank && \
    useradd -u 1001 -g bank -s /bin/bash -m bank

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

RUN chown -R bank:bank /app
USER bank

EXPOSE 8150

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8150/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8150", "--workers", "2"]
