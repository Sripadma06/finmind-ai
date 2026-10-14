package com.finmind.account;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {

    List<Account> findByUserIdOrderByCreatedAtAsc(UUID userId);

    Optional<Account> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);

    /**
     * SELECT ... FOR UPDATE on the caller's own accounts only. Ordering by id means every transaction
     * acquires locks in the same order, which prevents deadlocks between opposite transfers (A->B and B->A).
     * Accounts owned by anyone else are simply not returned, so ownership is enforced in the query itself.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Account a where a.id in :ids and a.userId = :userId order by a.id")
    List<Account> findOwnedForUpdate(@Param("ids") Collection<UUID> ids, @Param("userId") UUID userId);
}
