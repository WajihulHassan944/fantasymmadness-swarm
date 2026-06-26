FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY dist ./dist
EXPOSE 8080
CMD ["node", "dist/bootstrap/api.js"]
