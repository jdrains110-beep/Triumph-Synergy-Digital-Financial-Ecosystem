FROM docker:27-cli

RUN apk add --no-cache busybox-extras python3

WORKDIR /app
COPY start.sh /app/start.sh
COPY watchdog.sh /app/watchdog.sh
COPY serve-metrics.sh /app/serve-metrics.sh
COPY metrics-server.py /app/metrics-server.py
RUN chmod +x /app/start.sh /app/watchdog.sh /app/serve-metrics.sh /app/metrics-server.py

CMD ["/app/start.sh"]
