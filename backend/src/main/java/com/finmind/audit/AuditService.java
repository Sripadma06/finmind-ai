package com.finmind.audit;

import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuditService {

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    /** Joins the caller's transaction, so an audit row exists if and only if the action committed. */
    public void record(UUID actorId, String action, String targetType, UUID targetId) {
        repository.save(new AuditLog(actorId, action, targetType, targetId));
    }
}
