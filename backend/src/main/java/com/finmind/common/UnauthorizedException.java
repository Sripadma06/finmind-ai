package com.finmind.common;

/** Authentication failed. HTTP 401. */
public class UnauthorizedException extends RuntimeException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
