# 05 — Feature Ticket List

## EPIC 1 — Project Setup

### AS-001 — Initialize repository
**Priority:** P0  
**Complexity:** S

Create frontend/backend project structure, Git configuration, environment templates, and documentation.

**Acceptance Criteria**
- React + TypeScript frontend runs.
- FastAPI backend runs.
- Environment variables are documented.
- Basic health endpoint exists.

**Definition of Done**
Local development starts from documented commands.

### AS-002 — Docker development environment
**Priority:** P0  
**Complexity:** M

Create Docker Compose for frontend, backend, and PostgreSQL.

**Acceptance Criteria**
- Services start together.
- Database persists data.
- Environment configuration is externalized.

## EPIC 2 — Authentication & Access

### AS-003 — Implement authentication
**Priority:** P1  
**Complexity:** M

Implement protected dashboard authentication.

### AS-004 — Implement RBAC
**Priority:** P1  
**Complexity:** M

Implement Super Admin, Security Analyst, Developer, and Viewer permissions.

**Acceptance Criteria**
Unauthorized users cannot perform protected operations.

## EPIC 3 — Agent Management

### AS-005 — Create agent model
**Priority:** P0  
**Complexity:** S

Store agent identity, status, and risk score.

### AS-006 — Agent registration API
**Priority:** P0  
**Complexity:** M

Implement agent registration and retrieval.

### AS-007 — Agent status management
**Priority:** P0  
**Complexity:** M

Support active, isolated, disabled states.

## EPIC 4 — Data Ingestion

### AS-008 — Implement ingestion endpoint
**Priority:** P0  
**Complexity:** M

Accept normalized external content.

### AS-009 — Input validation
**Priority:** P0  
**Complexity:** S

Validate content size, structure, and metadata.

### AS-010 — Source provenance
**Priority:** P0  
**Complexity:** S

Record source type and provenance metadata.

## EPIC 5 — Semantic Firewall

### AS-011 — Firewall middleware
**Priority:** P0  
**Complexity:** L

Intercept untrusted content before agent processing.

### AS-012 — Rule-based detector
**Priority:** P0  
**Complexity:** M

Detect obvious malicious instruction patterns.

### AS-013 — Semantic detector interface
**Priority:** P0  
**Complexity:** M

Create a provider-agnostic interface for semantic classification.

### AS-014 — Risk scoring
**Priority:** P0  
**Complexity:** M

Generate a 0–100 risk score.

### AS-015 — Policy decision engine
**Priority:** P0  
**Complexity:** M

Map risk and context to allow/block/quarantine.

## EPIC 6 — Prompt Injection Detection

### AS-016 — Attack test corpus
**Priority:** P0  
**Complexity:** M

Create representative indirect prompt-injection examples and legitimate examples.

### AS-017 — Obfuscation test cases
**Priority:** P1  
**Complexity:** M

Test encoded, indirect, and instruction-smuggling variants.

### AS-018 — Detector evaluation
**Priority:** P0  
**Complexity:** M

Measure precision, recall, false positives, and false negatives on the test corpus.

## EPIC 7 — HoneyToken Mesh

### AS-019 — HoneyToken model
**Priority:** P0  
**Complexity:** S

Store token identity, scope, agent, and trigger status.

### AS-020 — HoneyToken generation
**Priority:** P0  
**Complexity:** M

Generate synthetic decoy values that contain no real secrets.

### AS-021 — HoneyToken placement
**Priority:** P0  
**Complexity:** M

Place demo HoneyTokens into controlled agent memory/vector data.

### AS-022 — HoneyToken trigger detection
**Priority:** P0  
**Complexity:** M

Detect token access and create security events.

## EPIC 8 — Security Event Engine

### AS-023 — Security event schema
**Priority:** P0  
**Complexity:** S

Create normalized security-event representation.

### AS-024 — Event persistence
**Priority:** P0  
**Complexity:** M

Store security events in PostgreSQL.

### AS-025 — Severity classification
**Priority:** P0  
**Complexity:** S

Assign Critical/High/Medium/Low severity.

## EPIC 9 — Alert System

### AS-026 — Alert generation
**Priority:** P0  
**Complexity:** M

Create alerts from configured security events.

### AS-027 — Alert acknowledgement
**Priority:** P1  
**Complexity:** S

Allow authorized users to acknowledge alerts.

### AS-028 — Real-time event delivery
**Priority:** P0  
**Complexity:** M

