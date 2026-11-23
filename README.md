# Secret Santa

## Deploy on Render

Create a **Web Service** from this repository and leave **Root Directory** empty (the repository root).

- **Build Command:** `pnpm install --frozen-lockfile --prod=false && pnpm --filter @workspace/secret-santa build:render`
- **Start Command:** `pnpm --filter @workspace/secret-santa start`
- **Health Check Path:** `/api/healthz`

Set these environment variables in Render:

- `NODE_ENV` = `production`
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` = credentials for the initial administrator. These are used only when the database has no administrator yet; use a new, empty database when changing the initial credentials.
- `SQLITE_PATH` = `/var/data/secret-santa.sqlite`

Attach a persistent disk mounted at `/var/data` to keep accounts and exchanges across deploys; Render persistent disks require a paid service plan. SQLite data on Render's temporary filesystem is lost when the service is replaced. Render supplies `PORT` automatically; do not set it yourself.

The local development default administrator remains `admin` / `admin`; production requires the two administrator variables when creating the first admin account.