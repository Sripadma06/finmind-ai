package com.finmind.transaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface LedgerTransactionRepository
        extends JpaRepository<LedgerTransaction, UUID>, JpaSpecificationExecutor<LedgerTransaction> {

    Optional<LedgerTransaction> findByUserIdAndReferenceId(UUID userId, String referenceId);
}
