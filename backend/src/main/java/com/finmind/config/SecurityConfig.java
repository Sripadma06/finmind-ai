package com.finmind.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finmind.common.ApiError;
import com.finmind.security.JwtAuthFilter;
import com.finmind.security.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtService jwtService, ObjectMapper mapper)
            throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)              // stateless API, no cookies
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/v1/auth/**", "/api/v1/health", "/actuator/health/**",
                                "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html",
                                "/api/ai/**").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) ->
                                writeError(res, mapper, 401, "Unauthorized", "Authentication required", req.getRequestURI()))
                        .accessDeniedHandler((req, res, ex) ->
                                writeError(res, mapper, 403, "Forbidden", "Access denied", req.getRequestURI())))
                .addFilterBefore(new JwtAuthFilter(jwtService), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${finmind.cors.allowed-origins}") String allowedOrigins) {
        CorsConfiguration cfg = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(",")).map(String::trim).toList();
        cfg.setAllowedOrigins(origins);
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
        cfg.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    private static void writeError(HttpServletResponse res, ObjectMapper mapper, int status, String error,
                                   String message, String path) throws java.io.IOException {
        res.setStatus(status);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(res.getOutputStream(), ApiError.of(status, error, message, path));
    }
}
