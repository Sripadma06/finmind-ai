package com.finmind.security;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "0123456789-0123456789-0123456789-abcdef";

    @Test
    void issuedTokenRoundTrips() {
        JwtService jwt = new JwtService(new JwtProperties(SECRET, 60));
        UUID id = UUID.randomUUID();

        String token = jwt.issue(id, "a@example.com");

        assertThat(jwt.parse(token)).contains(new AuthUser(id, "a@example.com"));
    }

    @Test
    void tamperedTokenIsRejected() {
        JwtService jwt = new JwtService(new JwtProperties(SECRET, 60));
        String token = jwt.issue(UUID.randomUUID(), "a@example.com");

        assertThat(jwt.parse(token + "x")).isEmpty();
        assertThat(jwt.parse("not-a-jwt")).isEmpty();
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        JwtService issuer = new JwtService(new JwtProperties("another-secret-another-secret-another-secret", 60));
        JwtService verifier = new JwtService(new JwtProperties(SECRET, 60));

        assertThat(verifier.parse(issuer.issue(UUID.randomUUID(), "a@example.com"))).isEmpty();
    }

    @Test
    void shortSecretFailsFast() {
        assertThatThrownBy(() -> new JwtService(new JwtProperties("too-short", 60)))
                .isInstanceOf(IllegalStateException.class);
    }
}
