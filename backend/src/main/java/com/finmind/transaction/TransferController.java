package com.finmind.transaction;

import com.finmind.security.AuthUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/transfers")
public class TransferController {

    private final LedgerService ledger;

    public TransferController(LedgerService ledger) {
        this.ledger = ledger;
    }

    /** 201 for a new transfer, 200 when an identical retry (same Idempotency-Key) returns the original. */
    @PostMapping
    public ResponseEntity<TransactionResponse> transfer(
            @AuthenticationPrincipal AuthUser caller,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody TransferRequest req) {
        LedgerResult result = ledger.transfer(caller.id(), req.fromAccountId(), req.toAccountId(),
                idempotencyKey, req.amount(), req.description());
        return ResponseEntity.status(result.replayed() ? HttpStatus.OK : HttpStatus.CREATED)
                .body(result.transaction());
    }
}
