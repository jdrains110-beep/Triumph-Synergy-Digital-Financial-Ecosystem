FROM docker:27-cli

WORKDIR /app
COPY start.sh /app/start.sh
COPY watchdog.sh /app/watchdog.sh
RUN chmod +x /app/start.sh /app/watchdog.sh

CMD ["/app/start.sh"]
