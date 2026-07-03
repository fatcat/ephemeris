# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve (rootless)
FROM nginx:alpine
# njs (nginx JavaScript) — powers the in-image scanner banner (njs/ban.js)
RUN apk add --no-cache nginx-module-njs
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY snippets/ /etc/nginx/snippets/
COPY njs/ /etc/nginx/njs/
COPY --from=build /app/dist /usr/share/nginx/html
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && \
    # Remove "user nginx;" directive — not needed when running as nginx user directly
    sed -i 's/^user\s.*;//' /etc/nginx/nginx.conf && \
    # Load the njs module in the main context (idempotent — skip if already loaded)
    grep -q ngx_http_js_module /etc/nginx/nginx.conf || \
      sed -i '1i load_module modules/ngx_http_js_module.so;' /etc/nginx/nginx.conf && \
    mkdir -p /var/cache/nginx /var/run /tmp/nginx /var/log/nginx && \
    chown -R nginx:nginx /var/cache/nginx /var/run /tmp/nginx /usr/share/nginx/html /var/log/nginx && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid
EXPOSE 8080 8443
USER nginx
ENTRYPOINT ["/entrypoint.sh"]
