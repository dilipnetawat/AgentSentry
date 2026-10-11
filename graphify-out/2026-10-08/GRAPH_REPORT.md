# Graph Report - AgentSentry  (2026-10-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 641 nodes · 1646 edges · 27 communities (23 shown, 4 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 116 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ac7a0ba1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- DetectionResult
- uuid
- conftest.py
- frontend/package.json
- User
- sqlalchemy
- agents.py
- compilerOptions
- test_rule_detector.py
- SemanticSimilarityDetector
- compilerOptions
- routers/ingestion.py
- egress_enforcement_gateway
- create_honeytoken
- Agent
- dev.mjs
- test_agents.py
- pydantic
- test_ingestion.py
- add_security_headers
- scripts
- .oxlintrc.json
- reset_demo
- vercel.json
- health_check
- tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `User` - 45 edges
2. `Agent` - 31 edges
3. `DetectionResult` - 28 edges
4. `apiFetch()` - 27 edges
5. `react` - 25 edges
6. `HoneyTokenService` - 21 edges
7. `Dashboard()` - 21 edges
8. `SecurityEvent` - 20 edges
9. `GuidedDemo()` - 19 edges
10. `compilerOptions` - 18 edges

## Surprising Connections (you probably didn't know these)
- `detector()` --uses--> `RuleBasedDetector`  [INFERRED]
  backend/tests/test_rule_detector.py → backend/services/firewall/detectors.py
- `SemanticSimilarityDetector` --uses--> `DetectionResult`  [INFERRED]
  backend/services/firewall/semantic_detector.py → backend/services/firewall/models.py
- `egress_enforcement_gateway()` --uses--> `Agent`  [INFERRED]
  backend/api/routers/agent_runtime.py → backend/models/agent.py
- `get_agent_context()` --uses--> `Agent`  [INFERRED]
  backend/api/routers/agent_runtime.py → backend/models/agent.py
- `verify_agent_ownership()` --uses--> `Agent`  [INFERRED]
  backend/api/routers/agent_runtime.py → backend/models/agent.py

## Import Cycles
- None detected.

## Communities (27 total, 4 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.06
Nodes (92): App(), AppShell(), AppShellProps, Badge(), BadgeProps, BadgeVariant, GridBackground(), architectureStages (+84 more)

### Community 1 - "DetectionResult"
Cohesion: 0.05
Nodes (28): upgrade(), upgrade(), upgrade(), upgrade(), upgrade(), upgrade(), RiskAggregator, RuleBasedDetector (+20 more)

### Community 2 - "uuid"
Cohesion: 0.06
Nodes (23): do_run_migrations(), run_async_migrations(), run_migrations_online(), main(), Alert, SecurityEvent, AlertService, HoneyTokenService (+15 more)

### Community 3 - "conftest.py"
Cohesion: 0.08
Nodes (27): _auth_cookie_flags(), create_access_token(), login(), LoginRequest, logout(), UserResponse, hash_password(), seed_admin() (+19 more)

### Community 4 - "frontend/package.json"
Cohesion: 0.06
Nodes (33): dependencies, framer-motion, lucide-react, react, react-dom, react-router-dom, @splinetool/runtime, devDependencies (+25 more)

### Community 5 - "User"
Cohesion: 0.17
Nodes (7): get_admin_user(), get_analyst_user(), get_current_user(), verify_csrf_token(), read_users_me(), get_db(), User

### Community 6 - "sqlalchemy"
Cohesion: 0.19
Nodes (6): run_migrations_offline(), downgrade(), upgrade(), AuditLog, HoneyToken, IngestionRecord

