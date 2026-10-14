package com.finmind.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey key;
    private final Duration expiry;

    public JwtService(JwtProperties properties) {
        byte[] secret = properties.secret() == null ? new byte[0] : properties.secret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < 32) {
            throw new IllegalStateException("finmind.jwt.secret (JWT_SECRET) must be at least 32 characters");
        }
        this.key = Keys.hmacShaKeyFor(secret);
        this.expiry = Duration.ofMinutes(properties.expiryMinutes() > 0 ? properties.expiryMinutes() : 60);
    }

    public String issue(UUID userId, String email) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expiry)))
                .signWith(key)
                .compact();
    }

    public long expirySeconds() {
        return expiry.toSeconds();
    }

    /** Returns the caller if the token is well-formed, correctly signed and unexpired. */
    public Optional<AuthUser> parse(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return Optional.of(new AuthUser(UUID.fromString(claims.getSubject()), claims.get("email", String.class)));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
