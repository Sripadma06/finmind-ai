package com.finmind.account;

import com.finmind.security.AuthUser;
import com.finmind.transaction.LedgerResult;
import com.finmind.transaction.LedgerService;
import com.finmind.transaction.MoneyRequest;
import com.finmind.transaction.TransactionResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/accounts")
public class AccountController {

    private final AccountService accountService;
    private final LedgerService ledger;

    public AccountController(AccountService accountService, LedgerService ledger) {
        this.accountService = accountService;
        this.ledger = ledger;
    }

    @GetMapping
    public List<AccountResponse> list(@AuthenticationPrincipal AuthUser caller) {
        return accountService.list(caller.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse create(@AuthenticationPrincipal AuthUser caller,
                                  @Valid @RequestBody CreateAccountRequest req) {
        return accountService.create(caller.id(), req);
    }

    @GetMapping("/{id}")
    public AccountResponse get(@AuthenticationPrincipal AuthUser caller, @PathVariable UUID id) {
        return accountService.get(caller.id(), id);
    }

    @PostMapping("/{id}/deposits")
    public ResponseEntity<TransactionResponse> deposit(
            @AuthenticationPrincipal AuthUser caller,
            @PathVariable UUID id,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody MoneyRequest req) {
        LedgerResult result = ledger.deposit(caller.id(), id, idempotencyKey, req.amount(),
                req.description(), req.categoryId());
        return respond(result);
    }

    @PostMapping("/{id}/withdrawals")
    public ResponseEntity<TransactionResponse> withdraw(
            @AuthenticationPrincipal AuthUser caller,
            @PathVariable UUID id,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody MoneyRequest req) {
        LedgerResult result = ledger.withdraw(caller.id(), id, idempotencyKey, req.amount(),
                req.description(), req.categoryId());
        return respond(result);
    }

    private static ResponseEntity<TransactionResponse> respond(LedgerResult result) {
        return ResponseEntity.status(result.replayed() ? HttpStatus.OK : HttpStatus.CREATED)
                .body(result.transaction());
    }
}
