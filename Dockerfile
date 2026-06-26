FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm config set registry https://registry.npmjs.org/ \
  && npm install --omit=dev --no-audit --no-fund \
  && node -e "for (const p of ['compression','cors','dotenv','express','express-rate-limit','helmet','mongoose','openai','pino','pino-http','zod']) { console.log(p, require.resolve(p)); }"
COPY dist ./dist
EXPOSE 8080
CMD ["node", "dist/bootstrap/api.js"]