Push new events to the dashboard.

## EPIC 10 — SecOps Dashboard

### AS-029 — Dashboard shell
**Priority:** P0  
**Complexity:** M

Implement navigation and authenticated application shell.

### AS-030 — Security overview
**Priority:** P0  
**Complexity:** M

Display threat level, alerts, events, agent status, and HoneyToken triggers.

### AS-031 — Agents page
**Priority:** P0  
**Complexity:** M

Implement agent table and details.

### AS-032 — Alerts page
**Priority:** P0  
**Complexity:** M

Implement filtering and alert details.

### AS-033 — Events page
**Priority:** P0  
**Complexity:** M

Display security-event timeline/table.

### AS-034 — HoneyToken page
**Priority:** P0  
**Complexity:** M

Display token status and trigger history without exposing unnecessary token values.

### AS-035 — Firewall page
**Priority:** P1  
**Complexity:** M

Display firewall decisions and policy metrics.

## EPIC 11 — Kill-Switch

### AS-036 — Agent isolation API
**Priority:** P0  
**Complexity:** M

Set agent state to isolated and reject new controlled executions.

### AS-037 — Isolation dashboard action
**Priority:** P0  
**Complexity:** S

Add authorized isolation action with confirmation.

### AS-038 — Agent restoration
**Priority:** P1  
**Complexity:** S

Allow authorized restoration with audit logging.

## EPIC 12 — Audit Logging

### AS-039 — Audit event model
**Priority:** P1  
**Complexity:** S

Record administrative actions.

### AS-040 — Audit log API/UI
**Priority:** P1  
**Complexity:** M

Display authorized audit records.

## EPIC 13 — API

### AS-041 — API error contract
**Priority:** P0  
**Complexity:** S

Standardize errors without leaking internal information.

### AS-042 — API documentation
**Priority:** P0  
**Complexity:** S

Document endpoints and request/response schemas.

## EPIC 14 — Database

### AS-043 — PostgreSQL schema
**Priority:** P0  
**Complexity:** M

Implement required tables and indexes.

### AS-044 — Database migrations
**Priority:** P0  
**Complexity:** S

Add reproducible migrations.

## EPIC 15 — Testing

### AS-045 — Unit tests
**Priority:** P0  
**Complexity:** M

Test firewall, risk scoring, policies, HoneyTokens, and event creation.

### AS-046 — Integration tests
**Priority:** P0  
**Complexity:** L

Test end-to-end ingestion → detection → event → alert.

### AS-047 — Authorization tests
**Priority:** P1  
**Complexity:** M

Verify RBAC enforcement.

### AS-048 — Adversarial security tests
**Priority:** P0  
**Complexity:** L

Test known attack patterns and bypass attempts.

## EPIC 16 — Deployment

### AS-049 — Production configuration
**Priority:** P1  
**Complexity:** M

Create secure deployment configuration.

### AS-050 — Health checks
**Priority:** P0  
**Complexity:** S

Implement health/readiness checks.

### AS-051 — Logging and monitoring
**Priority:** P1  
**Complexity:** M

Implement structured operational logging.

## EPIC 17 — Documentation

### AS-052 — Developer integration guide
**Priority:** P1  
**Complexity:** M

Document how to connect an agent.

### AS-053 — Security limitations
**Priority:** P0  
**Complexity:** S

Document that AgentSentry is defense-in-depth and does not guarantee prevention of all prompt injection.

### AS-054 — Hackathon demo scenario
**Priority:** P0  
**Complexity:** M

Create a repeatable legitimate-data and malicious-data demonstration.

## MVP Execution Order

1. AS-001
2. AS-002
3. AS-005
4. AS-008
5. AS-009
6. AS-011
7. AS-012
8. AS-014
9. AS-015
10. AS-019
11. AS-020
12. AS-022
13. AS-023
14. AS-024
15. AS-026
16. AS-029
17. AS-030
18. AS-031
19. AS-032
20. AS-036
21. AS-037
22. AS-045
23. AS-046
24. AS-054

## MVP Definition of Done

A malicious instruction embedded in a supplied document can be:

1. Ingested.
2. Detected by AgentSentry.
3. Assigned a risk score.
4. Blocked or quarantined.
5. Recorded as a security event.
6. Displayed as a dashboard alert.
7. Demonstrated against a controlled HoneyToken.
8. Used to trigger a controlled agent-isolation action.

No production security claim should be made until the system has been adversarially evaluated.
