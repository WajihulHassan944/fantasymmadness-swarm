# Operations Notes

## Required server ports

Only expose the reverse proxy/API port you choose. The supplied Compose file exposes `8080` for initial setup. Lock this down later behind HTTPS/reverse proxy.

## Environment variables

Keep real secrets only in `.env` on the server. Never commit `.env`.

## MongoDB

Use the existing Atlas cluster only with a separate database name, recommended:

```text
fantasymmadness_swarm
```

Use a separate least-privilege MongoDB user when possible.

## Logs

```bash
docker compose logs -f swarm-api
docker compose logs -f swarm-worker
```

## Updates

```bash
git pull
npm install
docker compose up -d --build
```

## Rollback

```bash
git checkout <previous-commit>
docker compose up -d --build
```
