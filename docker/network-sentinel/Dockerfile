FROM python:3.11-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY sentinel.py .
EXPOSE 9913
CMD ["python", "-u", "sentinel.py"]
