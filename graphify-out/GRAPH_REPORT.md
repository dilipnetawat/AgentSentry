# Graph Report - AgentSentry  (2026-10-11)

## Corpus Check
- 126 files · ~51,633 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 7, .db 2, .example 1)

## Summary
- 1116 nodes · 2641 edges · 60 communities (52 shown, 8 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 224 edges (avg confidence: 0.94)
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
- BaseAIProvider
- compilerOptions
- test_rule_detector.py
- Agent
- compilerOptions
- routers/ingestion.py
- LocalAIProvider
- execute_playground_request
- explain_security_event
- dev.mjs
- test_fix_pass.py
- User
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
- GeminiAIProvider
- 03 — Security & Access Document
- AIServiceManager
- OpenAIProvider
- test_agents.py
- IMPORTANT DEVELOPMENT RULES
- test_ai_and_features.py
- 05 — Feature Ticket List
- alerts.py
- seed.py
- EPIC 10 — SecOps Dashboard
- test_playground.py
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
- get_system_status
- entrypoint.sh

## God Nodes (most connected - your core abstractions)
1. `User` - 61 edges
2. `Agent` - 47 edges
3. `apiFetch()` - 38 edges
4. `SecurityEvent` - 35 edges
5. `LocalAIProvider` - 29 edges
6. `Alert` - 28 edges
7. `DetectionResult` - 28 edges
8. `react` - 28 edges
9. `BaseAIProvider` - 23 edges
10. `HoneyTokenService` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Database Architecture & Connection` --references--> `get_db()`  [INFERRED]
  AGY.md → backend/database.py
- `API Endpoint Registry` --references--> `get_current_user()`  [INFERRED]
  AGY.md → backend/api/deps.py
- `Backend Services & Modules` --references--> `AlertService`  [INFERRED]
  AGY.md → backend/services/alert_service.py
- `Backend Services & Modules` --references--> `HoneyTokenService`  [INFERRED]
  AGY.md → backend/services/honeytoken_service.py
- `State Management & Contexts` --references--> `useAuth()`  [INFERRED]
  AGY.md → frontend/src/contexts/AuthContext.tsx

## Import Cycles
- None detected.

## Communities (60 total, 8 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.05
Nodes (112): Entry Point, App(), AppShell(), AppShellProps, Badge(), BadgeProps, BadgeVariant, GridBackground() (+104 more)

### Community 1 - "DetectionResult"
Cohesion: 0.06
Nodes (31): Backend Services & Modules, 8. Risk/Policy Explanation, RiskAggregator, RuleBasedDetector, DetectorInterface, SemanticDetectorInterface, DetectionResult, FirewallDecision (+23 more)

### Community 2 - "HoneyTokenService"
Cohesion: 0.06
Nodes (24): ContextResponse, egress_enforcement_gateway(), EgressRequest, EgressResponse, get_agent_context(), create_honeytoken(), rotate_honeytoken(), _verify_agent_access() (+16 more)

### Community 3 - "conftest.py"
Cohesion: 0.10
Nodes (21): State Management & Contexts, _auth_cookie_flags(), create_access_token(), firebase_login(), FirebaseLoginRequest, login(), LoginRequest, logout() (+13 more)

### Community 4 - "frontend/package.json"
Cohesion: 0.06
Nodes (32): dependencies, framer-motion, lucide-react, react, react-dom, react-router-dom, @splinetool/runtime, devDependencies (+24 more)

### Community 5 - "deps.py"
Cohesion: 0.14
Nodes (7): Detailed Flow Steps, get_current_user(), verify_csrf_token(), get_db(), DashboardStats, SecurityEventResponse, seed_admin()

### Community 6 - "uuid"
Cohesion: 0.09
Nodes (15): run_migrations_offline(), upgrade(), upgrade(), upgrade(), upgrade(), upgrade(), upgrade(), downgrade() (+7 more)

### Community 7 - "BaseAIProvider"
Cohesion: 0.23
Nodes (6): AIAlertTriageResult, AIAnalysisResult, BaseAIProvider, get_ai_manager(), get_ai_service(), get_ai_status()

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 9 - "test_rule_detector.py"
Cohesion: 0.20
Nodes (15): detector(), test_10_false_positive_examples(), test_11_empty_input(), test_12_very_long_input(), test_13_multiple_attack_categories(), test_14_score_remains_0_100(), test_1_safe_legitimate_text(), test_2_ignore_previous_instructions() (+7 more)

### Community 10 - "Agent"
Cohesion: 0.10
Nodes (15): API Endpoint Registry, get_agent(), isolate_agent(), list_agents(), register_agent(), restore_agent(), verify_agent_ownership(), read_users_me() (+7 more)

### Community 11 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 12 - "routers/ingestion.py"
Cohesion: 0.13
Nodes (7): Models & Schema Specifications, ingest_content(), verify_agent_ownership(), AuditLog, IngestionRecord, IngestionRequest, IngestionResponse

### Community 14 - "execute_playground_request"
Cohesion: 0.16
Nodes (9): approve_quarantined_event(), execute_playground_request(), test_provider_connectivity(), PipelineStageTrace, PlaygroundExecuteRequest, PlaygroundExecuteResponse, ProviderTestRequest, ScenarioPreset (+1 more)

### Community 15 - "explain_security_event"
Cohesion: 0.25
Nodes (3): EventExplanationResponse, explain_security_event(), list_security_events()

### Community 16 - "dev.mjs"
Cohesion: 0.15
Nodes (4): killProcessTree(), python, root, shutdown()

### Community 17 - "test_fix_pass.py"
Cohesion: 0.11
Nodes (19): main(), hash_password(), seed_user(), test_e2e_edge_cases(), test_e2e_security_lifecycle(), test_admin_login(), test_agents_pagination(), test_analyst_login() (+11 more)

### Community 18 - "User"
Cohesion: 0.11
Nodes (9): get_admin_user(), get_analyst_user(), require_role(), verify_agent_ownership(), get_dashboard_stats(), get_playground_scenarios(), list_providers(), User (+1 more)

### Community 19 - "AgentSentry — AI Agent Architecture & Context Guide (`AGY.md`)"
Cohesion: 0.07
Nodes (29): 10. Coding Conventions, 11. Notes for AI Agents, 1. Installation, 1. Overview, 2. Environment Configuration, 2. Tech Stack, 3. Architecture, 3. Database Initialization & Seeding (+21 more)

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

### Community 38 - "alerts.py"
Cohesion: 0.21
Nodes (5): list_alerts(), triage_alert(), update_alert_status(), AlertResponse, AlertStatusUpdate

### Community 40 - "seed.py"
Cohesion: 0.22
Nodes (3): do_run_migrations(), run_async_migrations(), run_migrations_online()

### Community 41 - "EPIC 10 — SecOps Dashboard"
Cohesion: 0.25
Nodes (8): AS-029 — Dashboard shell, AS-030 — Security overview, AS-031 — Agents page, AS-032 — Alerts page, AS-033 — Events page, AS-034 — HoneyToken page, AS-035 — Firewall page, EPIC 10 — SecOps Dashboard

### Community 42 - "test_playground.py"
Cohesion: 0.50
Nodes (6): test_execute_benign_prompt(), test_execute_direct_prompt_injection_blocked(), test_get_scenarios(), test_list_and_test_providers(), test_quarantine_and_approval(), test_tool_boundary_authorization()

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
- **302 isolated node(s):** `entrypoint.sh script`, `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components` (+297 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 475 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `State Management & Contexts` connect `conftest.py` to `api.ts`, `AgentSentry — AI Agent Architecture & Context Guide (`AGY.md`)`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **Are the 40 inferred relationships involving `User` (e.g. with `get_admin_user()` and `get_analyst_user()`) actually correct?**
  _`User` has 40 INFERRED edges - model-reasoned connections that need verification._
- **What connects `entrypoint.sh script`, `$schema`, `plugins` to the rest of the system?**
  _302 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.051864801864801864 - nodes in this community are weakly interconnected._
- **Why does `useAuth()` connect `api.ts` to `conftest.py`?**
  _High betweenness centrality (0.161) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `Agent` (e.g. with `egress_enforcement_gateway()` and `get_agent_context()`) actually correct?**
  _`Agent` has 28 INFERRED edges - model-reasoned connections that need verification._
- **Should `DetectionResult` be split into smaller, more focused modules?**
  _Cohesion score 0.05871725383920506 - nodes in this community are weakly interconnected._