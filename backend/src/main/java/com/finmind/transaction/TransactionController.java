package com.finmind.transaction;

import com.finmind.common.PageResponse;
import com.finmind.security.AuthUser;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionController {

    private final TransactionQueryService queryService;

    public TransactionController(TransactionQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping
    public PageResponse<TransactionResponse> list(
            @AuthenticationPrincipal AuthUser caller,
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return queryService.search(caller.id(), accountId, type, from, to, page, size);
    }
}
