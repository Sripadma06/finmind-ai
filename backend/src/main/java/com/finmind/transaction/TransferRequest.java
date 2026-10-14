package com.finmind.transaction;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record TransferRequest(
        @NotNull UUID fromAccountId,
        @NotNull UUID toAccountId,
        @NotNull @DecimalMin("0.01") @DecimalMax("100000000.00") @Digits(integer = 9, fraction = 2) BigDecimal amount,
        @Size(max = 255) String description) {
}
