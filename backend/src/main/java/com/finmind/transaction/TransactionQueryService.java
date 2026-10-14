package com.finmind.transaction;

import com.finmind.account.AccountRepository;
import com.finmind.common.BadRequestException;
import com.finmind.common.NotFoundException;
import com.finmind.common.PageResponse;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TransactionQueryService {

    static final int MAX_PAGE_SIZE = 100;
    static final int MAX_RANGE_DAYS = 366;

    private final LedgerTransactionRepository transactions;
    private final TransactionEntryRepository entries;
    private final AccountRepository accounts;

    public TransactionQueryService(LedgerTransactionRepository transactions, TransactionEntryRepository entries,
                                   AccountRepository accounts) {
        this.transactions = transactions;
        this.entries = entries;
        this.accounts = accounts;
    }

    /**
     * Newest-first history for one user. {@code from}/{@code to} are inclusive UTC dates; the range is capped
     * so a single request cannot scan unbounded data.
     */
    @Transactional(readOnly = true)
    public PageResponse<TransactionResponse> search(UUID userId, UUID accountId, TransactionType type,
                                                    LocalDate from, LocalDate to, int page, int size) {
        if (page < 0) {
            throw new BadRequestException("page must be >= 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("size must be between 1 and " + MAX_PAGE_SIZE);
        }
        if (from != null && to != null) {
            if (to.isBefore(from)) {
                throw new BadRequestException("'to' must not be before 'from'");
            }
            if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
                throw new BadRequestException("Date range cannot exceed " + MAX_RANGE_DAYS + " days");
            }
        }
        if (accountId != null && accounts.findByIdAndUserId(accountId, userId).isEmpty()) {
            throw new NotFoundException("Account not found");
        }

        Specification<LedgerTransaction> spec = (root, q, cb) -> cb.equal(root.get("userId"), userId);
        if (type != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("type"), type));
        }
        if (from != null) {
            var start = from.atStartOfDay().toInstant(ZoneOffset.UTC);
            spec = spec.and((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), start));
        }
        if (to != null) {
            var endExclusive = to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
            spec = spec.and((root, q, cb) -> cb.lessThan(root.get("createdAt"), endExclusive));
        }
        if (accountId != null) {
            spec = spec.and((root, q, cb) -> {
                Subquery<Integer> sub = q.subquery(Integer.class);
                Root<TransactionEntry> e = sub.from(TransactionEntry.class);
                sub.select(cb.literal(1)).where(
                        cb.equal(e.get("transactionId"), root.get("id")),
                        cb.equal(e.get("accountId"), accountId));
                return cb.exists(sub);
            });
        }

        Page<LedgerTransaction> result = transactions.findAll(spec, PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))));

        List<UUID> ids = result.getContent().stream().map(LedgerTransaction::getId).toList();
        Map<UUID, List<TransactionEntry>> byTx = ids.isEmpty() ? Map.of()
                : entries.findByTransactionIdIn(ids).stream()
                        .sorted(Comparator.comparing(TransactionEntry::getEntryType))
                        .collect(Collectors.groupingBy(TransactionEntry::getTransactionId));

        List<TransactionResponse> content = result.getContent().stream()
                .map(t -> TransactionResponse.from(t, byTx.getOrDefault(t.getId(), List.of())))
                .toList();
        return PageResponse.of(result, content);
    }
}
