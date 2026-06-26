# IONOS runtime dependency fix

This package uses prebuilt `dist/` and installs only production runtime dependencies inside Docker.

The Dockerfile intentionally copies only `package.json` and runs `npm install --omit=dev` from the public npm registry. This avoids lockfile/runtime mismatch issues on the VPS where middleware packages such as `compression` may otherwise be absent from `node_modules`.

Deploy:

```bash
docker compose down --remove-orphans
docker builder prune -af
docker compose up -d --build
docker compose logs -f --tail=100 swarm-api
curl http://localhost:8080/health
curl http://localhost:8080/readiness
```
