# NUSModuMind

## Database Setup

PostgreSQL should run locally on:

```text
localhost:5432
```

The backend uses these database defaults:

```text
username: postgres
password: postgres
database: postgres
```

### macOS

Install and start PostgreSQL with Homebrew:

```bash
brew install postgresql
brew services start postgresql
```

Create or update the local `postgres` user and database:

```bash
createuser -s postgres
psql -d postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
createdb -h localhost -p 5432 -U postgres postgres
```

If any command says the user or database already exists, that is fine.

### Windows

Install PostgreSQL using the official PostgreSQL installer.

During setup, use this password for the default `postgres` user:

```text
postgres
```

After installation, make sure the PostgreSQL service is running and listening on port `5432`.

## Backend Setup

From the project root:

```bash
cd backend
npm install
```

Create `backend/.env` with:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres?schema=public"
JWT_SECRET="key"
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-5.6-terra"
NUSMODS_ACAD_YEAR="2026-2027"
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM_EMAIL="NUSModuMind <notifications@your-verified-domain.com>"
RESEND_TEST_RECIPIENT=""
```

`OPENAI_API_KEY` is used only by the backend. The optional `OPENAI_MODEL`
setting controls the model used by AI Planner prompts and defaults to
`gpt-5.6-terra`.

Apply the Prisma migrations:

```bash
npx prisma migrate dev
```

Populate the local module catalog when setting up the database for the first time:

```bash
npm run sync:nusmods
```

This runs the NUSMods sync once and upserts the module data into the `nus_modules` table.
It also detects student-relevant module and timetable changes. Students with a
matching `PLANNED` module in the synced academic year receive a short update
email through Resend. If Resend is not configured, notifications remain queued
for a later sync rather than being discarded.

For the nightly GitHub Actions sync, configure:

- `SUPABASE_DATABASE_URL` and `RESEND_API_KEY` as Actions secrets.
- `RESEND_FROM_EMAIL` as an Actions variable using a sender on a
  Resend-verified domain.
- Optionally set `RESEND_TEST_RECIPIENT` to redirect every notification to one
  address while testing. Remove it before sending updates to real students.

Start the backend:

```bash
npm run start:dev
```

The backend API will run at:

```text
http://localhost:3001
```

The authenticated Phase 1 AI Planner endpoint is available at:

```text
POST /ai-planner/degree-requirements
```

For a Vercel deployment, configure `OPENAI_API_KEY` and `OPENAI_MODEL` as
backend project environment variables. Never expose the API key through a
`NEXT_PUBLIC_` frontend variable.

## Frontend Setup

Open a separate terminal, then from the project root:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at:

```text
http://localhost:3000
```
