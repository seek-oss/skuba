---
'skuba': minor
---

Net.waitFor: Use Docker Compose V2

This function now executes `docker compose` under the hood as `docker-compose` stopped receiving updates in July 2023. See the [Docker manual](https://docs.docker.com/compose/migrate/) for more information.