### Community 7 - "agents.py"
Cohesion: 0.18
Nodes (9): get_agent(), isolate_agent(), list_agents(), register_agent(), restore_agent(), verify_agent_ownership(), AgentBase, AgentCreate (+1 more)

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 9 - "test_rule_detector.py"
Cohesion: 0.20
Nodes (15): detector(), test_10_false_positive_examples(), test_11_empty_input(), test_12_very_long_input(), test_13_multiple_attack_categories(), test_14_score_remains_0_100(), test_1_safe_legitimate_text(), test_2_ignore_previous_instructions() (+7 more)

### Community 10 - "SemanticSimilarityDetector"
Cohesion: 0.18
Nodes (7): SemanticSimilarityDetector, detector(), test_semantic_calibration(), test_semantic_detector_data_exfiltration(), test_semantic_detector_initialization(), test_semantic_detector_instruction_override(), test_semantic_detector_safe_content()

### Community 11 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 12 - "routers/ingestion.py"
Cohesion: 0.17
Nodes (5): require_role(), ingest_content(), verify_agent_ownership(), IngestionRequest, IngestionResponse

### Community 13 - "egress_enforcement_gateway"
Cohesion: 0.17
Nodes (6): ContextResponse, egress_enforcement_gateway(), EgressRequest, EgressResponse, get_agent_context(), verify_agent_ownership()

### Community 14 - "create_honeytoken"
Cohesion: 0.19
Nodes (6): create_honeytoken(), list_honeytokens(), rotate_honeytoken(), HoneyTokenBase, HoneyTokenRequest, HoneyTokenResponse

### Community 15 - "Agent"
Cohesion: 0.19
Nodes (4): list_alerts(), list_security_events(), Agent, SecurityEventResponse

### Community 17 - "test_agents.py"
Cohesion: 0.41
Nodes (9): test_agent_isolation_and_restore(), test_agent_not_found(), test_agent_registration(), test_invalid_agent_data(), test_isolate_already_isolated_agent(), test_isolate_invalid_uuid(), test_isolate_nonexistent_agent(), test_isolation_does_not_affect_unrelated_agents() (+1 more)

### Community 18 - "pydantic"
Cohesion: 0.20
Nodes (3): get_dashboard_stats(), AlertResponse, DashboardStats

### Community 19 - "test_ingestion.py"
Cohesion: 0.54
Nodes (5): test_ingest_content_invalid_agent(), test_ingest_content_isolated_agent(), test_ingest_content_oversized(), test_ingest_content_success(), test_ingest_content_validation()

### Community 20 - "add_security_headers"
Cohesion: 0.33
Nodes (3): add_security_headers(), global_exception_handler(), limit_request_size()

### Community 21 - "scripts"
Cohesion: 0.29
Nodes (6): name, private, scripts, dev, dev:backend, dev:frontend

### Community 22 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 24 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, outputDirectory, rewrites

## Knowledge Gaps
- **97 isolated node(s):** `AppShellProps`, `BadgeProps`, `PipelineStep`, `Scenario`, `StepState` (+92 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 217 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User` to `conftest.py`, `sqlalchemy`, `agents.py`, `routers/ingestion.py`, `egress_enforcement_gateway`, `create_honeytoken`, `Agent`, `pydantic`, `reset_demo`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Are the 28 inferred relationships involving `User` (e.g. with `get_admin_user()` and `get_analyst_user()`) actually correct?**
  _`User` has 28 INFERRED edges - model-reasoned connections that need verification._
- **What connects `AppShellProps`, `BadgeProps`, `PipelineStep` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05785123966942149 - nodes in this community are weakly interconnected._
- **Why does `Agent` connect `Agent` to `uuid`, `conftest.py`, `User`, `sqlalchemy`, `agents.py`, `routers/ingestion.py`, `egress_enforcement_gateway`, `pydantic`, `reset_demo`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 18 inferred relationships involving `Agent` (e.g. with `egress_enforcement_gateway()` and `get_agent_context()`) actually correct?**
  _`Agent` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Should `DetectionResult` be split into smaller, more focused modules?**
  _Cohesion score 0.05420054200542006 - nodes in this community are weakly interconnected._