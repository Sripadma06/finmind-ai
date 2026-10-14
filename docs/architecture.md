# Architecture

## Style

Modular monolith: one Spring Boot deployable, packages separated by business capability. No microservices
until there is a demonstrated need. `frontend/` and (later) `ml/` are separate codebases.

## Request flow (current)

```
React (Vite)  --HTTPS/JSON-->  Spring Security filter chain
                                  JwtAuthFilter -> AuthUser in SecurityContext
                                       |
                              Controller (HTTP, validation)
                                       |
                              Service (business rules, @Transactional)
                                       |
                              Repository (Spring Data JPA) -> PostgreSQL
```

## Packages (`com.finmind`)

| Package | Responsibility |
|---|---|
| `config` | Security filter chain, CORS, OpenAPI |
| `security` | JWT creation/validation, `AuthUser` principal |
| `common` | `ApiError`, exceptions, global handler, health, paging |
| `auth`, `user` | Register / login, current user |
| `account` | User-owned accounts, row-locking repository query |
| `transaction` | `LedgerService` (the only code that moves money), history query, controllers |
| `audit` | Append-only audit log |

Planned: `category`, `budget`, `analytics`, `alert` (Stage 4); `ai.*` (Stages 6-9).

## Money movement (the critical path)

`LedgerService` methods are single database transactions:

1. `SELECT ... FOR UPDATE` on the caller's own accounts, ordered by id.
2. With locks held, look up `(user_id, reference_id)`: replay the original result if identical, 409 if different.
3. Apply debit/credit on the locked rows (in-memory check + DB `CHECK (balance >= 0)`).
4. Insert the transaction header, ledger entries (with `balance_after`) and an audit row.
5. Commit: everything or nothing.

## AI layer (future, from the blueprint)

AI will sit beside the finance code, never inside it. The LLM can only call narrow, read-only Java tools that
re-validate arguments and re-check ownership; numbers are computed by SQL/Java and the model only explains them.
Core APIs must keep working when the LLM provider is down.
