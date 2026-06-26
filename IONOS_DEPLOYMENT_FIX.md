# IONOS Docker deployment

This package includes a prebuilt `dist/` folder. The Docker image does not compile TypeScript on the VPS, so `tsc` is not required during Docker build.

## Deploy

```bash
cd /root
rm -rf fantasymmadness-swarm
unzip fantasymmadness-swarm-phase1-ionos-fixed.zip
cd fantasymmadness-swarm-phase1
cp .env.example .env
nano .env

docker compose down --remove-orphans
docker builder prune -af
docker compose up -d --build
docker compose ps
curl http://localhost:8080/health
```

## Required `.env`

```env
NODE_ENV=production
PORT=8080
MONGODB_URI=your_real_mongodb_uri
MONGODB_DB_NAME=fantasymmadness_swarm
SWARM_API_KEY=generated_secret
SWARM_HMAC_SECRET=generated_secret
OPENAI_API_KEY=client_openai_key
SWARM_DEFAULT_MODE=DRAFT_ONLY
SWARM_AUTO_PUBLISH_ENABLED=false
SWARM_SOCIAL_PUBLISH_ENABLED=false
```

Do not commit `.env` to GitHub.
