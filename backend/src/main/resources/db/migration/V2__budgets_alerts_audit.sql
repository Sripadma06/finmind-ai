-- V2: budgets, alerts, audit log, and seed categories (used by the analytics stage)

CREATE TABLE budgets (
    id            UUID          PRIMARY KEY,
    user_id       UUID          NOT NULL REFERENCES users (id),
    category_id   UUID          NOT NULL REFERENCES categories (id),
    monthly_limit NUMERIC(19,2) NOT NULL,
    period        VARCHAR(7)    NOT NULL,           -- 'YYYY-MM'
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_budgets_user_category_period UNIQUE (user_id, category_id, period),
    CONSTRAINT ck_budgets_limit CHECK (monthly_limit > 0)
);

CREATE TABLE alerts (
    id             UUID         PRIMARY KEY,
    user_id        UUID         NOT NULL REFERENCES users (id),
    transaction_id UUID         REFERENCES transactions (id),
    reason         VARCHAR(255) NOT NULL,
    status         VARCHAR(12)  NOT NULL DEFAULT 'OPEN',
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_alerts_status CHECK (status IN ('OPEN', 'DISMISSED', 'CONFIRMED'))
);
CREATE INDEX idx_alerts_user ON alerts (user_id, created_at DESC);

CREATE TABLE audit_logs (
    id          UUID         PRIMARY KEY,
    actor_id    UUID,
    action      VARCHAR(60)  NOT NULL,
    target_type VARCHAR(40),
    target_id   UUID,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_actor ON audit_logs (actor_id, created_at DESC);

INSERT INTO categories (id, name, category_type) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Salary',        'INCOME'),
    ('00000000-0000-0000-0000-000000000002', 'Other Income',  'INCOME'),
    ('00000000-0000-0000-0000-000000000011', 'Food',          'EXPENSE'),
    ('00000000-0000-0000-0000-000000000012', 'Transport',     'EXPENSE'),
    ('00000000-0000-0000-0000-000000000013', 'Rent',          'EXPENSE'),
    ('00000000-0000-0000-0000-000000000014', 'Utilities',     'EXPENSE'),
    ('00000000-0000-0000-0000-000000000015', 'Shopping',      'EXPENSE'),
    ('00000000-0000-0000-0000-000000000016', 'Entertainment', 'EXPENSE'),
    ('00000000-0000-0000-0000-000000000017', 'Health',        'EXPENSE'),
    ('00000000-0000-0000-0000-000000000018', 'Other Expense', 'EXPENSE');
