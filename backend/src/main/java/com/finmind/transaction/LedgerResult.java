package com.finmind.transaction;

/** Outcome of a ledger operation. {@code replayed} is true when an idempotent retry returned the original. */
public record LedgerResult(TransactionResponse transaction, boolean replayed) {
}
