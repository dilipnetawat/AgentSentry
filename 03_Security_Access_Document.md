# 03 — Security & Access Document

## 1. Security Objectives
- Prevent malicious untrusted instructions from reaching sensitive agent execution paths.
- Detect suspicious behavior.
- Minimize privilege.
- Maintain auditable security events.
- Keep AgentSentry itself resistant to compromise.

## 2. Threat Model
Covered threats:
- Indirect prompt injection
- Tool poisoning
- Data exfiltration
- Credential theft
- Memory poisoning
- Vector-store poisoning
- Privilege escalation
- API abuse
- Dashboard compromise
- HoneyToken discovery
- Denial of service

## 3. Trust Boundaries
1. External/untrusted data
2. AgentSentry ingestion
3. Detection engine
4. AI agent
5. Tools
6. Memory/vector store
7. Security dashboard
8. Administrative users

Never treat external content as trusted merely because it came from a legitimate source.

## 4. Authentication
Use secure session/token authentication for the dashboard. Service-to-service agent integration should use scoped credentials.

Never store plaintext API keys.

## 5. Authorization
Use RBAC.

| Permission | Super Admin | Security Analyst | Developer | Viewer |
|---|---:|---:|---:|---:|
| View dashboard | YES | YES | YES | YES |
| View alerts | YES | YES | YES | YES |
| View events | YES | YES | YES | YES |
| Modify policies | YES | YES | YES | NO |
| Manage agents | YES | YES | YES | NO |
| Isolate agent | YES | YES | NO | NO |
| Restore agent | YES | YES | NO | NO |
| Manage users | YES | NO | NO | NO |
| View audit logs | YES | YES | YES | NO |

## 6. Least Privilege
- Agent service accounts receive only required tool permissions.
- Dashboard users receive only required operations.
- Kill-switch permission is restricted.
- Detection services should not automatically receive unrestricted tool access.

## 7. Prompt-Injection Defense
Defense should be layered:
1. Content provenance.
2. Input normalization.
3. Deterministic indicators.
4. Semantic detection.
5. Risk scoring.
6. Policy decision.
7. Tool permission checks.
8. Output monitoring.

No single detector should be presented as guaranteeing prompt-injection prevention.

## 8. HoneyToken Security
HoneyTokens should:
- Be uniquely identifiable.
- Contain no real secrets.
- Be scoped to an agent or tenant.
- Generate an event on access.
- Avoid resembling operational credentials.
- Be rotated eventually in a production implementation.

## 9. API Security
- HTTPS in production.
- Input validation.
- Authentication on protected endpoints.
- Authorization on every sensitive operation.
- Rate limiting.
- Request size limits.
- Structured logging.
- Secure CORS configuration.

## 10. Data Protection
- Do not log full sensitive prompts by default.
- Redact secrets.
- Encrypt data in transit.
- Encrypt production storage where supported.
- Define retention policies.

## 11. Kill-Switch
The kill-switch should:
1. Authenticate the operator.
2. Authorize the action.
3. Record an audit event.
4. Mark the agent isolated.
5. Reject new controlled executions.
6. Notify the dashboard.
7. Require explicit restoration.

## 12. Security Event Severity
- CRITICAL: confirmed dangerous action or sensitive-data exfiltration attempt.
- HIGH: high-confidence malicious instruction or HoneyToken trigger.
- MEDIUM: suspicious content requiring review.
- LOW: weak indicator/anomaly.

## 13. Security Testing
- Unit tests for detectors.
- Integration tests for policy decisions.
- Adversarial prompt corpus.
- Authentication/authorization tests.
- API abuse tests.
- Dependency scanning.
- Container scanning.
- Manual attack simulation.

## 14. Important Limitation
AgentSentry should be described as a defense-in-depth system, not a guarantee against all prompt injection.

## 15. Assumptions
The MVP uses synthetic secrets and demo agents. Production deployments require stronger identity, tenant isolation, secret management, monitoring, and compliance controls.

## 16. Next Steps
Create an attack corpus, implement RBAC, test policy bypasses, and perform adversarial evaluation before claiming production readiness.
