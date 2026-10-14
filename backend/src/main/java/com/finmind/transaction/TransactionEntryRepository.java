package com.finmind.transaction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface TransactionEntryRepository extends JpaRepository<TransactionEntry, UUID> {

    List<TransactionEntry> findByTransactionIdIn(Collection<UUID> transactionIds);

    List<TransactionEntry> findByTransactionId(UUID transactionId);
}
