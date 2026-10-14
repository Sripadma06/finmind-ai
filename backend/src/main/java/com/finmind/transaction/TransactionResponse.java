package com.finmind.transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public record TransactionResponse(
        UUID id,
        String referenceId,
        TransactionType type,
        BigDecimal amount,
        String currency,
        TransactionStatus status,
        String description,
        UUID categoryId,
        Instant createdAt,
        List<EntryResponse> entries) {

    public record EntryResponse(UUID accountId, EntryType entryType, BigDecimal amount, BigDecimal balanceAfter) {
        static EntryResponse from(TransactionEntry e) {
            return new EntryResponse(e.getAccountId(), e.getEntryType(), e.getAmount(), e.getBalanceAfter());
        }
    }

    public static TransactionResponse from(LedgerTransaction t, List<TransactionEntry> entries) {
        List<EntryResponse> sorted = entries.stream()
                .sorted(Comparator.comparing(TransactionEntry::getEntryType)) // DEBIT before CREDIT
                .map(EntryResponse::from)
                .toList();
        return new TransactionResponse(t.getId(), t.getReferenceId(), t.getType(), t.getAmount(), t.getCurrency(),
                t.getStatus(), t.getDescription(), t.getCategoryId(), t.getCreatedAt(), sorted);
    }
}
