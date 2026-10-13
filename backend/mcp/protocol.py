"""
AgentSentry — Model Context Protocol (MCP) Core Protocol Specification
Standard JSON-RPC 2.0 data models and constants according to MCP 2024-11-05 spec.
"""
from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, Field

# MCP Protocol Version
MCP_PROTOCOL_VERSION = "2024-11-05"
PROTOCOL_VERSION = MCP_PROTOCOL_VERSION

# JSON-RPC Error Codes
PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602
INTERNAL_ERROR = -32603
TOOL_EXECUTION_ERROR = -32000
SECURITY_DENIAL_ERROR = -32001

class JSONRPCError(BaseModel):
    code: int
    message: str
    data: Optional[Any] = None

class JSONRPCRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: Union[str, int]
    method: str
    params: Optional[Dict[str, Any]] = None

class JSONRPCResponse(BaseModel):
    jsonrpc: str = "2.0"
    id: Union[str, int, None]
    result: Optional[Any] = None
    error: Optional[JSONRPCError] = None

class JSONRPCNotification(BaseModel):
    jsonrpc: str = "2.0"
    method: str
    params: Optional[Dict[str, Any]] = None

# MCP Capabilities and Tool Schema
class ToolInputSchema(BaseModel):
    type: str = "object"
    properties: Dict[str, Any] = Field(default_factory=dict)
    required: List[str] = Field(default_factory=list)

class MCPToolDefinition(BaseModel):
    name: str
    description: str
    inputSchema: ToolInputSchema

class MCPContentItem(BaseModel):
    type: str = "text"
    text: str

class MCPToolResult(BaseModel):
    content: List[MCPContentItem]
    isError: bool = False
    metadata: Optional[Dict[str, Any]] = None
