# NUSModuMind

## Prerequisites

- Node.js and npm
- PostgreSQL running locally

## Database Setup

Start PostgreSQL locally and make sure it is available at:

```bash
localhost:5432
```

The backend currently uses these database defaults:

```text
username: postgres
password: postgres
database: postgres
```

## Backend Setup

From the project root:

```bash
cd backend
npm install
npm run start:dev
```

The backend API will run at:

```bash
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

```bash
http://localhost:3000
```
