package com.finmind.account;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AccountResponse(UUID id, String name, String currency, BigDecimal balance, Instant createdAt) {

    public static AccountResponse from(Account a) {
        return new AccountResponse(a.getId(), a.getName(), a.getCurrency(), a.getBalance(), a.getCreatedAt());
    }
}
