# Database schema

Managed by Flyway (`backend/src/main/resources/db/migration`). Hibernate runs with `ddl-auto: validate`.
All primary keys are UUIDs. All money columns are `NUMERIC(19,2)`.

| Migration | Contents |
|---|---|
| `V1__core_schema.sql` | `users`, `accounts`, `categories`, `transactions`, `transaction_entries` |
| `V2__budgets_alerts_audit.sql` | `budgets`, `alerts`, `audit_logs`, seed categories |
| `V3__ai_knowledge_tables.sql` | `knowledge_documents`, `document_chunks` (pgvector), `ai_interactions` (needs the pgvector extension) |

## Relationships

```
users 1---* accounts
users 1---* transactions 1---* transaction_entries *---1 accounts
categories 1---* transactions (optional) / budgets
users 1---* budgets, alerts, ai_interactions
knowledge_documents 1---* document_chunks
```

## Integrity rules enforced by the database

| Rule | Constraint |
|---|---|
| Unique login email | `uq_users_email` |
| Balance never negative | `ck_accounts_balance_non_negative` |
| Retried request cannot create a second transaction | `uq_transactions_user_reference (user_id, reference_id)` |
| Positive amounts only | `ck_transactions_amount`, `ck_entries_amount`, `ck_budgets_limit` |
| Allowed enum values | `ck_transactions_type`, `ck_transactions_status`, `ck_entries_type`, `ck_alerts_status`, `ck_categories_type` |
| One budget per user/category/month | `uq_budgets_user_category_period` |

## Ledger model

A transfer writes one `transactions` row (type `TRANSFER`) and two `transaction_entries` rows: a `DEBIT` on the
source and a `CREDIT` on the destination, each storing `balance_after`. Deposits and withdrawals write one entry.
The application never updates or deletes ledger rows.

## Notes

- `document_chunks.embedding` is `vector(1536)`. Change the dimension in a new migration if you pick an
  embedding model with a different size.
- Never edit an applied migration; add `V4__...sql` instead.
