import re
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass
class RuleMatch:
    rule_id: str
    category: str
    severity: str
    name: str
    description: str
    base_score: int
    matched_excerpt: str
    pattern_matched: str
    mitigation: str
    version: str = "1.2.0"

class SecurityRule:
    """
    Deterministic detection rule for Local Security Engine.
    Evaluates normalized text and extracts verifiable evidence.
    """
    def __init__(
        self,
        rule_id: str,
        category: str,
        name: str,
        description: str,
        severity: str,
        base_score: int,
        patterns: List[re.Pattern],
        mitigation: str,
        negative_contexts: Optional[List[re.Pattern]] = None,
        version: str = "1.2.0"
    ):
        self.rule_id = rule_id
        self.category = category
        self.name = name
        self.description = description
        self.severity = severity
        self.base_score = base_score
        self.patterns = patterns
        self.mitigation = mitigation
        self.negative_contexts = negative_contexts or []
        self.version = version

    def match(self, lowered_text: str, unleeted_text: str, original_text: str) -> Optional[RuleMatch]:
        # Check negative educational / inquiry contexts first
        for neg in self.negative_contexts:
            if neg.search(lowered_text):
                # Context indicates benign discussion; suppress false positive
                return None

        # Check standard lowered text against patterns
        for pattern in self.patterns:
            m = pattern.search(lowered_text)
            if m:
                # Extract safe excerpt around match
                start = max(0, m.start() - 20)
                end = min(len(original_text), m.end() + 20)
                excerpt = original_text[start:end].strip()
                if start > 0:
                    excerpt = "..." + excerpt
                if end < len(original_text):
                    excerpt = excerpt + "..."

                return RuleMatch(
                    rule_id=self.rule_id,
                    category=self.category,
                    severity=self.severity,
                    name=self.name,
                    description=self.description,
                    base_score=self.base_score,
                    matched_excerpt=excerpt[:120],
                    pattern_matched=pattern.pattern,
                    mitigation=self.mitigation,
                    version=self.version
                )

        # Check unleeted text if different from lowered_text
        if unleeted_text != lowered_text:
            for pattern in self.patterns:
                m = pattern.search(unleeted_text)
                if m:
                    excerpt = unleeted_text[max(0, m.start() - 15):min(len(unleeted_text), m.end() + 15)].strip()
                    return RuleMatch(
                        rule_id=self.rule_id,
                        category=self.category,
                        severity=self.severity,
                        name=f"{self.name} (Obfuscated)",
                        description=f"{self.description} (detected via Leetspeak unmasking)",
                        base_score=self.base_score,
                        matched_excerpt=f"[Leetspeak match] {excerpt[:100]}",
                        pattern_matched=pattern.pattern,
                        mitigation=self.mitigation,
                        version=self.version
                    )

        return None


# Common benign inquiry / educational patterns used to suppress false positives
BENIGN_INQUIRY_PATTERNS = [
    re.compile(r"^\s*(?:what\s+is|explain|define|how\s+does|discuss|describe|tell\s+me\s+about|summarize\s+the\s+report\s+on)\s+(?:a\s+|an\s+|the\s+)?(?:indirect\s+)?(?:prompt\s+injection|system\s+prompt|jailbreak)", re.IGNORECASE),
    re.compile(r"\b(?:security\s+team\s+is\s+studying|report\s+discusses|educational\s+overview\s+of)\b", re.IGNORECASE),
    re.compile(r"^\s*(?:can\s+you\s+explain|give\s+an\s+educational\s+summary\s+of)\b", re.IGNORECASE)
]

