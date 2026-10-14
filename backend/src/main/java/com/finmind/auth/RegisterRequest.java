package com.finmind.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email @Size(max = 254) String email,
        // BCrypt only uses the first 72 bytes, so cap the length rather than silently truncating.
        @NotBlank @Size(min = 8, max = 72, message = "must be between 8 and 72 characters") String password) {
}
