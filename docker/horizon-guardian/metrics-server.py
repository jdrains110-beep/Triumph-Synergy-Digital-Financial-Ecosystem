#!/usr/bin/env python3
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

METRICS_DIR = os.getenv("METRICS_DIR", "/app/metrics")
METRICS_FILE = os.getenv("METRICS_FILE", f"{METRICS_DIR}/metrics")
METRICS_PORT = int(os.getenv("METRICS_PORT", "9911"))


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            body = b'{"status":"healthy","service":"horizon-guardian"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if self.path != "/metrics":
            self.send_response(404)
            self.end_headers()
            return

        try:
            with open(METRICS_FILE, "rb") as f:
                body = f.read()
        except FileNotFoundError:
            body = b""

        self.send_response(200)
        self.send_header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", METRICS_PORT), Handler)
    server.serve_forever()
