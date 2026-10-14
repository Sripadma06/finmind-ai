package com.finmind.security;

import java.util.UUID;

/** The authenticated caller, derived from a verified JWT. Injected via @AuthenticationPrincipal. */
public record AuthUser(UUID id, String email) {
}
