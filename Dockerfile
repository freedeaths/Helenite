FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm cache clean --force && npm install

COPY . .
RUN npm run build

FROM caddy:2-alpine

# 复制构建的应用
COPY --from=builder /app/dist /usr/share/caddy

# 暴露端口
EXPOSE 80 443

# Caddy 会自动查找 /etc/caddy/Caddyfile
# 用户需要通过 volume 挂载自己的 Caddyfile