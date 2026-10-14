package com.finmind.transaction;

import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Header of a financial operation. Immutable once written: the application never updates it. */
@Entity
@Table(name = "transactions")
public class LedgerTransaction {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "reference_id", nullable = false, updatable = false, length = 64)
    private String referenceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 12)
    private TransactionType type;

    @Column(nullable = false, updatable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, updatable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 12)
    private TransactionStatus status;

    @Column(updatable = false)
    private String description;

    @Column(name = "category_id", updatable = false)
    private UUID categoryId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected LedgerTransaction() {
    }

    public LedgerTransaction(UUID userId, String referenceId, TransactionType type, BigDecimal amount,
                             String currency, String description, UUID categoryId) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.referenceId = referenceId;
        this.type = type;
        this.amount = amount;
        this.currency = currency;
        this.status = TransactionStatus.COMPLETED;
        this.description = description;
        this.categoryId = categoryId;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getReferenceId() { return referenceId; }
    public TransactionType getType() { return type; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public TransactionStatus getStatus() { return status; }
    public String getDescription() { return description; }
    public UUID getCategoryId() { return categoryId; }
    public Instant getCreatedAt() { return createdAt; }
}
