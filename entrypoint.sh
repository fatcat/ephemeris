#!/bin/sh

echo ""
echo ""
echo ""

# Check for certs
if [ ! -f /certs/server.crt ] || [ ! -f /certs/server.key ]; then
  echo "========================================="
  echo "  ERROR: No certs found in /certs/"
  echo ""
  echo "  Run ./generate-certs.sh first, then"
  echo "  rebuild with: docker compose up --build"
  echo "========================================="
  exit 1
fi

echo "========================================="
echo "  Ephemeris is running"
echo ""
echo "  HTTP:  port 80  (redirects to HTTPS)"
echo "  HTTPS: port 443"
echo ""
if [ -f /certs/ca.crt ]; then
  echo "  CA cert download: https://<host>/ca.crt"
  echo ""
fi
echo "========================================="
echo ""

exec nginx -g "daemon off;"
