package com.finmind.user;

import com.finmind.common.NotFoundException;
import com.finmind.security.AuthUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthUser caller) {
        return users.findById(caller.id())
                .map(UserResponse::from)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }
}
