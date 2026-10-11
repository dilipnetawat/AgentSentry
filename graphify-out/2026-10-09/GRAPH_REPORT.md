# Graph Report - AgentSentry  (2026-10-09)

## Corpus Check
- 118 files · ~42,199 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 5, .db 2, .example 1)

## Summary
- 1024 nodes · 2325 edges · 65 communities (51 shown, 14 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 188 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ac7a0ba1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- DetectionResult
- HoneyTokenService
- conftest.py
- frontend/package.json
- deps.py
- uuid
- LocalAIProvider
- compilerOptions
- test_rule_detector.py
- User
- compilerOptions
- routers/ingestion.py
- egress_enforcement_gateway
- honeytokens.py
- explain_security_event
- dev.mjs
- test_fix_pass.py
- SecurityEvent
- AgentSentry — AI Agent Architecture & Context Guide (`AGY.md`)
- add_security_headers
- scripts
- .oxlintrc.json
- 02 — Technical Architecture Document
- vercel.json
- AgentSentry
- tsconfig.json
- 04 — Frontend Specification Document
- AgentSentry Hackathon Demo Scenario
- 01 — Product Requirements Document
- 514a51b333c1_init_firewall_and_securityevents.py
- 03 — Security & Access Document
- typing
- GeminiAIProvider
- test_agents.py
- IMPORTANT DEVELOPMENT RULES
- test_ai_and_features.py
- 05 — Feature Ticket List
- triage_alert
- AIServiceManager
- env.py
- EPIC 10 — SecOps Dashboard
- EPIC 5 — Semantic Firewall
- EPIC 7 — HoneyToken Mesh
- EPIC 15 — Testing
- EPIC 3 — Agent Management
- EPIC 4 — Data Ingestion
- EPIC 6 — Prompt Injection Detection
- EPIC 8 — Security Event Engine
- EPIC 9 — Alert System
- EPIC 11 — Kill-Switch
- EPIC 16 — Deployment
- EPIC 17 — Documentation
- React + TypeScript + Vite
- EPIC 2 — Authentication & Access
- EPIC 13 — API
- EPIC 14 — Database
- 5374b539797d_init_agent_model.py
- 91791f42b1f4_phase3_honeytoken_mesh.py
- c33277276d7b_init_honeytoken_model.py
- c8eea161c9b7_init_ingestion_model.py
- de163b74e023_add_alert_model.py

## God Nodes (most connected - your core abstractions)
1. `User` - 50 edges
2. `Agent` - 37 edges
3. `apiFetch()` - 33 edges
4. `DetectionResult` - 28 edges
5. `react` - 27 edges
6. `SecurityEvent` - 26 edges
7. `LocalAIProvider` - 25 edges
8. `HoneyTokenService` - 22 edges
9. `Dashboard()` - 22 edges
10. `Alert` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Database Architecture & Connection` --references--> `get_db()`  [INFERRED]
  AGY.md → backend/database.py
- `API Endpoint Registry` --references--> `get_current_user()`  [INFERRED]
  AGY.md → backend/api/deps.py
- `Detailed Flow Steps` --references--> `get_current_user()`  [INFERRED]
  AGY.md → backend/api/deps.py
- `Backend Services & Modules` --references--> `AlertService`  [INFERRED]
  AGY.md → backend/services/alert_service.py
- `Backend Services & Modules` --references--> `HoneyTokenService`  [INFERRED]
  AGY.md → backend/services/honeytoken_service.py

## Import Cycles
- None detected.

## Communities (65 total, 14 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.06
Nodes (101): Entry Point, App(), AppShell(), AppShellProps, Badge(), BadgeProps, BadgeVariant, GridBackground() (+93 more)

### Community 1 - "DetectionResult"
Cohesion: 0.05
Nodes (32): Backend Services & Modules, get_system_status(), 7. Detection Explanation, RiskAggregator, RuleBasedDetector, DetectorInterface, SemanticDetectorInterface, DetectionResult (+24 more)

### Community 2 - "HoneyTokenService"
Cohesion: 0.13
Nodes (13): HoneyTokenService, test_alert_generation_from_firewall(), test_alert_generation_from_honeytoken(), test_dashboard_stats_empty(), test_dashboard_stats_honeytoken(), test_dashboard_stats_populated(), test_list_alerts(), test_list_security_events() (+5 more)

### Community 3 - "conftest.py"
Cohesion: 0.10
Nodes (21): State Management & Contexts, _auth_cookie_flags(), create_access_token(), firebase_login(), FirebaseLoginRequest, login(), LoginRequest, logout() (+13 more)

### Community 4 - "frontend/package.json"
Cohesion: 0.06
Nodes (33): dependencies, framer-motion, lucide-react, react, react-dom, react-router-dom, @splinetool/runtime, devDependencies (+25 more)

### Community 5 - "deps.py"
Cohesion: 0.17
Nodes (5): get_current_user(), require_role(), get_db(), DashboardStats, seed_admin()

### Community 6 - "uuid"
Cohesion: 0.19
Nodes (5): downgrade(), upgrade(), HoneyToken, SecurityEventResponse, test_honeytoken_mesh_lifecycle()

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 9 - "test_rule_detector.py"
Cohesion: 0.20
Nodes (15): detector(), test_10_false_positive_examples(), test_11_empty_input(), test_12_very_long_input(), test_13_multiple_attack_categories(), test_14_score_remains_0_100(), test_1_safe_legitimate_text(), test_2_ignore_previous_instructions() (+7 more)

### Community 10 - "User"
Cohesion: 0.13
Nodes (16): API Endpoint Registry, get_admin_user(), get_analyst_user(), get_agent(), isolate_agent(), list_agents(), register_agent(), restore_agent() (+8 more)

### Community 11 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 12 - "routers/ingestion.py"
Cohesion: 0.23
Nodes (4): ingest_content(), verify_agent_ownership(), IngestionRequest, IngestionResponse

### Community 13 - "egress_enforcement_gateway"
Cohesion: 0.17
Nodes (6): ContextResponse, egress_enforcement_gateway(), EgressRequest, EgressResponse, get_agent_context(), verify_agent_ownership()

### Community 14 - "honeytokens.py"
Cohesion: 0.22
Nodes (6): create_honeytoken(), list_honeytokens(), rotate_honeytoken(), HoneyTokenBase, HoneyTokenRequest, HoneyTokenResponse

### Community 15 - "explain_security_event"
Cohesion: 0.25
Nodes (3): EventExplanationResponse, explain_security_event(), list_security_events()

### Community 17 - "test_fix_pass.py"
Cohesion: 0.12
Nodes (18): main(), hash_password(), seed_user(), test_e2e_edge_cases(), test_e2e_security_lifecycle(), test_admin_login(), test_agents_pagination(), test_analyst_login() (+10 more)

### Community 18 - "SecurityEvent"
Cohesion: 0.17
Nodes (6): get_dashboard_stats(), reset_demo(), Alert, SecurityEvent, AlertService, test_alert_patch_and_triage()

### Community 19 - "AgentSentry — AI Agent Architecture & Context Guide (`AGY.md`)"
Cohesion: 0.06
Nodes (31): 10. Coding Conventions, 11. Notes for AI Agents, 1. Installation, 1. Overview, 2. Environment Configuration, 2. Tech Stack, 3. Architecture, 3. Database Initialization & Seeding (+23 more)

### Community 20 - "add_security_headers"
Cohesion: 0.33
Nodes (3): add_security_headers(), global_exception_handler(), limit_request_size()

### Community 21 - "scripts"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, db:migrate, db:seed, dev, dev:backend (+3 more)

### Community 22 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 23 - "02 — Technical Architecture Document"
Cohesion: 0.07
Nodes (29): 02 — Technical Architecture Document, 10. Failure Handling, 11. Architecture Risks, 12. Assumptions, 1. Architecture Overview, 2. High-Level Architecture, 3. Main Components, 4. Detection Pipeline (+21 more)

### Community 24 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, outputDirectory, rewrites

### Community 25 - "AgentSentry"
Cohesion: 0.08
Nodes (25): 1. Installation, 2. Configuration, 3. Database Initialization & Seeding, 4. Running the Development Server, AgentSentry, Alerts & Security Events, API Reference, Authentication & User Management (+17 more)

### Community 27 - "04 — Frontend Specification Document"
Cohesion: 0.09
Nodes (22): 04 — Frontend Specification Document, 10. HoneyTokens, 11. Policies, 12. Kill-Switch UI, 13. Design System, 14. Accessibility, 15. Frontend Security, 16. Suggested Folder Structure (+14 more)

### Community 28 - "AgentSentry Hackathon Demo Scenario"
Cohesion: 0.10
Nodes (20): 10. Isolation/Kill-Switch Explanation, 11. Optional HoneyToken Scenario, 12. Troubleshooting, 13. 2-Minute Presentation Script, 14. 5-Minute Presentation Script, 1. Demo Objective, 2. Problem Being Demonstrated, 3. Prerequisites (+12 more)

### Community 29 - "01 — Product Requirements Document"
Cohesion: 0.10
Nodes (19): 01 — Product Requirements Document, 10. Success Metrics, 11. Acceptance Criteria, 12. Product Risks, 13. Assumptions, 14. Open Questions, 15. Next Steps, 1. Document Overview (+11 more)

### Community 31 - "03 — Security & Access Document"
Cohesion: 0.11
Nodes (17): 03 — Security & Access Document, 10. Data Protection, 11. Kill-Switch, 12. Security Event Severity, 13. Security Testing, 14. Important Limitation, 15. Assumptions, 16. Next Steps (+9 more)

### Community 32 - "typing"
Cohesion: 0.37
Nodes (4): AIAlertTriageResult, AIAnalysisResult, BaseAIProvider, get_ai_service()

### Community 34 - "test_agents.py"
Cohesion: 0.41
Nodes (9): test_agent_isolation_and_restore(), test_agent_not_found(), test_agent_registration(), test_invalid_agent_data(), test_isolate_already_isolated_agent(), test_isolate_invalid_uuid(), test_isolate_nonexistent_agent(), test_isolation_does_not_affect_unrelated_agents() (+1 more)

### Community 35 - "IMPORTANT DEVELOPMENT RULES"
Cohesion: 0.17
Nodes (11): 10. FINAL PRINCIPLE, 1. REAL FUNCTIONALITY ONLY, 2. USER-FRIENDLY UI, 3. SPLINE / 3D UI, 4. PERFORMANCE, 5. TOKEN / OUTPUT EFFICIENCY, 6. NO UNNECESSARY WORK, 7. VERIFY BEFORE CLAIMING (+3 more)

### Community 36 - "test_ai_and_features.py"
Cohesion: 0.33
Nodes (9): test_ai_service_manager(), test_auth_registration(), test_event_explain_endpoint(), test_firebase_login_unconfigured(), test_grok_and_gemini_fallback(), test_local_ai_provider_alert_triage(), test_local_ai_provider_event_explanation(), test_local_ai_provider_threat_analysis() (+1 more)

### Community 37 - "05 — Feature Ticket List"
Cohesion: 0.20
Nodes (9): 05 — Feature Ticket List, AS-001 — Initialize repository, AS-002 — Docker development environment, AS-039 — Audit event model, AS-040 — Audit log API/UI, EPIC 12 — Audit Logging, EPIC 1 — Project Setup, MVP Definition of Done (+1 more)

### Community 38 - "triage_alert"
Cohesion: 0.16
Nodes (5): list_alerts(), triage_alert(), update_alert_status(), AlertResponse, AlertStatusUpdate

### Community 40 - "env.py"
Cohesion: 0.13
Nodes (7): Models & Schema Specifications, do_run_migrations(), run_async_migrations(), run_migrations_offline(), run_migrations_online(), AuditLog, IngestionRecord

### Community 41 - "EPIC 10 — SecOps Dashboard"
Cohesion: 0.25
Nodes (8): AS-029 — Dashboard shell, AS-030 — Security overview, AS-031 — Agents page, AS-032 — Alerts page, AS-033 — Events page, AS-034 — HoneyToken page, AS-035 — Firewall page, EPIC 10 — SecOps Dashboard

### Community 43 - "EPIC 5 — Semantic Firewall"
Cohesion: 0.33
Nodes (6): AS-011 — Firewall middleware, AS-012 — Rule-based detector, AS-013 — Semantic detector interface, AS-014 — Risk scoring, AS-015 — Policy decision engine, EPIC 5 — Semantic Firewall

### Community 44 - "EPIC 7 — HoneyToken Mesh"
Cohesion: 0.40
Nodes (5): AS-019 — HoneyToken model, AS-020 — HoneyToken generation, AS-021 — HoneyToken placement, AS-022 — HoneyToken trigger detection, EPIC 7 — HoneyToken Mesh

### Community 45 - "EPIC 15 — Testing"
Cohesion: 0.40
Nodes (5): AS-045 — Unit tests, AS-046 — Integration tests, AS-047 — Authorization tests, AS-048 — Adversarial security tests, EPIC 15 — Testing

### Community 46 - "EPIC 3 — Agent Management"
Cohesion: 0.50
Nodes (4): AS-005 — Create agent model, AS-006 — Agent registration API, AS-007 — Agent status management, EPIC 3 — Agent Management

### Community 47 - "EPIC 4 — Data Ingestion"
Cohesion: 0.50
Nodes (4): AS-008 — Implement ingestion endpoint, AS-009 — Input validation, AS-010 — Source provenance, EPIC 4 — Data Ingestion

### Community 48 - "EPIC 6 — Prompt Injection Detection"
Cohesion: 0.50
Nodes (4): AS-016 — Attack test corpus, AS-017 — Obfuscation test cases, AS-018 — Detector evaluation, EPIC 6 — Prompt Injection Detection

### Community 49 - "EPIC 8 — Security Event Engine"
Cohesion: 0.50
Nodes (4): AS-023 — Security event schema, AS-024 — Event persistence, AS-025 — Severity classification, EPIC 8 — Security Event Engine

### Community 50 - "EPIC 9 — Alert System"
Cohesion: 0.50
Nodes (4): AS-026 — Alert generation, AS-027 — Alert acknowledgement, AS-028 — Real-time event delivery, EPIC 9 — Alert System

### Community 51 - "EPIC 11 — Kill-Switch"
Cohesion: 0.50
Nodes (4): AS-036 — Agent isolation API, AS-037 — Isolation dashboard action, AS-038 — Agent restoration, EPIC 11 — Kill-Switch

### Community 52 - "EPIC 16 — Deployment"
Cohesion: 0.50
Nodes (4): AS-049 — Production configuration, AS-050 — Health checks, AS-051 — Logging and monitoring, EPIC 16 — Deployment

### Community 53 - "EPIC 17 — Documentation"
Cohesion: 0.50
Nodes (4): AS-052 — Developer integration guide, AS-053 — Security limitations, AS-054 — Hackathon demo scenario, EPIC 17 — Documentation

### Community 54 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 55 - "EPIC 2 — Authentication & Access"
Cohesion: 0.67
Nodes (3): AS-003 — Implement authentication, AS-004 — Implement RBAC, EPIC 2 — Authentication & Access

### Community 56 - "EPIC 13 — API"
Cohesion: 0.67
Nodes (3): AS-041 — API error contract, AS-042 — API documentation, EPIC 13 — API

### Community 57 - "EPIC 14 — Database"
Cohesion: 0.67
Nodes (3): AS-043 — PostgreSQL schema, AS-044 — Database migrations, EPIC 14 — Database

## Knowledge Gaps
- **300 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+295 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 453 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `State Management & Contexts` connect `conftest.py` to `api.ts`, `AgentSentry — AI Agent Architecture & Context Guide (`AGY.md`)`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Are the 33 inferred relationships involving `User` (e.g. with `get_admin_user()` and `get_analyst_user()`) actually correct?**
  _`User` has 33 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _300 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05563266250289151 - nodes in this community are weakly interconnected._
- **Why does `useAuth()` connect `api.ts` to `conftest.py`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `Agent` (e.g. with `egress_enforcement_gateway()` and `get_agent_context()`) actually correct?**
  _`Agent` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Should `DetectionResult` be split into smaller, more focused modules?**
  _Cohesion score 0.053194333066025126 - nodes in this community are weakly interconnected._