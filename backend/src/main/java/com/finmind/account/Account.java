package com.finmind.account;

import com.finmind.common.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "accounts")
public class Account {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 3, updatable = false)
    private String currency;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balance;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Account() {
    }

    public Account(UUID userId, String name, String currency) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.name = name;
        this.currency = currency;
        this.balance = BigDecimal.ZERO.setScale(2);
        this.createdAt = Instant.now();
    }

    /** Only the ledger service should call this, while holding a row lock on the account. */
    public void credit(BigDecimal amount) {
        this.balance = this.balance.add(amount);
    }

    /** Only the ledger service should call this, while holding a row lock on the account. */
    public void debit(BigDecimal amount) {
        if (this.balance.compareTo(amount) < 0) {
            throw new BusinessException("Insufficient funds");
        }
        this.balance = this.balance.subtract(amount);
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getName() { return name; }
    public String getCurrency() { return currency; }
    public BigDecimal getBalance() { return balance; }
    public Instant getCreatedAt() { return createdAt; }
}
