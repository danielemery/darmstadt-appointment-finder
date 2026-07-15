# Official Playwright image with browsers preinstalled. The tag must match
# the playwright version pinned in package.json, or playwright will look for
# browser builds that aren't in the image.
FROM mcr.microsoft.com/playwright:v1.61.1-noble AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Final image: production dependencies and built output only.
FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/main.js"]
