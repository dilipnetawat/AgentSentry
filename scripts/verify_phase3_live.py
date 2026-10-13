"""
AgentSentry — Phase 3 Live End-to-End Verification Script
Verifies live HTTP endpoints against http://localhost:8000:
1. Healthcheck (/health)
2. Authentication (/api/v1/auth/login)
3. Provider status reporting (/api/v1/playground/providers)
4. Tool discovery including GitHub MCP tools (/api/v1/playground/mcp/tools)
5. Scenario presets including GitHub issues preset (/api/v1/playground/scenarios)
6. Autonomous GitHub MCP execution & truthful unconfigured reporting (/api/v1/playground/execute)
"""
import sys
import httpx

BASE_URL = "http://localhost:8000"

def main():
    print("=== AgentSentry Phase 3 Live End-to-End Verification ===")
    with httpx.Client(base_url=BASE_URL, timeout=15.0) as client:
        # 1. Healthcheck
        h = client.get("/health")
        assert h.status_code == 200, f"Health check failed: {h.status_code}"
        print(f"[OK] 1. Backend Health: {h.json()}")

        # 2. Login
        login_res = client.post("/api/v1/auth/login", json={"email": "admin@agentsentry.local", "password": "adminpassword"})
        assert login_res.status_code == 200, f"Login failed: {login_res.status_code} {login_res.text}"
        csrf_token = login_res.cookies.get("csrf_token", "")
        headers = {"X-CSRF-Token": csrf_token} if csrf_token else {}
        print(f"[OK] 2. Admin Authentication & Session established (CSRF: {bool(csrf_token)})")

        # 3. Provider status
        prov_res = client.get("/api/v1/playground/providers", headers=headers)
        assert prov_res.status_code == 200, f"Provider catalog failed: {prov_res.status_code}"
        providers = prov_res.json()
        print(f"[OK] 3. Provider Statuses:")
        for p in providers:
            print(f"     - {p['id']}: status={p['status']}, is_configured={p['is_configured']}, model={p['model']}")

        # 4. MCP Tools Discovery
        tools_res = client.get("/api/v1/playground/mcp/tools", headers=headers)
        assert tools_res.status_code == 200, f"Tools discovery failed: {tools_res.status_code}"
        tools = tools_res.json()
        tool_names = [t["name"] for t in tools]
        print(f"[OK] 4. Discovered {len(tools)} MCP tools:")
        for tn in tool_names:
            print(f"     - {tn}")
        assert "get_system_health" in tool_names
        assert "github_read_issues" in tool_names
        assert "github_list_repositories" in tool_names

        # 5. Scenarios
        scenarios_res = client.get("/api/v1/playground/scenarios", headers=headers)
        assert scenarios_res.status_code == 200, f"Scenarios failed: {scenarios_res.status_code}"
        scenarios = scenarios_res.json()
        scenario_ids = [s["id"] for s in scenarios]
        print(f"[OK] 5. Verified {len(scenarios)} Scenario Presets (includes 'github_mcp_issues': {'github_mcp_issues' in scenario_ids})")

        # 6. Execute GitHub MCP tool through playground
        payload = {
            "prompt": "Read the latest issues from our allowlisted GitHub repository.",
            "provider": "local",
            "requested_tool": {
                "name": "github_read_issues",
                "arguments": {"repository": "dilipnetawat/AgentSentry", "state": "open", "limit": 5}
            }
        }
        exec_res = client.post("/api/v1/playground/execute", json=payload, headers=headers)
        assert exec_res.status_code == 200, f"Execution failed: {exec_res.status_code} {exec_res.text}"
        data = exec_res.json()
        assert data["decision"] == "ALLOW"
        assert data["tool_execution"] is not None
        assert data["tool_execution"]["status"] == "AUTHORIZED"
        tool_out = data["tool_execution"]["output"]
        assert tool_out["status"] == "NOT CONFIGURED"
        print(f"[OK] 6. Live GitHub MCP Execution Output:")
        print(f"     - Tool: {data['tool_execution']['tool']}")
        print(f"     - Status: {data['tool_execution']['status']}")
        print(f"     - Truthful Payload: {tool_out['status']} ({tool_out['message'][:65]}...)")
        print(f"     - Grounded AI Response:\n       {data['ai_response'][:180]}...")

    print("\nALL LIVE PHASE 3 CHECKS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
