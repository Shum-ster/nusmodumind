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
```

Apply the Prisma migrations:

```bash
npx prisma migrate dev
```

Start the backend:

```bash
npm run start:dev
```

The backend API will run at:

```text
http://localhost:3001
```

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
