package com.finmind.transaction;

import com.finmind.account.Account;
import com.finmind.account.AccountRepository;
import com.finmind.audit.AuditService;
import com.finmind.common.BadRequestException;
import com.finmind.common.BusinessException;
import com.finmind.common.ConflictException;
import com.finmind.common.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The only place that moves money. Every public method is one database transaction: the balance
 * changes, the ledger entries and the audit row all commit together or all roll back.
 *
 * Safety rules, in order, for every operation:
 *  1. Lock the caller's own accounts (SELECT ... FOR UPDATE, ordered by id). Other users' accounts are
 *     never returned by the query, so cross-user access is impossible.
 *  2. With the lock held, check the idempotency key. A retry returns the original result untouched.
 *  3. Apply the change; the CHECK (balance >= 0) constraint in PostgreSQL is a final safety net.
 */
@Service
public class LedgerService {

    private static final int MAX_KEY_LENGTH = 64;

    private final AccountRepository accounts;
    private final LedgerTransactionRepository transactions;
    private final TransactionEntryRepository entries;
    private final AuditService audit;

    public LedgerService(AccountRepository accounts, LedgerTransactionRepository transactions,
                         TransactionEntryRepository entries, AuditService audit) {
        this.accounts = accounts;
        this.transactions = transactions;
        this.entries = entries;
        this.audit = audit;
    }

    @Transactional
    public LedgerResult deposit(UUID userId, UUID accountId, String idempotencyKey, BigDecimal amount,
                                String description, UUID categoryId) {
        String key = requireKey(idempotencyKey);
        BigDecimal value = requireAmount(amount);
        Account account = lockOwned(userId, Set.of(accountId)).get(0);

        var replay = findReplay(userId, key, TransactionType.DEPOSIT, value, Set.of(accountId));
        if (replay != null) {
            return replay;
        }

        account.credit(value);
        LedgerTransaction tx = transactions.save(new LedgerTransaction(
                userId, key, TransactionType.DEPOSIT, value, account.getCurrency(), clean(description), categoryId));
        TransactionEntry entry = entries.save(new TransactionEntry(
                tx.getId(), account.getId(), EntryType.CREDIT, value, account.getBalance()));
        audit.record(userId, "DEPOSIT", "TRANSACTION", tx.getId());
        return new LedgerResult(TransactionResponse.from(tx, List.of(entry)), false);
    }

    @Transactional
    public LedgerResult withdraw(UUID userId, UUID accountId, String idempotencyKey, BigDecimal amount,
                                 String description, UUID categoryId) {
        String key = requireKey(idempotencyKey);
        BigDecimal value = requireAmount(amount);
        Account account = lockOwned(userId, Set.of(accountId)).get(0);

        var replay = findReplay(userId, key, TransactionType.WITHDRAWAL, value, Set.of(accountId));
        if (replay != null) {
            return replay;
        }

        account.debit(value); // throws BusinessException("Insufficient funds")
        LedgerTransaction tx = transactions.save(new LedgerTransaction(
                userId, key, TransactionType.WITHDRAWAL, value, account.getCurrency(), clean(description), categoryId));
        TransactionEntry entry = entries.save(new TransactionEntry(
                tx.getId(), account.getId(), EntryType.DEBIT, value, account.getBalance()));
        audit.record(userId, "WITHDRAWAL", "TRANSACTION", tx.getId());
        return new LedgerResult(TransactionResponse.from(tx, List.of(entry)), false);
    }

    @Transactional
    public LedgerResult transfer(UUID userId, UUID fromAccountId, UUID toAccountId, String idempotencyKey,
                                 BigDecimal amount, String description) {
        String key = requireKey(idempotencyKey);
        BigDecimal value = requireAmount(amount);
        if (fromAccountId.equals(toAccountId)) {
            throw new BusinessException("Source and destination accounts must be different");
        }

        List<Account> locked = lockOwned(userId, Set.of(fromAccountId, toAccountId));
        Account from = locked.stream().filter(a -> a.getId().equals(fromAccountId)).findFirst().orElseThrow();
        Account to = locked.stream().filter(a -> a.getId().equals(toAccountId)).findFirst().orElseThrow();

        var replay = findReplay(userId, key, TransactionType.TRANSFER, value, Set.of(fromAccountId, toAccountId));
        if (replay != null) {
            return replay;
        }
        if (!from.getCurrency().equals(to.getCurrency())) {
            throw new BusinessException("Transfers between different currencies are not supported");
        }

        from.debit(value);
        to.credit(value);
        LedgerTransaction tx = transactions.save(new LedgerTransaction(
                userId, key, TransactionType.TRANSFER, value, from.getCurrency(), clean(description), null));
        TransactionEntry debit = entries.save(new TransactionEntry(
                tx.getId(), from.getId(), EntryType.DEBIT, value, from.getBalance()));
        TransactionEntry credit = entries.save(new TransactionEntry(
                tx.getId(), to.getId(), EntryType.CREDIT, value, to.getBalance()));
        audit.record(userId, "TRANSFER", "TRANSACTION", tx.getId());
        return new LedgerResult(TransactionResponse.from(tx, List.of(debit, credit)), false);
    }

    /** Locks the requested accounts for this user; fails with 404 if any is missing or not theirs. */
    private List<Account> lockOwned(UUID userId, Set<UUID> ids) {
        List<Account> locked = accounts.findOwnedForUpdate(ids, userId);
        if (locked.size() != ids.size()) {
            throw new NotFoundException("Account not found");
        }
        return locked;
    }

    /**
     * If this key was already used by this user: return the original result when the request is identical,
     * otherwise reject, because reusing a key for a different request is a client bug.
     */
    private LedgerResult findReplay(UUID userId, String key, TransactionType type, BigDecimal amount,
                                    Set<UUID> accountIds) {
        var existing = transactions.findByUserIdAndReferenceId(userId, key).orElse(null);
        if (existing == null) {
            return null;
        }
        List<TransactionEntry> existingEntries = entries.findByTransactionId(existing.getId());
        Set<UUID> existingAccounts = existingEntries.stream()
                .map(TransactionEntry::getAccountId).collect(Collectors.toSet());
        boolean identical = existing.getType() == type
                && existing.getAmount().compareTo(amount) == 0
                && existingAccounts.equals(accountIds);
        if (!identical) {
            throw new ConflictException("Idempotency-Key was already used for a different request");
        }
        return new LedgerResult(TransactionResponse.from(existing, existingEntries), true);
    }

    private static String requireKey(String key) {
        String trimmed = key == null ? "" : key.trim();
        if (trimmed.isEmpty() || trimmed.length() > MAX_KEY_LENGTH) {
            throw new BadRequestException("Idempotency-Key must be between 1 and " + MAX_KEY_LENGTH + " characters");
        }
        return trimmed;
    }

    private static BigDecimal requireAmount(BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw new BadRequestException("Amount must be greater than zero");
        }
        if (amount.scale() > 2 && amount.stripTrailingZeros().scale() > 2) {
            throw new BadRequestException("Amount can have at most 2 decimal places");
        }
        return amount.setScale(2, java.math.RoundingMode.UNNECESSARY);
    }

    private static String clean(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        String trimmed = description.trim();
        return trimmed.length() > 255 ? trimmed.substring(0, 255) : trimmed;
    }
}
