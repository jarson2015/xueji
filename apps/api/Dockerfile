FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --registry=https://registry.npmmirror.com

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# su-exec: drop root after fixing upload volume ownership
RUN apk add --no-cache su-exec \
  && mkdir -p uploads data \
  && chown -R node:node /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh \
  && chown -R node:node /app
EXPOSE 3000
# Start as root only to chown mounted volumes, then exec as node (see entrypoint)
ENTRYPOINT ["./docker-entrypoint.sh"]
