#!/bin/sh
#
# Generate a local CA and server certificate for Ephemeris.
# Run once — the certs persist in ./certs/ and are reused across
# container rebuilds via a Docker volume mount.
#
# Usage: ./generate-certs.sh [hostname]
#   hostname defaults to "ephemeris"
#
# After running, install certs/ca.crt in your OS trust store
# so browsers will trust the HTTPS connection and enable PWA offline.

set -e

HOSTNAME="${1:-ephemeris}"
CERT_DIR="$(dirname "$0")/certs"

if [ -f "$CERT_DIR/ca.crt" ] && [ -f "$CERT_DIR/server.crt" ]; then
  echo "Certs already exist in $CERT_DIR/"
  echo "Delete the directory and re-run to regenerate."
  exit 0
fi

mkdir -p "$CERT_DIR"

echo "Generating CA key and certificate..."
openssl genrsa -out "$CERT_DIR/ca.key" 2048 2>/dev/null
openssl req -x509 -new -nodes -key "$CERT_DIR/ca.key" -sha256 -days 3650 \
  -out "$CERT_DIR/ca.crt" \
  -subj "/CN=Ephemeris Local CA"

echo "Generating server key and certificate (hostname: $HOSTNAME)..."
openssl genrsa -out "$CERT_DIR/server.key" 2048 2>/dev/null
openssl req -new -key "$CERT_DIR/server.key" \
  -out "$CERT_DIR/server.csr" \
  -subj "/CN=$HOSTNAME"

cat > "$CERT_DIR/san.cnf" <<EOF
[v3_ext]
subjectAltName=DNS:$HOSTNAME,DNS:localhost,DNS:*.local,IP:127.0.0.1
EOF

openssl x509 -req -in "$CERT_DIR/server.csr" \
  -CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" -CAcreateserial \
  -out "$CERT_DIR/server.crt" -days 3650 -sha256 \
  -extfile "$CERT_DIR/san.cnf" -extensions v3_ext 2>/dev/null

# Clean up intermediate files
rm -f "$CERT_DIR/server.csr" "$CERT_DIR/san.cnf" "$CERT_DIR/ca.srl"

echo ""
echo "Certs generated in $CERT_DIR/"
echo ""
echo "  CA cert:     $CERT_DIR/ca.crt"
echo "  Server cert: $CERT_DIR/server.crt"
echo "  Server key:  $CERT_DIR/server.key"
echo ""
echo "Install ca.crt in your OS trust store, then run:"
echo "  docker compose up --build"
