# AWS deployment and update runbook

This repository supports two production layouts:

- `docker-compose.prod.yml` keeps PostgreSQL in a persistent Docker volume on
  the EC2 host. This is the safe update path for the existing instance at
  `13.215.185.237`.
- `docker-compose.rds.yml` connects the application to private Amazon RDS. Use
  it only as a planned database migration, not during a routine code update.

Caddy is the only public container. It serves the frontend and forwards
`/api/*` to the backend, so the browser uses one origin.

Never commit `.env.production`, expose PostgreSQL port 5432 publicly, run
`prisma migrate dev`/`prisma db push` in production, or run
`docker compose down -v`. The last command deletes the local database volume.

## Current EC2: pre-flight checks

The current host is a `t4g.micro` in `ap-southeast-1`. It is ARM64 and has only
1 GiB of RAM, so use ARM64 tools and provide swap before building both Node.js
images locally.

1. Confirm the public IP is associated with an Elastic IP. Otherwise it can
   change after an instance stop/start.
2. In the EC2 security group, allow TCP 22 only from the administrator's IP,
   TCP 80 from the internet, and TCP/UDP 443 only when a hostname and HTTPS are
   configured. Do not add an inbound rule for PostgreSQL.
3. Connect with the key and login name used when the instance was created:

   ```bash
   chmod 400 /path/to/key.pem
   ssh -i /path/to/key.pem ec2-user@13.215.185.237
   ```

   Ubuntu images commonly use `ubuntu` instead of `ec2-user`.

4. Locate the existing checkout and verify the running stack before changing
   anything:

   ```bash
   sudo find /opt /home -maxdepth 3 -type d -name .git 2>/dev/null
   cd /opt/nusmodumind
   git status --short --branch
   docker compose --env-file .env.production -f docker-compose.prod.yml ps
   docker volume ls
   free -h
   df -h
   ```

   Substitute the actual repository directory if it is not
   `/opt/nusmodumind`. Stop if the working tree contains unexplained changes or
   if the PostgreSQL container/volume is missing.

## One-time memory preparation on t4g.micro

If `swapon --show` is empty, create a 2 GiB swap file. Ensure the EBS volume has
enough free space first:

```bash
swapon --show
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
free -h
```

The application can run on this host for light traffic, but image builds,
PostgreSQL, and both Node processes leave little headroom. If builds or normal
traffic exhaust memory, temporarily or permanently resize to at least a
`t4g.small` or build ARM64 images in CI and pull them from ECR.

## Back up the live database and configuration

Run these commands from the existing repository directory before fetching the
release. The database dump is written to the EC2 user's home directory rather
than the Git checkout.

```bash
cd /opt/nusmodumind
chmod 600 .env.production
cp .env.production "$HOME/nusmodumind.env.production.backup"
chmod 600 "$HOME/nusmodumind.env.production.backup"
export OLD_RELEASE_SHA="$(git rev-parse HEAD)"
printf '%s\n' "$OLD_RELEASE_SHA" | tee "$HOME/nusmodumind.previous-sha"
mkdir -p "$HOME/nusmodumind-backups"
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$HOME/nusmodumind-backups/before-update.dump"
test -s "$HOME/nusmodumind-backups/before-update.dump"
ls -lh "$HOME/nusmodumind-backups/before-update.dump"
```

Do not proceed unless the final `test -s` succeeds. Copy the dump to a second,
access-controlled location such as encrypted S3 before a high-risk migration.

If the currently deployed Compose file uses a different database service name,
find it with `docker compose ... ps` and substitute that name for `postgres`.

## Check out this release

The release branch and exact commit are supplied with the release handoff.
Fetch it without merging unrelated branches:

```bash
cd /opt/nusmodumind
git fetch origin
git switch --track -c fix/aws-deployment-readiness origin/fix/aws-deployment-readiness
git status --short --branch
git rev-parse HEAD
```

If that local branch already exists, use:

```bash
git switch fix/aws-deployment-readiness
git pull --ff-only
```

For a repeatable production deployment, verify `git rev-parse HEAD` matches the
tested release SHA from the handoff.

## Preserve and update `.env.production`

Do **not** copy the example over the live file. Keep its existing database
name, user, password, JWT secret, API keys, and `DATABASE_URL`. For the local
database layout, both database URLs must use the Docker hostname `postgres`,
not `localhost` and not the public EC2 address.

Edit only missing or changed values:

```bash
cd /opt/nusmodumind
nano .env.production
```

The relevant shape is:

