# syntax=docker/dockerfile:1.7
FROM node:22.13.0-bookworm-slim AS toolchain
RUN npm install --global npm@10.9.7

FROM toolchain AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM toolchain AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG PAYROLL_RELEASE=local
ENV PAYROLL_RELEASE=$PAYROLL_RELEASE
ENV NEXT_PUBLIC_PAYROLL_RELEASE=$PAYROLL_RELEASE
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22.13.0-bookworm-slim AS runtime
WORKDIR /app
ARG PAYROLL_RELEASE=local
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PAYROLL_RELEASE=$PAYROLL_RELEASE
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --no-create-home --shell /usr/sbin/nologin nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]
