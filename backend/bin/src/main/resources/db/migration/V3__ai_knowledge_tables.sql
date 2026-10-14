-- V3: AI tables (used in Stages 6-8). Requires the pgvector extension, which the
-- docker-compose image (pgvector/pgvector:pg16) provides.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_documents (
    id         UUID         PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    source     VARCHAR(500),
    status     VARCHAR(12)  NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE document_chunks (
    id          UUID         PRIMARY KEY,
    document_id UUID         NOT NULL REFERENCES knowledge_documents (id),
    chunk_index INTEGER      NOT NULL,
    content     TEXT         NOT NULL,
    -- Dimension must match the embedding model chosen in Stage 8.
    embedding   vector(1536),
    metadata    JSONB        NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT uq_chunks_doc_index UNIQUE (document_id, chunk_index)
);

CREATE TABLE ai_interactions (
    id         UUID         PRIMARY KEY,
    user_id    UUID         NOT NULL REFERENCES users (id),
    feature    VARCHAR(40)  NOT NULL,
    model      VARCHAR(80),
    status     VARCHAR(20)  NOT NULL,
    input_tokens  INTEGER,
    output_tokens INTEGER,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_interactions_user ON ai_interactions (user_id, created_at DESC);