```dotenv
POSTGRES_DB=<keep-existing-value>
POSTGRES_USER=<keep-existing-value>
POSTGRES_PASSWORD=<keep-existing-value>
DATABASE_URL=postgresql://USER:URL_ENCODED_PASSWORD@postgres:5432/DATABASE?schema=public
DIRECT_URL=postgresql://USER:URL_ENCODED_PASSWORD@postgres:5432/DATABASE?schema=public
JWT_SECRET=<keep-existing-value>
OPENAI_API_KEY=<keep-existing-value>
OPENAI_MODEL=gpt-5.6-terra
RESEND_API_KEY=<keep-existing-value>
RESEND_FROM_EMAIL=<keep-existing-value>
RESEND_TEST_RECIPIENT=
FRONTEND_URL=http://13.215.185.237
NUSMODS_ACAD_YEAR=2026-2027
NEXT_PUBLIC_API_BASE_URL=/api
SITE_ADDRESS=http://13.215.185.237
```

URL-encode reserved characters in the password portion of the two URLs. Keep
the raw password in `POSTGRES_PASSWORD`. Then run `chmod 600 .env.production`.

Using an IP intentionally keeps this deployment on HTTP. Authentication tokens
must not be sent over public HTTP long-term. Assign a hostname, point its DNS A
record to the Elastic IP, set `FRONTEND_URL=https://HOSTNAME` and
`SITE_ADDRESS=HOSTNAME`, and let Caddy obtain HTTPS certificates as soon as
possible.

## Validate, build, and inspect migration state

Keep PostgreSQL running, but stop the public application containers to free
memory. This creates an update window while retaining the live database.

```bash
cd /opt/nusmodumind
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f docker-compose.prod.yml stop frontend backend proxy
docker compose --env-file .env.production -f docker-compose.prod.yml build --pull backend frontend
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backend npm run db:migrate:status
```

Do not proceed if validation/building fails. The release repairs the migration
named `20260810000000_add_timetable_academic_year_and_semester_unique`. If that
exact migration is reported as already applied but modified, stop and preserve
the output: do not reset the production database or edit its migration table.
An already-deployed variant requires a new forward-only repair migration.

## Apply the database and code update

After the status check and backup succeed:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backend npm run db:migrate:deploy
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backend npm run db:migrate:status
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm backend npm run sync:nusmods
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans
```

The sync replaces legacy module-catalogue rows whose source academic year is
`UNKNOWN` and refreshes them for `NUSMODS_ACAD_YEAR`. The application also runs
the scheduled sync at midnight Singapore time.

## Verify the release

On EC2:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 backend frontend proxy postgres
curl -fI http://127.0.0.1
curl -fsS 'http://127.0.0.1/api/nusmodule?limit=1'
```

From another machine:

```bash
curl -fI http://13.215.185.237
curl -fsS 'http://13.215.185.237/api/nusmodule?limit=1'
```

Then log in through the browser, add modules to at least two semesters, reload
the dashboard, open the timetable, and exercise the AI planner. Confirm the
selected modules do not disappear or move after overlapping saves.

## Rollback

For a code-only rollback, leave PostgreSQL and its volume running:

```bash
cd /opt/nusmodumind
git checkout "$(cat "$HOME/nusmodumind.previous-sha")"
docker compose --env-file .env.production -f docker-compose.prod.yml build backend frontend
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans
```

Database migrations are forward-only. Restore the dump only after stopping all
application writes and deciding how to handle data created after the backup.
Do not casually combine a code rollback with a database restore.

## Optional future move to private RDS

Treat this as a separate maintenance project:

1. Create encrypted RDS PostgreSQL 16 or 17 in the same VPC with public access
   disabled, automated backups enabled, and deletion protection enabled.
2. Allow TCP 5432 on the RDS security group only from the EC2 security group.
3. Stop application writes and create a fresh `pg_dump` from local PostgreSQL.
4. Restore it into RDS and verify row counts and Prisma migration history.
5. Copy `.env.rds.production.example` to `.env.rds.production`, insert the RDS
   URL with `sslmode=require`, and protect it with mode 600.
6. Validate and migrate with the RDS-specific Compose file:

   ```bash
   docker compose --env-file .env.rds.production -f docker-compose.rds.yml config --quiet
   docker compose --env-file .env.rds.production -f docker-compose.rds.yml run --rm backend npm run db:migrate:status
   docker compose --env-file .env.rds.production -f docker-compose.rds.yml run --rm backend npm run db:migrate:deploy
   docker compose --env-file .env.rds.production -f docker-compose.rds.yml up -d --remove-orphans
   ```

7. Verify the application before removing the local PostgreSQL container. Keep
   its EBS volume and backup for the agreed rollback period.

Relevant AWS documentation:

- EC2 instance specifications:
  https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html
- EC2 security-group rules:
  https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html
- Elastic IP addresses:
  https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-eips.html
- Private RDS PostgreSQL setup:
  https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.CreatingConnecting.PostgreSQL.html
- Route 53 records for EC2:
  https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-ec2-instance.html
- Docker Compose plugin installation:
  https://docs.docker.com/compose/install/linux/
- Prisma production migrations:
  https://docs.prisma.io/docs/cli/migrate/deploy
