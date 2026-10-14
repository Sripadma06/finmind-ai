package com.finmind.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** Append-only record of who did what. Deliberately stores no amounts or personal data. */
@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    private UUID id;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(nullable = false, length = 60)
    private String action;

    @Column(name = "target_type", length = 40)
    private String targetType;

    @Column(name = "target_id")
    private UUID targetId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AuditLog() {
    }

    public AuditLog(UUID actorId, String action, String targetType, UUID targetId) {
        this.id = UUID.randomUUID();
        this.actorId = actorId;
        this.action = action;
        this.targetType = targetType;
        this.targetId = targetId;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getActorId() { return actorId; }
    public String getAction() { return action; }
    public String getTargetType() { return targetType; }
    public UUID getTargetId() { return targetId; }
    public Instant getCreatedAt() { return createdAt; }
}
