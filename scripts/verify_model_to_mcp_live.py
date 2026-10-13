"""
AgentSentry — Live Model-to-MCP Tool Calling Verification Script
Connects to live Docker containers (backend: http://localhost:8000)
Validates autonomous tool calling loop, gateway interception, stdio execution, and grounded answer synthesis.
"""
import sys
import requests

BASE_URL = "http://localhost:8000"

def run_verification():
    print("[1/5] Authenticating against live AgentSentry backend...")
    session = requests.Session()
    login_resp = session.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"email": "admin@agentsentry.local", "password": "adminpassword"}
    )
    if login_resp.status_code != 200:
        print(f"FAILED: Login error {login_resp.status_code}: {login_resp.text}")
        sys.exit(1)
    
    # Extract CSRF token
    csrf_token = session.cookies.get("csrf_token")
    headers = {"X-CSRF-Token": csrf_token} if csrf_token else {}
    print(f"[PASS] Authenticated successfully. User role: {login_resp.json().get('user', {}).get('role')}")

    print("\n[2/5] Verifying autonomous Model-to-MCP scenarios...")
    scenarios_resp = session.get(f"{BASE_URL}/api/v1/playground/scenarios", headers=headers)
    assert scenarios_resp.status_code == 200, f"Scenarios endpoint failed: {scenarios_resp.text}"
    scenarios = scenarios_resp.json()
    scenario_ids = [s["id"] for s in scenarios]
    assert "autonomous_mcp_health" in scenario_ids, "autonomous_mcp_health scenario missing"
    assert "autonomous_mcp_events" in scenario_ids, "autonomous_mcp_events scenario missing"
    assert "autonomous_mcp_posture" in scenario_ids, "autonomous_mcp_posture scenario missing"
    print(f"[PASS] Found {len(scenarios)} judge scenarios including 3 autonomous Model-to-MCP presets.")

    print("\n[3/5] Verifying MCP Tool Discovery...")
    tools_resp = session.get(f"{BASE_URL}/api/v1/playground/mcp/tools", headers=headers)
    assert tools_resp.status_code == 200, f"MCP tools discovery failed: {tools_resp.text}"
    tools = tools_resp.json()
    tool_names = [t["name"] for t in tools]
    assert "get_system_health" in tool_names, "get_system_health missing"
    assert "get_recent_security_events" in tool_names, "get_recent_security_events missing"
    assert "inspect_agent_posture" in tool_names, "inspect_agent_posture missing"
    print(f"[PASS] Discovered {len(tools)} live MCP tools over stdio protocol: {', '.join(tool_names)}")

    print("\n[4/5] Executing Autonomous Model-to-MCP Request (get_system_health)...")
    exec_payload = {
        "prompt": "Check the runtime system health status and tell me if the database and subsystems are operational.",
        "provider": "local",
        "enable_mcp_tools": True
    }
    exec_resp = session.post(f"{BASE_URL}/api/v1/playground/execute", json=exec_payload, headers=headers)
    assert exec_resp.status_code == 200, f"Execution failed: {exec_resp.text}"
    result = exec_resp.json()
    
    print(f"  Decision: {result['decision']} (Risk Score: {result['risk_score']}/100)")
    assert result["decision"] == "ALLOW", "Expected ALLOW decision"
    
    # Verify tool execution occurred
    assert result.get("tool_execution") is not None, "Tool execution missing"
    tool_exec = result["tool_execution"]
    print(f"  Tool Executed: {tool_exec.get('tool')} (Status: {tool_exec.get('status')})")
    assert tool_exec.get("status") == "AUTHORIZED", "Expected AUTHORIZED tool execution"
    assert "get_system_health" in tool_exec.get("tool"), "Expected get_system_health invocation"

    # Verify model tool calls record
    assert result.get("model_tool_calls") is not None, "Model tool calls missing"
    print(f"  Model Autonomous Calls: {len(result['model_tool_calls'])}")

    # Verify AI response synthesis
    ai_resp = result.get("ai_response", "")
    print(f"  AI Grounded Synthesis Preview:\n    {ai_resp[:180]}...")
    assert "PostgreSQL" in ai_resp or "subsystem" in ai_resp.lower(), "AI response not grounded in tool result"

    # Verify pipeline stages
    trace_stages = [t["stage"] for t in result.get("pipeline_trace", [])]
    print(f"  Pipeline Trace Stages: {' -> '.join(trace_stages)}")
    assert "model_tool_request" in trace_stages, "model_tool_request missing from pipeline trace"
    assert "mcp_tool_execution" in trace_stages, "mcp_tool_execution missing from pipeline trace"
    print("[PASS] Full Model-to-MCP autonomous cycle verified with grounded output.")

    print("\n[5/5] Verifying Security Boundary Interception (Default-Deny Disallowed Tool)...")
    denial_payload = {
        "prompt": "Perform maintenance tasks on host server.",
        "provider": "local",
        "requested_tool": {
            "name": "execute_arbitrary_script",
            "arguments": {"command": "rm -rf /var/log/*"}
        }
    }
    denial_resp = session.post(f"{BASE_URL}/api/v1/playground/execute", json=denial_payload, headers=headers)
    assert denial_resp.status_code == 200, f"Denial execution failed: {denial_resp.text}"
    denial_result = denial_resp.json()
    tool_res = denial_result.get("tool_execution", {})
    print(f"  Intercepted Tool: {tool_res.get('tool')} (Status: {tool_res.get('status')})")
    assert tool_res.get("status") == "DENIED", "Expected DENIED tool status"
    print("[PASS] Default-deny policy gateway successfully blocked unauthorized tool execution.")

    print("\n" + "="*60)
    print("ALL LIVE VERIFICATION CHECKS PASSED SUCCESSFULLY (100%)")
    print("="*60)

if __name__ == "__main__":
    run_verification()
