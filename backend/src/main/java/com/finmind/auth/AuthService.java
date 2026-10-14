package com.finmind.auth;

import com.finmind.audit.AuditService;
import com.finmind.common.ConflictException;
import com.finmind.common.UnauthorizedException;
import com.finmind.security.JwtService;
import com.finmind.user.User;
import com.finmind.user.UserRepository;
import com.finmind.user.UserResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuditService audit;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt, AuditService audit) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.audit = audit;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = normalize(req.email());
        if (users.existsByEmail(email)) {
            throw new ConflictException("Email is already registered");
        }
        User user = users.save(new User(req.name().trim(), email, encoder.encode(req.password())));
        audit.record(user.getId(), "USER_REGISTERED", "USER", user.getId());
        return respond(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        // One generic message for unknown email and wrong password: do not reveal which emails exist.
        User user = users.findByEmail(normalize(req.email()))
                .filter(u -> encoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));
        audit.record(user.getId(), "USER_LOGIN", "USER", user.getId());
        return respond(user);
    }

    private AuthResponse respond(User user) {
        String token = jwt.issue(user.getId(), user.getEmail());
        return new AuthResponse(token, "Bearer", jwt.expirySeconds(), UserResponse.from(user));
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
