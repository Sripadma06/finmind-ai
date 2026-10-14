package com.finmind.common;

/** Malformed or out-of-range input that bean validation cannot express. HTTP 400. */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
