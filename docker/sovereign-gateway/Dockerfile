FROM python:3.12-slim
LABEL org.triumph.service="sovereign-gateway" \
      org.triumph.description="Universal Integration Gateway — Pi sovereign settlement layer"
WORKDIR /app
COPY main.py .
EXPOSE 8097
CMD ["python", "main.py"]
