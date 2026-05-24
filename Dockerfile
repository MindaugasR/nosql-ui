# Stage 1: build client
FROM node:22-alpine AS client-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/
RUN npm ci
COPY packages/client ./packages/client
RUN npm run build -w packages/client

# Stage 2: build server (needs devDeps for tsc + @types/node)
FROM node:22-alpine AS server-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/server ./packages/server
COPY --from=client-builder /app/packages/server/public ./packages/server/public
RUN npm run build -w packages/server

# Stage 3: final runtime image — only production deps
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HUSKY=0
COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/
RUN npm ci --omit=dev
COPY --from=server-builder /app/packages/server/dist ./packages/server/dist
COPY --from=server-builder /app/packages/server/public ./packages/server/public
EXPOSE 3001
CMD ["node", "packages/server/dist/index.js"]
