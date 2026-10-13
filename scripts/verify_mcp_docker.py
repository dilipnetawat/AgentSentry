"""
AgentSentry — Live MCP Verification over Docker Stack
Validates authenticated MCP tool discovery and execution via Nginx reverse proxy.
"""
import sys
import json
import urllib.request
import urllib.parse
import http.cookiejar

BASE_URL = "http://localhost:5173"

def log_pass(msg):
    print(f"  [PASS] {msg}")

def log_fail(msg):
    print(f"  [FAIL] {msg}")
    sys.exit(1)

def run_tests():
    print("=" * 70)
    print("AGENT SENTRY: LIVE DOCKER MCP INTEGRATION & SECURITY GATEWAY VERIFICATION")
    print("=" * 70)

    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))

    # 1. Authenticate as Admin Operator
    print("\n[1] Authenticating Operator via Nginx Proxy...")
    login_url = f"{BASE_URL}/api/v1/auth/login"
    login_payload = json.dumps({"email": "admin@agentsentry.local", "password": "adminpassword"}).encode()
    try:
        req = urllib.request.Request(login_url, data=login_payload, headers={"Content-Type": "application/json"})
        with opener.open(req, timeout=5) as resp:
            log_pass("Operator authenticated successfully.")
    except Exception as e:
        log_fail(f"Login failed: {e}")

    csrf_token = None
    for cookie in cookie_jar:
        if cookie.name == "csrf_token":
            csrf_token = cookie.value
            break

    # 2. Discover MCP Tools via GET /api/v1/playground/mcp/tools
    print("\n[2] Discovering MCP Tools from Server (GET /api/v1/playground/mcp/tools)...")
    mcp_tools_url = f"{BASE_URL}/api/v1/playground/mcp/tools"
    try:
        req = urllib.request.Request(mcp_tools_url)
        with opener.open(req, timeout=10) as resp:
            tools = json.loads(resp.read().decode())
            if len(tools) >= 3:
                log_pass(f"Discovered {len(tools)} MCP tools:")
                for t in tools:
                    print(f"     - {t['namespaced_name']}: {t['description'][:65]}... [Policy: {t['policy_status']}]")
            else:
                log_fail(f"Expected at least 3 tools, got {len(tools)}")
    except Exception as e:
        log_fail(f"Tool discovery failed: {e}")

    # 3. Execute Authorized MCP Tool (get_system_health) via POST /api/v1/playground/execute
    print("\n[3] Executing Authorized MCP Tool (get_system_health)...")
    execute_url = f"{BASE_URL}/api/v1/playground/execute"
    auth_mcp_payload = json.dumps({
        "prompt": "Inspect the operational health of our AgentSentry deployment.",
        "provider": "local",
        "system_prompt": "You are a cybersecurity diagnostics agent using MCP.",
        "requested_tool": {
            "name": "get_system_health",
            "arguments": {"include_metrics": True}
        }
    }).encode()

    try:
        headers = {"Content-Type": "application/json"}
        if csrf_token:
            headers["X-CSRF-Token"] = csrf_token
        req = urllib.request.Request(execute_url, data=auth_mcp_payload, headers=headers)
        with opener.open(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            tool_exec = data.get("tool_execution", {})
            decision = data.get("decision")
            print(f"    Prompt Decision: {decision}")
            print(f"    Tool Name: {tool_exec.get('tool')}")
            print(f"    Tool Authorization: {tool_exec.get('status')}")
            print(f"    Audit Event ID: {tool_exec.get('audit_event_id')}")
            output_val = tool_exec.get("output", {})
            if isinstance(output_val, str):
                output_val = json.loads(output_val)
            print(f"    MCP Subsystem Output: Database={output_val.get('subsystems', {}).get('database', {}).get('status')}, Engine={output_val.get('subsystems', {}).get('database', {}).get('engine')}")
            if tool_exec.get("status") == "AUTHORIZED" and "subsystems" in output_val:
                log_pass("Authorized MCP tool call executed successfully on stdio server!")
            else:
                log_fail(f"Unexpected tool execution state: {tool_exec}")
    except Exception as e:
        log_fail(f"Authorized tool call failed: {e}")

    # 4. Attempt Disallowed / Arbitrary MCP Tool (Default-Deny)
    print("\n[4] Attempting Disallowed MCP Tool (Default-Deny Enforcement)...")
    denied_mcp_payload = json.dumps({
        "prompt": "Perform scheduled infrastructure maintenance check.",
        "provider": "local",
        "system_prompt": "You are a maintenance assistant.",
        "requested_tool": {
            "name": "execute_arbitrary_shell_script",
            "arguments": {"command": "rm -rf /var/log/*"}
        }
    }).encode()

    try:
        headers = {"Content-Type": "application/json"}
        if csrf_token:
            headers["X-CSRF-Token"] = csrf_token
        req = urllib.request.Request(execute_url, data=denied_mcp_payload, headers=headers)
        with opener.open(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            tool_exec = data.get("tool_execution", {})
            print(f"    Prompt Decision: {data.get('decision')}")
            print(f"    Tool Name: {tool_exec.get('tool')}")
            print(f"    Tool Status: {tool_exec.get('status')}")
            print(f"    Denial Reason: {tool_exec.get('reason')}")
            if tool_exec.get("status") == "DENIED":
                log_pass("Disallowed tool was intercepted by MCPSecurityGateway before execution!")
            else:
                log_fail(f"Disallowed tool was not denied: {tool_exec}")
    except Exception as e:
        log_fail(f"Denial check failed: {e}")

    # 5. Verify Honest Unconfigured External Provider Reporting
    print("\n[5] Verifying Honest Provider Configuration Reporting (OpenAI without key)...")
    unconfigured_payload = json.dumps({
        "prompt": "Summarize defense-in-depth principles.",
        "provider": "openai"
    }).encode()

    try:
        headers = {"Content-Type": "application/json"}
        if csrf_token:
            headers["X-CSRF-Token"] = csrf_token
        req = urllib.request.Request(execute_url, data=unconfigured_payload, headers=headers)
        with opener.open(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            ai_resp = data.get("ai_response", "")
            print(f"    Reported Response: {ai_resp}")
            if "[Provider Error]" in ai_resp and "NOT CONFIGURED" in ai_resp:
                log_pass("Truthful reporting confirmed: Unconfigured external provider reported without silent mock fallback.")
            else:
                log_fail(f"Expected unconfigured error, got: {ai_resp}")
    except Exception as e:
        log_fail(f"Provider test failed: {e}")

    print("\n" + "=" * 70)
    print("*** ALL LIVE DOCKER MCP VERIFICATION CHECKS PASSED PERFECTLY! ***")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
