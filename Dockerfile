# HiPhant 프론트엔드 (Next.js 15) 멀티스테이지 Dockerfile
#  - builder: next build
#  - runner : next start (production)

# ---------- build stage ----------
FROM node:22-slim AS builder
WORKDIR /app

# 의존성 설치 (lockfile 우선, 어긋나면 install 로 폴백)
COPY package.json package-lock.json ./
RUN npm ci || npm install

# 소스 복사 후 빌드
COPY . .

# NEXT_PUBLIC_* 는 빌드 시점에 인라인된다. 브라우저가 호출할 API 주소(호스트 기준).
ARG NEXT_PUBLIC_API_URL=http://localhost:8080/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runtime stage ----------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "run", "start"]
