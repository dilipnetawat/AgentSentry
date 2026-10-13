"""
AgentSentry — Model Context Protocol (MCP) Integration Package
"""
from backend.mcp.protocol import (
    JSONRPCRequest,
    JSONRPCResponse,
    JSONRPCError,
    MCPToolDefinition,
    MCPToolResult,
    MCPContentItem,
    PROTOCOL_VERSION
)
from backend.mcp.client import AgentSentryMCPClient, MCPClientError
from backend.mcp.security_gateway import MCPSecurityGateway, get_mcp_gateway

__all__ = [
    "JSONRPCRequest",
    "JSONRPCResponse",
    "JSONRPCError",
    "MCPToolDefinition",
    "MCPToolResult",
    "MCPContentItem",
    "PROTOCOL_VERSION",
    "AgentSentryMCPClient",
    "MCPClientError",
    "MCPSecurityGateway",
    "get_mcp_gateway"
]
