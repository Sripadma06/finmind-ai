# API reference (implemented endpoints)

Base path `/api/v1`. Interactive docs: `/swagger-ui.html`. All endpoints except auth and health need
`Authorization: Bearer <jwt>`. Money-moving POSTs also need `Idempotency-Key: <1-64 chars>`.

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Public |
| POST | `/auth/register` | `{name,email,password(8-72)}` -> 201 `{token,...}`; 409 if email exists |
| POST | `/auth/login` | `{email,password}` -> 200; 401 generic message on failure |
| GET | `/users/me` | Current user |
| GET | `/accounts` | Caller's accounts |
| POST | `/accounts` | `{name,currency: INR\|USD\|EUR}` -> 201; max 20 per user |
| GET | `/accounts/{id}` | 404 if missing OR not owned |
| POST | `/accounts/{id}/deposits` | `{amount,description?,categoryId?}` |
| POST | `/accounts/{id}/withdrawals` | 422 `Insufficient funds` |
| POST | `/transfers` | `{fromAccountId,toAccountId,amount,description?}` |
| GET | `/transactions` | Query: `accountId,type,from,to,page,size`; newest first |

## Status codes

| Code | Meaning |
|---|---|
| 200 | Idempotent replay (same key + same request) returned the original result |
| 201 | Created |
| 400 | Validation failure, missing `Idempotency-Key`, bad paging, date range > 366 days, page size > 100 |
| 401 | Missing / invalid / expired token, or bad login |
| 404 | Not found or not yours (deliberately indistinguishable) |
| 409 | Duplicate email, or idempotency key reused for a different request |
| 422 | Valid request, business rule violated (insufficient funds, same-account transfer, currency mismatch) |

## Error body

```json
{ "timestamp": "...", "status": 400, "error": "Bad Request", "message": "Validation failed",
  "path": "/api/v1/accounts", "fieldErrors": { "name": "must not be blank" } }
```

## Planned (from the blueprint, not yet implemented)

`/analytics/*`, `/budgets`, `/alerts`, `/ai/chat`, `/ai/categorize`, `/ai/reports`, `/knowledge/*`, `/ai/usage`.
