# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
RUN apk add --no-cache openssl && \
    mkdir -p /etc/ssl/private /certs && \
    # Generate a local CA
    openssl genrsa -out /certs/ca.key 2048 && \
    openssl req -x509 -new -nodes -key /certs/ca.key -sha256 -days 3650 \
      -out /certs/ca.crt \
      -subj "/CN=Ephemeris Local CA" && \
    # Generate server cert signed by the CA (with SAN for broad compatibility)
    openssl genrsa -out /etc/ssl/private/server.key 2048 && \
    openssl req -new -key /etc/ssl/private/server.key \
      -out /tmp/server.csr \
      -subj "/CN=ephemeris" && \
    printf "[v3_ext]\nsubjectAltName=DNS:ephemeris,DNS:localhost,DNS:*.local,IP:127.0.0.1" \
      > /tmp/san.cnf && \
    openssl x509 -req -in /tmp/server.csr \
      -CA /certs/ca.crt -CAkey /certs/ca.key -CAcreateserial \
      -out /etc/ssl/certs/server.crt -days 3650 -sha256 \
      -extfile /tmp/san.cnf -extensions v3_ext && \
    # Make CA cert available for download
    cp /certs/ca.crt /certs/ephemeris-ca.crt && \
    rm -f /tmp/server.csr /tmp/san.cnf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]
