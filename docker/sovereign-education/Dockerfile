FROM python:3.13-slim

LABEL maintainer="Triumph Synergy <info@triumph-synergy.io>"
LABEL description="Sovereign Education Engine — K-12 · College · Faculty Pay · Learn & Earn"
LABEL version="1.0.0"

RUN groupadd --gid 1001 edu && \
    useradd --uid 1001 --gid edu --shell /bin/bash --create-home edu

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

RUN chown -R edu:edu /app

USER edu

EXPOSE 8130

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8130/health', timeout=8)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8130", "--workers", "2"]
