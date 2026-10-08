package org.insa.pki.certificatemanagement.certificateManagmentBackend.config;


import jakarta.persistence.criteria.Predicate;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditFilterRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditLog;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class AuditSpecification {

    public static Specification<AuditLog> filter(AuditFilterRequest req) {

        return (root, query, cb) -> {

            List<Predicate> predicates = new ArrayList<>();

            if (req.getUsername() != null) {
                predicates.add(cb.equal(root.get("username"), req.getUsername()));
            }

            if (req.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), req.getStatus()));
            }

            if (req.getAction() != null) {
                predicates.add(cb.equal(root.get("action"), req.getAction()));
            }

            if (req.getCorrelationId() != null) {
                predicates.add(cb.equal(root.get("correlationId"), req.getCorrelationId()));
            }

            if (req.getFrom() != null && req.getTo() != null) {
                predicates.add(
                        cb.between(
                                root.get("timestamp"),
                                req.getFrom(),
                                req.getTo()
                        )
                );
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}