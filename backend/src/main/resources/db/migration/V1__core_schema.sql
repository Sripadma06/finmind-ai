-- V1: core financial schema (users, accounts, categories, transactions, ledger entries)
-- Money is always NUMERIC(19,2). Primary keys are UUIDs so IDs cannot be enumerated.

CREATE TABLE users (
    id            UUID         PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(254) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE accounts (
    id         UUID          PRIMARY KEY,
    user_id    UUID          NOT NULL REFERENCES users (id),
    name       VARCHAR(100)  NOT NULL,
    currency   VARCHAR(3)       NOT NULL,
    balance    NUMERIC(19,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    -- Last line of defence against overspending, independent of application code.
    CONSTRAINT ck_accounts_balance_non_negative CHECK (balance >= 0)
);
CREATE INDEX idx_accounts_user ON accounts (user_id);

CREATE TABLE categories (
    id            UUID         PRIMARY KEY,
    name          VARCHAR(60)  NOT NULL,
    category_type VARCHAR(10)  NOT NULL,
    CONSTRAINT uq_categories_name UNIQUE (name),
    CONSTRAINT ck_categories_type CHECK (category_type IN ('INCOME', 'EXPENSE'))
);

CREATE TABLE transactions (
    id             UUID          PRIMARY KEY,
    user_id        UUID          NOT NULL REFERENCES users (id),
    -- Client-supplied Idempotency-Key. A retried request returns the original result.
    reference_id   VARCHAR(64)   NOT NULL,
    type           VARCHAR(12)   NOT NULL,
    amount         NUMERIC(19,2) NOT NULL,
    currency       VARCHAR(3)       NOT NULL,
    status         VARCHAR(12)   NOT NULL,
    description    VARCHAR(255),
    category_id    UUID          REFERENCES categories (id),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_transactions_user_reference UNIQUE (user_id, reference_id),
    CONSTRAINT ck_transactions_type   CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER')),
    CONSTRAINT ck_transactions_status CHECK (status IN ('COMPLETED', 'FAILED')),
    CONSTRAINT ck_transactions_amount CHECK (amount > 0)
);
CREATE INDEX idx_transactions_user_created ON transactions (user_id, created_at DESC);

-- Double-entry style ledger: a transfer = one DEBIT entry + one CREDIT entry.
-- Entries are append-only history; the application never updates or deletes them.
CREATE TABLE transaction_entries (
    id             UUID          PRIMARY KEY,
    transaction_id UUID          NOT NULL REFERENCES transactions (id),
    account_id     UUID          NOT NULL REFERENCES accounts (id),
    entry_type     VARCHAR(6)    NOT NULL,
    amount         NUMERIC(19,2) NOT NULL,
    balance_after  NUMERIC(19,2) NOT NULL,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_entries_type   CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    CONSTRAINT ck_entries_amount CHECK (amount > 0)
);
CREATE INDEX idx_entries_transaction ON transaction_entries (transaction_id);
CREATE INDEX idx_entries_account     ON transaction_entries (account_id, created_at DESC);
