# Threat model (current stage)

| Threat | Mitigation | Where |
|---|---|---|
| Reading/modifying another user's account by guessing IDs | UUID ids; ownership in the SQL query; 404 for foreign resources | `AccountRepository.findOwnedForUpdate`, `AccountService` |
| Double-spend by concurrent requests | `SELECT ... FOR UPDATE` + `CHECK (balance >= 0)` | `LedgerService`, `V1` |
| Deadlock between opposite transfers | Locks always taken in id order | `AccountRepository` |
| Duplicate charge from client retry | Idempotency key, unique per user | `LedgerService`, `V1` |
| Partial transfer (debit without credit) | One DB transaction | `LedgerService` |
| Password theft from DB leak | BCrypt hashes; hash never returned by the API | `AuthService`, `UserResponse` |
| Forged / tampered tokens | HMAC-signed JWT, expiry, 32+ char secret enforced at startup | `JwtService` |
| Secrets in source control | `.env` git-ignored; no default JWT secret | `.gitignore`, `application.yml` |
| Information leakage in errors | Uniform `ApiError`; stack traces only in server logs | `GlobalExceptionHandler` |
| Account enumeration via login | Same 401 message for unknown email and wrong password | `AuthService` |
| Unbounded queries | Page size <= 100, date range <= 366 days | `TransactionQueryService` |
| Sensitive data in logs | Audit log stores no amounts or personal data | `AuditLog` |

## Known gaps (to address in later stages)

- No rate limiting / lockout on `/auth/login`.
- Registration reveals existing emails (409).
- JWT in `localStorage` (XSS exposure); consider httpOnly cookies.
- No refresh tokens or token revocation.

## AI-specific threats (Stages 6-9)

Prompt injection through retrieved documents, tool-argument abuse, cross-user data in prompts and cost abuse are
addressed by the design rules in the blueprint: read-only tools, per-call authorization, treat retrieved text as
untrusted, step/tool-call limits, token usage tracking. Record the evidence in `ai-evaluation.md`.
