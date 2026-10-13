"""
AgentSentry — Model Context Protocol (MCP) Client
Manages stdio connection, handshake negotiation, dynamic tool discovery,
schema validation, per-call timeouts, and output size limitations.
"""
import sys
import json
import logging
import asyncio
from typing import Dict, Any, List, Optional
from backend.mcp.protocol import (
    JSONRPCRequest,
    MCPToolDefinition,
    MCPToolResult,
    MCPContentItem,
    PROTOCOL_VERSION
)

logger = logging.getLogger(__name__)

class MCPClientError(Exception):
    """Base exception for MCP client failures."""
    pass

class MCPConnectionError(MCPClientError):
    """Raised when MCP server cannot be spawned or connection fails."""
    pass

class MCPTimeoutError(MCPClientError):
    """Raised when an MCP operation exceeds its timeout threshold."""
    pass

class MCPSchemaValidationError(MCPClientError):
    """Raised when tool arguments fail input schema validation."""
    pass

class AgentSentryMCPClient:
    """
    Subprocess-based stdio MCP Client.
    Communicates with local or containerized MCP servers using standard JSON-RPC 2.0.
    """

    def __init__(
        self,
        server_command: Optional[List[str]] = None,
        server_name: str = "agentsentry-local",
        default_timeout: float = 5.0,
        max_output_bytes: int = 65536
    ):
        self.server_command = server_command or [sys.executable, "-m", "backend.mcp.server"]
        self.server_name = server_name
        self.default_timeout = default_timeout
        self.max_output_bytes = max_output_bytes
        self._process: Optional[asyncio.subprocess.Process] = None
        self._next_id: int = 1
        self._tools: Dict[str, MCPToolDefinition] = {}
        self._initialized: bool = False
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._lock: Optional[asyncio.Lock] = None

    @property
    def is_connected(self) -> bool:
        try:
            current_loop = asyncio.get_running_loop()
            if self._loop != current_loop:
                return False
        except RuntimeError:
            pass
        return self._process is not None and self._process.returncode is None

    async def connect(self):
        """Spawn the MCP server subprocess and perform protocol handshake."""
        current_loop = asyncio.get_running_loop()
        if self._loop != current_loop or self._lock is None:
            self._loop = current_loop
            self._lock = asyncio.Lock()
            self._process = None
            self._initialized = False

        async with self._lock:
            if self.is_connected and self._initialized:
                return

            try:
                logger.info(f"Connecting to MCP server '{self.server_name}' via stdio...")
                self._process = await asyncio.create_subprocess_exec(
                    *self.server_command,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
            except Exception as e:
                logger.error(f"Failed to spawn MCP server process: {e}")
                raise MCPConnectionError(f"Could not spawn MCP server '{self.server_name}': {e}")

            # 1. Send initialize request
            req_id = self._next_id
            self._next_id += 1
            init_request = {
                "jsonrpc": "2.0",
                "id": req_id,
                "method": "initialize",
                "params": {
                    "protocolVersion": PROTOCOL_VERSION,
                    "capabilities": {},
                    "clientInfo": {
                        "name": "AgentSentry-Backend",
                        "version": "0.1.0"
                    }
                }
            }

            resp_data = await self._send_request_raw(init_request, timeout=self.default_timeout)
            if "error" in resp_data:
                err = resp_data["error"]
                raise MCPConnectionError(f"MCP initialize rejected: {err.get('message', 'Unknown error')}")

            # 2. Send initialized notification (fire-and-forget)
            init_notification = {
                "jsonrpc": "2.0",
                "method": "notifications/initialized",
                "params": {}
            }
            await self._send_notification_raw(init_notification)

            self._initialized = True
            logger.info(f"MCP server '{self.server_name}' handshake complete.")

            # 3. Discover available tools
            await self._discover_tools()

    async def _send_request_raw(self, request_payload: Dict[str, Any], timeout: float) -> Dict[str, Any]:
        """Write JSON-RPC request to stdin and await corresponding response on stdout."""
        if not self._process or not self._process.stdin or not self._process.stdout:
            raise MCPConnectionError("MCP server process is not connected.")

        req_str = json.dumps(request_payload) + "\n"
        try:
            self._process.stdin.write(req_str.encode("utf-8"))
            await self._process.stdin.drain()

            # Read line with timeout
            async def _read():
                line = await self._process.stdout.readline()
                if not line:
                    raise MCPConnectionError("MCP server closed connection unexpectedly (EOF).")
                return json.loads(line.decode("utf-8"))

            return await asyncio.wait_for(_read(), timeout=timeout)
        except asyncio.TimeoutError:
            logger.warning(f"MCP request to '{self.server_name}' timed out after {timeout}s.")
            raise MCPTimeoutError(f"MCP operation timed out (> {timeout}s).")
        except Exception as e:
            logger.error(f"MCP communication failure: {e}")
            raise MCPConnectionError(f"MCP transport error: {e}")

    async def _send_notification_raw(self, notification_payload: Dict[str, Any]):
        """Send a JSON-RPC notification without expecting a response."""
        if not self._process or not self._process.stdin:
            return
        data = json.dumps(notification_payload) + "\n"
        self._process.stdin.write(data.encode("utf-8"))
        await self._process.stdin.drain()

    async def _discover_tools(self) -> List[MCPToolDefinition]:
        """Perform tools/list discovery from the connected server."""
        req_id = self._next_id
        self._next_id += 1
        req = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": "tools/list",
            "params": {}
        }
        resp = await self._send_request_raw(req, timeout=self.default_timeout)
        if "error" in resp:
            raise MCPClientError(f"tools/list failed: {resp['error']}")

        tools_data = resp.get("result", {}).get("tools", [])
        self._tools = {}
        parsed_tools = []
        for t in tools_data:
            tool_def = MCPToolDefinition(
                name=t["name"],
                description=t.get("description", ""),
                inputSchema=t.get("inputSchema", {"type": "object", "properties": {}, "required": []})
            )
            # Store by plain name and namespaced name
            self._tools[tool_def.name] = tool_def
            namespaced_name = f"{self.server_name}:{tool_def.name}"
            self._tools[namespaced_name] = tool_def
            parsed_tools.append(tool_def)

        logger.info(f"Discovered {len(parsed_tools)} MCP tools on server '{self.server_name}'.")
        return parsed_tools

    async def list_tools(self) -> List[MCPToolDefinition]:
        """Retrieve discovered tools, connecting first if necessary."""
        if not self.is_connected or not self._initialized:
            await self.connect()
        unique_tools = {}
        for tool in self._tools.values():
            unique_tools[tool.name] = tool
        return list(unique_tools.values())

    def validate_tool_arguments(self, tool_def: MCPToolDefinition, arguments: Dict[str, Any]):
        """Validate tool arguments against inputSchema."""
        schema = tool_def.inputSchema
        # Check required fields
        for req_field in schema.required:
            if req_field not in arguments:
                raise MCPSchemaValidationError(f"Missing required argument '{req_field}' for tool '{tool_def.name}'.")

        # Type checks for declared properties
        props = schema.properties
        for arg_key, arg_val in arguments.items():
            if arg_key in props:
                expected_type = props[arg_key].get("type")
                if expected_type == "integer" and not isinstance(arg_val, int):
                    raise MCPSchemaValidationError(f"Argument '{arg_key}' must be an integer, got {type(arg_val).__name__}.")
                elif expected_type == "string" and not isinstance(arg_val, str):
                    raise MCPSchemaValidationError(f"Argument '{arg_key}' must be a string, got {type(arg_val).__name__}.")
                elif expected_type == "boolean" and not isinstance(arg_val, bool):
                    raise MCPSchemaValidationError(f"Argument '{arg_key}' must be a boolean, got {type(arg_val).__name__}.")

    async def call_tool(
        self,
        tool_name: str,
        arguments: Optional[Dict[str, Any]] = None,
        timeout: Optional[float] = None
    ) -> MCPToolResult:
        """
        Execute a tool on the MCP server with validation, timeout, and size limits.
        """
        if not self.is_connected or not self._initialized:
            await self.connect()

        # Handle namespacing: strip prefix if provided
        actual_name = tool_name
        if ":" in tool_name:
            server_prefix, actual_name = tool_name.split(":", 1)

        if actual_name not in self._tools:
            raise MCPClientError(f"Tool '{tool_name}' not found on server '{self.server_name}'. Discovered: {list(self._tools.keys())}")

        tool_def = self._tools[actual_name]
        args = arguments or {}

        # Validate arguments against tool schema
        self.validate_tool_arguments(tool_def, args)

        req_id = self._next_id
        self._next_id += 1
        req = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": "tools/call",
            "params": {
                "name": actual_name,
                "arguments": args
            }
        }

        call_timeout = timeout or self.default_timeout
        resp = await self._send_request_raw(req, timeout=call_timeout)

        if "error" in resp:
            err = resp["error"]
            return MCPToolResult(
                content=[MCPContentItem(type="text", text=f"MCP Error: {err.get('message', 'Execution error')}")],
                isError=True,
                metadata={"error_code": err.get("code")}
            )

        res_data = resp.get("result", {})
        raw_content = res_data.get("content", [])
        is_error = res_data.get("isError", False)

        content_items = []
        total_bytes = 0
        for item in raw_content:
            text_val = item.get("text", "")
            total_bytes += len(text_val.encode("utf-8"))
            if total_bytes > self.max_output_bytes:
                text_val = text_val[:1000] + "\n[OUTPUT TRUNCATED: Exceeded maximum allowed size limit]"
                content_items.append(MCPContentItem(type="text", text=text_val))
                return MCPToolResult(
                    content=content_items,
                    isError=True,
                    metadata={"error": "Output size limit exceeded"}
                )
            content_items.append(MCPContentItem(type="text", text=text_val))

        return MCPToolResult(
            content=content_items,
            isError=is_error,
            metadata={"server": self.server_name, "tool": actual_name}
        )

    async def close(self):
        """Gracefully terminate the MCP server subprocess."""
        async with self._lock:
            if self._process:
                try:
                    if self._process.stdin:
                        self._process.stdin.close()
                    self._process.terminate()
                    await asyncio.wait_for(self._process.wait(), timeout=2.0)
                except Exception:
                    try:
                        self._process.kill()
                    except Exception:
                        pass
                self._process = None
                self._initialized = False
                logger.info(f"MCP server '{self.server_name}' connection closed.")
