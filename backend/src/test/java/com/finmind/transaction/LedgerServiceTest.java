package com.finmind.transaction;

import com.finmind.account.Account;
import com.finmind.account.AccountRepository;
import com.finmind.audit.AuditService;
import com.finmind.common.BadRequestException;
import com.finmind.common.BusinessException;
import com.finmind.common.ConflictException;
import com.finmind.common.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LedgerServiceTest {

    @Mock AccountRepository accounts;
    @Mock LedgerTransactionRepository transactions;
    @Mock TransactionEntryRepository entries;
    @Mock AuditService audit;

    LedgerService ledger;
    final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        ledger = new LedgerService(accounts, transactions, entries, audit);
    }

    private Account account(String currency, String balance) {
        Account a = new Account(userId, "Test", currency);
        if (new BigDecimal(balance).signum() > 0) {
            a.credit(new BigDecimal(balance));
        }
        return a;
    }

    private void stubSaves() {
        when(transactions.save(any(LedgerTransaction.class))).thenAnswer(i -> i.getArgument(0));
        when(entries.save(any(TransactionEntry.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void depositIncreasesBalanceAndWritesCreditEntry() {
        Account acc = account("INR", "0");
        when(accounts.findOwnedForUpdate(any(), eq(userId))).thenReturn(List.of(acc));
        stubSaves();

        LedgerResult result = ledger.deposit(userId, acc.getId(), "key-0001", new BigDecimal("100.50"), "salary", null);

        assertThat(acc.getBalance()).isEqualByComparingTo("100.50");
        assertThat(result.replayed()).isFalse();
        assertThat(result.transaction().type()).isEqualTo(TransactionType.DEPOSIT);
        assertThat(result.transaction().entries()).hasSize(1);
        assertThat(result.transaction().entries().get(0).entryType()).isEqualTo(EntryType.CREDIT);
        assertThat(result.transaction().entries().get(0).balanceAfter()).isEqualByComparingTo("100.50");
    }

    @Test
    void withdrawalBeyondBalanceIsRejectedAndNothingIsSaved() {
        Account acc = account("INR", "50.00");
        when(accounts.findOwnedForUpdate(any(), eq(userId))).thenReturn(List.of(acc));

        assertThatThrownBy(() -> ledger.withdraw(userId, acc.getId(), "key-0002", new BigDecimal("50.01"), null, null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Insufficient");

        assertThat(acc.getBalance()).isEqualByComparingTo("50.00");
        verify(transactions, never()).save(any());
        verify(entries, never()).save(any());
    }

    @Test
    void transferMovesMoneyWithOneDebitAndOneCredit() {
        Account from = account("INR", "500.00");
        Account to = account("INR", "0");
        when(accounts.findOwnedForUpdate(any(), eq(userId))).thenReturn(List.of(from, to));
        stubSaves();

        LedgerResult result = ledger.transfer(userId, from.getId(), to.getId(), "key-0003",
                new BigDecimal("200.00"), "rent share");

        assertThat(from.getBalance()).isEqualByComparingTo("300.00");
        assertThat(to.getBalance()).isEqualByComparingTo("200.00");
        List<TransactionResponse.EntryResponse> e = result.transaction().entries();
        assertThat(e).hasSize(2);
        assertThat(e.get(0).entryType()).isEqualTo(EntryType.DEBIT);
        assertThat(e.get(0).accountId()).isEqualTo(from.getId());
        assertThat(e.get(1).entryType()).isEqualTo(EntryType.CREDIT);
        assertThat(e.get(1).accountId()).isEqualTo(to.getId());
    }

    @Test
    void transferToSameAccountIsRejected() {
        UUID id = UUID.randomUUID();
        assertThatThrownBy(() -> ledger.transfer(userId, id, id, "key-0004", BigDecimal.TEN, null))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void transferAcrossCurrenciesIsRejected() {
        Account from = account("INR", "100.00");
        Account to = account("USD", "0");
        when(accounts.findOwnedForUpdate(any(), eq(userId))).thenReturn(List.of(from, to));

        assertThatThrownBy(() -> ledger.transfer(userId, from.getId(), to.getId(), "key-0005",
                BigDecimal.TEN, null)).isInstanceOf(BusinessException.class);
        assertThat(from.getBalance()).isEqualByComparingTo("100.00");
    }

    @Test
    void accountNotOwnedByCallerIsReportedAsNotFound() {
        // The locking query only returns the caller's accounts, so another user's account yields an empty list.
        when(accounts.findOwnedForUpdate(any(), eq(userId))).thenReturn(List.of());

        assertThatThrownBy(() -> ledger.deposit(userId, UUID.randomUUID(), "key-0006", BigDecimal.TEN, null, null))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void identicalRetryReturnsOriginalWithoutChangingBalance() {
        Account acc = account("INR", "100.00");
        LedgerTransaction original = new LedgerTransaction(userId, "key-0007", TransactionType.DEPOSIT,
                new BigDecimal("100.00"), "INR", null, null);
        TransactionEntry entry = new TransactionEntry(original.getId(), acc.getId(), EntryType.CREDIT,
                new BigDecimal("100.00"), new BigDecimal("100.00"));
        when(accounts.findOwnedForUpdate(any(), eq(userId))).thenReturn(List.of(acc));
        when(transactions.findByUserIdAndReferenceId(userId, "key-0007")).thenReturn(Optional.of(original));
        when(entries.findByTransactionId(original.getId())).thenReturn(List.of(entry));

        LedgerResult result = ledger.deposit(userId, acc.getId(), "key-0007", new BigDecimal("100.00"), null, null);

        assertThat(result.replayed()).isTrue();
        assertThat(result.transaction().id()).isEqualTo(original.getId());
        assertThat(acc.getBalance()).isEqualByComparingTo("100.00"); // not credited a second time
        verify(transactions, never()).save(any());
    }

    @Test
    void reusingKeyForDifferentRequestIsAConflict() {
        Account acc = account("INR", "100.00");
        LedgerTransaction original = new LedgerTransaction(userId, "key-0008", TransactionType.DEPOSIT,
                new BigDecimal("100.00"), "INR", null, null);
        TransactionEntry entry = new TransactionEntry(original.getId(), acc.getId(), EntryType.CREDIT,
                new BigDecimal("100.00"), new BigDecimal("100.00"));
        when(accounts.findOwnedForUpdate(any(), eq(userId))).thenReturn(List.of(acc));
        when(transactions.findByUserIdAndReferenceId(userId, "key-0008")).thenReturn(Optional.of(original));
        when(entries.findByTransactionId(original.getId())).thenReturn(List.of(entry));

        assertThatThrownBy(() -> ledger.deposit(userId, acc.getId(), "key-0008", new BigDecimal("999.00"), null, null))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void blankIdempotencyKeyIsRejected() {
        assertThatThrownBy(() -> ledger.deposit(userId, UUID.randomUUID(), "  ", BigDecimal.TEN, null, null))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void amountWithMoreThanTwoDecimalsIsRejected() {
        assertThatThrownBy(() -> ledger.deposit(userId, UUID.randomUUID(), "key-0009",
                new BigDecimal("10.001"), null, null)).isInstanceOf(BadRequestException.class);
    }
}
