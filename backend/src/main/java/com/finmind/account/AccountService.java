package com.finmind.account;

import com.finmind.audit.AuditService;
import com.finmind.common.BusinessException;
import com.finmind.common.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class AccountService {

    static final int MAX_ACCOUNTS_PER_USER = 20;

    private final AccountRepository accounts;
    private final AuditService audit;

    public AccountService(AccountRepository accounts, AuditService audit) {
        this.accounts = accounts;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> list(UUID userId) {
        return accounts.findByUserIdOrderByCreatedAtAsc(userId).stream().map(AccountResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public AccountResponse get(UUID userId, UUID accountId) {
        // Same message whether the account is missing or belongs to someone else.
        return accounts.findByIdAndUserId(accountId, userId)
                .map(AccountResponse::from)
                .orElseThrow(() -> new NotFoundException("Account not found"));
    }

    @Transactional
    public AccountResponse create(UUID userId, CreateAccountRequest req) {
        if (accounts.countByUserId(userId) >= MAX_ACCOUNTS_PER_USER) {
            throw new BusinessException("Account limit reached (" + MAX_ACCOUNTS_PER_USER + ")");
        }
        Account account = accounts.save(new Account(userId, req.name().trim(), req.currency()));
        audit.record(userId, "ACCOUNT_CREATED", "ACCOUNT", account.getId());
        return AccountResponse.from(account);
    }
}
