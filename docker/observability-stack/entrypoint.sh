#!/bin/sh
# Fix volume mount perms (named volumes mount root-owned at runtime), then exec supervisord as root
# (supervisord will launch sub-programs as user=obs per supervisord.conf)
set -e
chown -R obs:obs /prometheus /var/lib/grafana /var/log/grafana /var/log/supervisor /backup 2>/dev/null || true
exec "$@"
