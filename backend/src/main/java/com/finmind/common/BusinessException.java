package com.finmind.common;

/** A valid request that violates a business rule (e.g. insufficient funds). Maps to HTTP 422. */
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}
