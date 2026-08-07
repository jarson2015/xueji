# 预编译 api（dist 已存在）→ 安装生产依赖后启动
FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --registry=https://registry.npmmirror.com

COPY dist ./dist
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh && mkdir -p uploads

ENV NODE_ENV=production
ENV UPLOAD_DIR=uploads
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
