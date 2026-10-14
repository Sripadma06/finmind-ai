package com.finmind.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "finmind.jwt")
public record JwtProperties(String secret, long expiryMinutes) {
}
