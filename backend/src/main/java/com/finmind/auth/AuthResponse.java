package com.finmind.auth;

import com.finmind.user.UserResponse;

public record AuthResponse(String token, String tokenType, long expiresInSeconds, UserResponse user) {
}
