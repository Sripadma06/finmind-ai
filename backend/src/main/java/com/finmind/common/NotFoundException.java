package com.finmind.common;

/** Resource does not exist OR does not belong to the caller (deliberately indistinguishable). */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
