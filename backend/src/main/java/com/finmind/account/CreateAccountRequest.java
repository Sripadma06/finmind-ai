package com.finmind.account;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateAccountRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Pattern(regexp = "INR|USD|EUR", message = "must be one of INR, USD, EUR") String currency) {
}
