# Secret Santa

## Deploy on Render

Create a **Web Service** from this repository and leave **Root Directory** empty (the repository root).

- **Build Command:** `pnpm install --frozen-lockfile --prod=false && pnpm --filter @workspace/secret-santa build:render`
- **Start Command:** `pnpm --filter @workspace/secret-santa start`
- **Health Check Path:** `/api/healthz`

Set these environment variables in Render:

- `NODE_ENV` = `production`
- `DATABASE_URL` = the PostgreSQL connection URL from your Render database. Prefer its **internal database URL** when the web service is in the same Render region; use the **external database URL** otherwise. Keep this value in Render's environment settings, not in source control.
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` = optional credentials for the initial administrator. When omitted, the application uses `admin` / `admin`. These variables are used only when the database has no administrator yet; use a new, empty database when changing the initial credentials.

The application creates its PostgreSQL tables on startup. Render supplies `PORT` automatically; do not set it yourself.

Set `DATABASE_URL` for local development too. The local development default administrator remains `admin` / `admin`; production requires the two administrator variables when creating the first admin account.