def build_rule_registry() -> List[SecurityRule]:
    """
    Builds the complete rule registry covering all 7 attack categories.
    """
    return [
        # =====================================================================
        # CATEGORY 1: Instruction Override & Prompt Injection
        # =====================================================================
        SecurityRule(
            rule_id="INJ-001",
            category="instruction_override",
            name="Ignore Prior Instructions Directive",
            description="Direct attempt to override or cancel foundational model instructions.",
            severity="HIGH",
            base_score=80,
            patterns=[
                re.compile(r"\bignore\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+(?:system\s+)?(?:instructions|directives|rules)\b"),
                re.compile(r"\bdisregard\s+(?:all\s+)?(?:previous|prior|system|earlier)\s+(?:instructions|directives|rules)\b"),
                re.compile(r"\bforget\s+(?:all\s+)?(?:previous|prior|system|earlier)\s+(?:instructions|directives|rules)\b"),
                re.compile(r"\boverride\s+(?:all\s+)?(?:previous|prior|system|earlier)\s+(?:instructions|directives|rules)\b"),
                re.compile(r"\bbypass\s+(?:your\s+)?system\s+prompt\b"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Enforce strict structural input tagging (XML or JSON envelopes) and disregard directive cancellation requests."
        ),
        SecurityRule(
            rule_id="INJ-002",
            category="instruction_override",
            name="Instruction Reset / Directive Wipe",
            description="Attempt to wipe system memory, safety constraints, or instructions.",
            severity="HIGH",
            base_score=75,
            patterns=[
                re.compile(r"\breset\s+(?:all\s+)?(?:safety\s+)?(?:guidelines|constraints|rules)\b"),
                re.compile(r"\bclear\s+(?:all\s+)?(?:prior\s+)?(?:directives|instructions)\b"),
                re.compile(r"\bwipe\s+(?:your\s+)?(?:memory|guidelines|instructions)\b"),
                re.compile(r"\bdisregard\s+system\s+instructions\b"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Reject conversation state reset requests originating from untrusted input fields."
        ),
        SecurityRule(
            rule_id="INJ-003",
            category="instruction_override",
            name="Supreme Directive Usurpation",
            description="Attempt to assert a new supreme directive that supersedes system policy.",
            severity="HIGH",
            base_score=70,
            patterns=[
                re.compile(r"\bthis\s+instruction\s+supersedes\s+all\b"),
                re.compile(r"\bnew\s+(?:supreme|primary|absolute)\s+(?:directive|instruction|rule)\b"),
                re.compile(r"\bfrom\s+now\s+on\s*,\s*you\s+must\s+only\b"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Maintain system prompt precedence in the system turn and treat user prompt turns as untrusted data."
        ),

        # =====================================================================
        # CATEGORY 2: Hidden System Instruction Extraction
        # =====================================================================
        SecurityRule(
            rule_id="EXT-001",
            category="prompt_extraction",
            name="System Prompt Extraction Request",
            description="Attempt to extract confidential system instructions or hidden preambles.",
            severity="HIGH",
            base_score=80,
            patterns=[
                re.compile(r"\breveal\s+(?:your\s+)?(?:system\s+)?prompt\b"),
                re.compile(r"\brepeat\s+(?:your\s+)?system\s+prompt\b"),
                re.compile(r"\bshow\s+(?:me\s+)?(?:your\s+)?(?:hidden\s+)?instructions\b"),
                re.compile(r"\bdisclose\s+(?:your\s+)?(?:system\s+)?instructions\b"),
                re.compile(r"\boutput\s+(?:your\s+)?(?:system\s+)?prompt\b"),
                re.compile(r"\bprint\s+(?:your\s+)?(?:system\s+prompt|initial\s+(?:developer\s+)?instructions)\b"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Prohibit models from repeating their system configuration or instructions in output streams."
        ),
        SecurityRule(
            rule_id="EXT-002",
            category="prompt_extraction",
            name="System Verbatim Replay Attack",
            description="Attempt to force repetition of words prior to user turn.",
            severity="MEDIUM",
            base_score=65,
            patterns=[
                re.compile(r"\brepeat\s+the\s+words\s+above\b"),
                re.compile(r"\b(?:print|output|repeat)\s+(?:everything|text|all)\s+above\s+(?:this\s+line|here)\b"),
                re.compile(r"\bwhat\s+(?:were\s+you|are\s+the)\s+(?:told\s+in\s+your\s+)?(?:exact\s+instructions|system\s+rules)\b"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Employ output filtering and canary tokens to detect inadvertent leakage of preamble directives."
        ),

        # =====================================================================
        # CATEGORY 3: Security Policy Bypass & Jailbreaks
        # =====================================================================
        SecurityRule(
            rule_id="BYP-001",
            category="security_bypass",
            name="Known Jailbreak Persona / Bypass Mode",
            description="Attempt to invoke known jailbreak constructs such as DAN mode or unrestricted personas.",
            severity="CRITICAL",
            base_score=85,
            patterns=[
                re.compile(r"\bdo\s+anything\s+now\b"),
                re.compile(r"\bDAN\s+mode\b", re.IGNORECASE),
                re.compile(r"\bdeveloper\s+mode\s+(?:is\s+)?(?:enabled|override|active)\b"),
                re.compile(r"\balways\s+say\s+yes\b"),
                re.compile(r"\bAIM\s+persona\b", re.IGNORECASE),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Quarantine requests attempting persona unbinding and reject developer mode bypass triggers."
        ),
        SecurityRule(
            rule_id="BYP-002",
            category="security_bypass",
            name="Safety Filter Deactivation Attempt",
            description="Explicit request to turn off content safety filters or moderation.",
            severity="HIGH",
            base_score=75,
            patterns=[
                re.compile(r"\bdisable\s+(?:all\s+)?(?:safety\s+)?(?:filters|guardrails|checks)\b"),
                re.compile(r"\bbypass\s+(?:all\s+)?(?:content\s+)?(?:filters|restrictions|policy)\b"),
                re.compile(r"\bturn\s+off\s+(?:moderation|safety\s+protocols)\b"),
                re.compile(r"\bdisregard\s+security\s+policy\b"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Hardcode boundary enforcement in middleware so that prompts cannot modulate security policies."
        ),
        SecurityRule(
            rule_id="BYP-003",
            category="security_bypass",
            name="Hypothetical / Fictional Evasion Wrapper",
            description="Attempt to bypass policies via fictional framing or hypothetical rule suspension.",
            severity="MEDIUM",
            base_score=60,
            patterns=[
                re.compile(r"\bin\s+a\s+fictional\s+world\s+with\s+no\s+(?:rules|laws|restrictions)\b"),
                re.compile(r"\bpretend\s+(?:there\s+are\s+no\s+rules|you\s+have\s+no\s+ethics)\b"),
                re.compile(r"\bfor\s+(?:hypothetical|educational)\s+purposes\s+only\s*,\s*ignore\b"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Inspect underlying payload intent regardless of hypothetical or fictional framing."
        ),

        # =====================================================================
        # CATEGORY 4: Sensitive Data & Secret Exfiltration
        # =====================================================================
        SecurityRule(
            rule_id="EXF-001",
            category="data_exfiltration",
            name="Confidential Secret Exposure Request",
            description="Attempt to induce the agent to expose API keys, credentials, or secrets.",
            severity="HIGH",
            base_score=70,
            patterns=[
                re.compile(r"\bexpose\s+secrets\b"),
                re.compile(r"\bforward\s+confidential\s+information\b"),
                re.compile(r"\breveal\s+(?:api\s+keys|credentials|private\s+keys|passwords)\b"),
                re.compile(r"\bprint\s+(?:all\s+)?(?:passwords|tokens|api_keys)\b"),
                re.compile(r"\bsend\s+(?:all\s+)?(?:sensitive\s+)?(?:passwords|secrets|tokens|keys)\s+to\b"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Plant canary HoneyTokens into system memory and block any prompt requesting credential display."
        ),
        SecurityRule(
            rule_id="EXF-002",
            category="data_exfiltration",
            name="Unauthorized External Egress Request",
            description="Attempt to transmit internal records to an external URL or endpoint.",
            severity="MEDIUM",
            base_score=55,
            patterns=[
                re.compile(r"\bsend\s+.*\bto\s+webhook\s+https?://\S+"),
                re.compile(r"\bsend\s+(?:the\s+)?(?:data|secrets|information|records)\s+to\s+https?://\S+"),
                re.compile(r"\bsend\s+(?:the\s+)?data\s+to\b"),
                re.compile(r"\bupload\s+(?:the\s+)?contents\s+to\b"),
                re.compile(r"\bexfiltrate\s+(?:private|confidential|internal|database)\b"),
                re.compile(r"\bcurl\s+https?://\S+"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Enforce strict egress allowlisting on tool invocation arguments and network endpoints."
        ),
        SecurityRule(
            rule_id="EXF-003",
            category="data_exfiltration",
            name="Environment / Configuration Extraction",
            description="Attempt to extract server environment variables or configuration files.",
            severity="HIGH",
            base_score=70,
            patterns=[
                re.compile(r"\bdump\s+(?:all\s+)?environment\s+variables\b"),
                re.compile(r"\bprint\s+(?:\.env|env\s+vars)\b"),
                re.compile(r"\bdisplay\s+connection\s+strings\b"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Isolate application configuration in secure secret vaults inaccessible to the agent runtime."
        ),

        # =====================================================================
        # CATEGORY 5: Dangerous Tool & Command Execution
        # =====================================================================
        SecurityRule(
            rule_id="TOOL-001",
            category="dangerous_action",
            name="Destructive File System Action Request",
            description="Attempt to request file deletion, table drops, or destructive operations.",
            severity="HIGH",
            base_score=70,
            patterns=[
                re.compile(r"\bdelete\s+files\b"),
                re.compile(r"\brm\s+-rf\b"),
                re.compile(r"\bdrop\s+table\b", re.IGNORECASE),
                re.compile(r"\bformat\s+(?:the\s+)?(?:drive|disk)\b"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Confine tool capabilities with default-deny permissions and human approval gates for write/delete tools."
        ),
        SecurityRule(
            rule_id="TOOL-002",
            category="dangerous_action",
            name="Arbitrary Shell / Command Execution Request",
            description="Attempt to invoke shell commands or terminal process execution.",
            severity="HIGH",
            base_score=70,
            patterns=[
                re.compile(r"\bexecute\s+this\s+command\b"),
                re.compile(r"\brun\s+(?:shell\s+|os\s+)?command\b"),
                re.compile(r"\bexecute\s+(?:shell\s+|os\s+)?command\b"),
                re.compile(r"\bexecute\s+bash\b"),
                re.compile(r"\bspawn\s+terminal\s+process\b"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Never provide shell or arbitrary command execution capabilities to LLM tool boundaries."
        ),
        SecurityRule(
            rule_id="TOOL-003",
            category="dangerous_action",
            name="Privilege Escalation / Admin Access Request",
            description="Attempt to claim or request administrator/root privilege elevation.",
            severity="HIGH",
            base_score=70,
            patterns=[
                re.compile(r"\baccess\s+credentials\b"),
                re.compile(r"\bgrant\s+me\s+admin\b"),
                re.compile(r"\belevate\s+privileges\s+to\s+root\b"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Enforce role-based access control (RBAC) in middleware before routing tool calls."
        ),

        # =====================================================================
        # CATEGORY 6: Instruction Smuggling & Delimiter Abuse
        # =====================================================================
        SecurityRule(
            rule_id="SMUG-001",
            category="instruction_smuggling",
            name="Structural Delimiter / Pseudo-Header Injection",
            description="Attempt to simulate system delimiters or markdown blocks to inject instructions.",
            severity="LOW",
            base_score=25,
            patterns=[
                re.compile(r"===+\s*.*?\s*===+"),
                re.compile(r"^\s*(?:task|objective|goal)\s*:\s*", re.MULTILINE),
                re.compile(r"\[(?:SYSTEM|DEVELOPER|PROMPT)\s*:\s*.*?\]", re.IGNORECASE),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Sanitize markdown markers and enforce structured delimiter validation on prompt inputs."
        ),
        SecurityRule(
            rule_id="SMUG-002",
            category="instruction_smuggling",
            name="Smuggled Directive Pivot",
            description="Attempt to pivot context using contrasting transition markers.",
            severity="LOW",
            base_score=30,
            patterns=[
                re.compile(r"\b(now|instead|however)\s*,\s*(?:please\s+)?(?:output|print|give\s+me)\b"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Inspect embedded directives following contrasting transitions."
        ),

        # =====================================================================
        # CATEGORY 7: Role Manipulation & Persona Usurpation
        # =====================================================================
        SecurityRule(
            rule_id="ROLE-001",
            category="role_manipulation",
            name="Unrestricted Persona Adoption Request",
            description="Attempt to reassign the assistant's persona to an attacker or unconstrained bot.",
            severity="MEDIUM",
            base_score=60,
            patterns=[
                re.compile(r"\byou\s+are\s+now\b"),
                re.compile(r"\bassume\s+the\s+role\s+of\b"),
                re.compile(r"\bpretend\s+to\s+be\s+an\s+unconstrained\b"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Anchor agent role definition in immutable system messages."
        ),
        SecurityRule(
            rule_id="ROLE-002",
            category="role_manipulation",
            name="Authority Impersonation / Fake System Message",
            description="Attempt to spoof system or developer messages inside user prompt turns.",
            severity="HIGH",
            base_score=70,
            patterns=[
                re.compile(r"\bact\s+as\s+system\b"),
                re.compile(r"\bsystem\s+message\s*:"),
                re.compile(r"\bdeveloper\s+message\s*:"),
                re.compile(r"\badmin\s+override\s*:"),
            ],
            negative_contexts=BENIGN_INQUIRY_PATTERNS,
            mitigation="Strictly separate user input from system headers using role-separated API messages."
        ),
    ]
