# FinMind AI

A secure full-stack **simulated** finance application (Java, Spring Boot, React, PostgreSQL) that will grow
into an AI-assisted financial intelligence platform (LLMs, tool calling, RAG, anomaly detection).

> **Simulated finance only.** No real bank accounts, no real money. AI features (later stages) will never
> be given tools that move money, change balances, or run arbitrary SQL.

## Current status: foundation stages (blueprint Stages 1-3, plus a React shell)

| Area | State |
|---|---|
| Repo structure, docker-compose (PostgreSQL + pgvector), `.env.example` | Done |
| Flyway schema: users, accounts, categories, transactions, ledger entries, budgets, alerts, audit logs, AI/knowledge tables | Done |
| Registration, login, BCrypt, JWT, stateless Spring Security | Done |
| Accounts (user-owned), simulated deposits / withdrawals | Done |
| Atomic internal transfers, double-entry ledger, row locking, idempotency keys | Done |
| Transaction history: filters, pagination, capped ranges | Done |
| Centralised error handling, OpenAPI docs, health endpoint | Done |
| JUnit/Mockito unit tests + Testcontainers integration tests | Written, run them (below) |
| React + TypeScript + Tailwind: login/register, accounts, money movement, history | Done |
| UI: dark/light toggle, mobile menu, Ctrl+K site search, back-to-top, storage notice, skeleton loaders, error states with retry, About/Privacy/404 pages, working footer | Done |
| Analytics, budgets, alerts (Stage 4); charts | Schema ready, code next |
| Spring AI, tool calling, RAG, ML, agents (Stages 6-9) | Not started (by design) |
| Dockerfiles for app, CI, deployment (Stage 10) | Not started |

## Prerequisites

- Java 21, Maven 3.9+
- Node 20+ and npm
- Docker (for PostgreSQL and for the integration tests)

## Run it

```bash
# 1. Configuration
cp .env.example .env            # then edit JWT_SECRET (>= 32 chars): openssl rand -base64 48

# 2. Database (PostgreSQL 16 + pgvector)
docker compose up -d db

# 3. Backend  (http://localhost:8080)
cd backend
set -a; source ../.env; set +a   # exports DB_* and JWT_SECRET into your shell
mvn spring-boot:run

# 4. Frontend (http://localhost:5173), in a second terminal
cd frontend
npm install
npm run dev
```

Flyway creates the schema on first start. Check it works:

```bash
curl http://localhost:8080/api/v1/health          # {"status":"UP",...}
open http://localhost:8080/swagger-ui.html         # interactive API docs
```

## Run the tests

```bash
cd backend
mvn verify
```

- `LedgerServiceTest`, `JwtServiceTest`: fast unit tests (no Docker needed).
- `FinMindIntegrationTest`: starts a real PostgreSQL container and exercises auth, ownership isolation,
  atomic and idempotent transfers, concurrent overdraw attempts and opposite-direction transfer deadlocks.
  It is skipped automatically if Docker is not running.

## Try the API with curl

```bash
BASE=http://localhost:8080/api/v1
TOKEN=$(curl -s -X POST $BASE/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Asha","email":"asha@example.com","password":"correct-horse-battery"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

ACC=$(curl -s -X POST $BASE/accounts -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Salary","currency":"INR"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

# Every money-moving call needs an Idempotency-Key. Repeating the same key returns the original result.
curl -s -X POST $BASE/accounts/$ACC/deposits -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: demo-deposit-1' -d '{"amount":"5000.00"}'
```

## Frontend checks

```bash
cd frontend
npm run build         # type-check + production build
npm run check:links   # finds broken internal links (compares every link/navigate target with the routes in App.tsx)
```

## Repository layout

```
finmind-ai/
  backend/    Spring Boot (modular monolith: auth, user, account, transaction, audit, security, common)
  frontend/   React + TypeScript + Vite + Tailwind
  ml/         Reserved for the Python anomaly-detection work (Stage 9); empty on purpose
  docs/       architecture, database schema, API reference, threat model, AI evaluation plan
  docker-compose.yml, .env.example
```

## Key design decisions (be ready to explain these in an interview)

1. **Money is `NUMERIC(19,2)` / `BigDecimal`**, never floating point.
2. **Double-entry ledger**: a transfer is one DEBIT and one CREDIT entry, committed with both balance updates in a
   single database transaction. Ledger rows are append-only.
3. **Pessimistic row locks, taken in id order**, stop concurrent requests overspending and avoid A->B / B->A deadlocks.
   A database `CHECK (balance >= 0)` is the last line of defence.
4. **Idempotency keys** (`UNIQUE (user_id, reference_id)`): a retried request returns the original result instead of
   moving money twice; reusing a key for a different request is rejected with 409.
5. **Ownership is enforced inside the query** (`where user_id = :caller`), and other users' resources return 404,
   so IDs cannot be probed.
6. **Flyway owns the schema**; Hibernate only validates it (`ddl-auto: validate`).
7. **No default JWT secret**: the app refuses to start without a 32+ character `JWT_SECRET`.
8. **Core finance never depends on an LLM**: AI will be a separate layer on top.

## Known limitations (current stage)

- JWT is stored in `localStorage` by the frontend (simple, but readable by any XSS). Production hardening: httpOnly cookies.
- No login rate limiting or account lockout yet.
- Registration reveals whether an email is already registered (409). A trade-off kept for usability.
- Single currency per account; transfers across currencies are rejected.
- Amounts are serialised as JSON numbers; the UI formats them for display only.

See `docs/` for details and `docs/threat-model.md` for the security reasoning.
