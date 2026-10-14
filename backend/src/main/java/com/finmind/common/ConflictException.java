package com.finmind.common;

/** The request conflicts with current state (duplicate email, reused idempotency key). HTTP 409. */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
