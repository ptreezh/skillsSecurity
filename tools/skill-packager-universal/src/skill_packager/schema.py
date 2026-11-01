"""
FreeSkill Enhanced Universal Format Schema
Pydantic models for canonical intermediate representation.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class Platform(str, Enum):
    workbuddy = "workbuddy"
    doubao = "doubao"
    coze = "coze"
    qwen = "qwen"
    trae = "trae"
    claude = "claude"
    agent_plugins = "agent-plugins"
    generic = "generic"


class OriginalFormat(str, Enum):
    plugin = "plugin"
    skill = "skill"
    agent = "agent"
    rule = "rule"
    connector = "connector"
    panel = "panel"


class ForkType(str, Enum):
    ORIGINAL = "original"
    FORK = "fork"
    MODIFY = "modify"
    TRANSLATION = "translation"
    EXTENSION = "extension"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class SourceMetadata(BaseModel):
    platform: Platform
    originalFormat: OriginalFormat
    uploadedAt: datetime = Field(default_factory=datetime.utcnow)
    originalHash: str = Field(description="SHA-256 hash of original package")


class FreeSkillMetadata(BaseModel):
    standard: str = "freeskill-enhanced"
    version: str = "1.0.0"
    fingerprint: Optional[str] = Field(default=None, description="keccak256(ipfsHash||creator||timestamp)")
    creator: Optional[str] = Field(default=None, description="0x creator address")
    createdAt: Optional[int] = Field(default=None, description="Unix timestamp")
    ipfsHash: Optional[str] = Field(default=None, description="IPFS CID")
    riskLevel: RiskLevel = RiskLevel.LOW
    stakeRequired: int = Field(default=0, description="Minimum reputation/stake required")
    attestationCount: int = Field(default=1, ge=1)
    auditTrail: List[str] = Field(default_factory=list, description="IPFS hashes of audit reports")
    source: Optional[SourceMetadata] = None
    parentSkillId: Optional[int] = Field(default=None, description="Parent skill ID if forked")
    parentFingerprint: Optional[str] = Field(default=None, description="Parent skill fingerprint")
    forkType: ForkType = ForkType.ORIGINAL


class TriggerConfig(BaseModel):
    description: str = Field(description="Natural language trigger description")
    keywords: List[str] = Field(default_factory=list)
    excludePatterns: List[str] = Field(default_factory=list)


class SkillContent(BaseModel):
    body: str = Field(description="Full SKILL.md body as Markdown")
    frontmatter: Dict[str, Any] = Field(default_factory=dict)


class SkillResourceRefs(BaseModel):
    scripts: List[str] = Field(default_factory=list)
    references: List[str] = Field(default_factory=list)
    assets: List[str] = Field(default_factory=list)


class ExecutionContract(BaseModel):
    inputContract: str = ""
    executionProtocol: str = ""
    failureHandling: str = ""
    outputContract: str = ""


class SkillDefinition(BaseModel):
    name: str
    displayName: Optional[str] = None
    description: str
    category: Optional[str] = None
    version: str = "1.0.0"
    author: Optional[str] = None
    license: Optional[str] = "MIT"
    homepage: Optional[str] = None
    repository: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    trigger: TriggerConfig = Field(default_factory=TriggerConfig)
    content: SkillContent
    resources: SkillResourceRefs = Field(default_factory=SkillResourceRefs)
    execution: ExecutionContract = Field(default_factory=ExecutionContract)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        import re
        if not re.match(r"^[a-z0-9][a-z0-9-]*$", v):
            raise ValueError("name must be kebab-case lowercase")
        return v


class AgentDefinition(BaseModel):
    name: str
    description: str
    model: Optional[str] = None
    effort: Optional[str] = None
    maxTurns: Optional[int] = Field(default=None, ge=1, le=200)
    tools: List[str] = Field(default_factory=list)
    disallowedTools: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    memory: Optional[str] = None
    background: Optional[str] = None
    isolation: Optional[str] = None
    systemPrompt: Optional[str] = None
    permissionMode: Optional[str] = None


class MCPServerConfig(BaseModel):
    name: str
    type: str = Field(default="stdio", description="stdio|streamable-http|sse")
    command: Optional[str] = None
    args: List[str] = Field(default_factory=list)
    env: Dict[str, str] = Field(default_factory=dict)
    transport: Optional[str] = None
    enabled: bool = True


class HookEvent(BaseModel):
    event: str = Field(description="UserPromptSubmit|PreToolUse|PostToolUse|...")
    command: str
    type: str = Field(default="command", description="command|prompt")


class RuleDefinition(BaseModel):
    path: str
    alwaysApply: bool = False
    description: str = ""
    globs: List[str] = Field(default_factory=list)
    scene: Optional[str] = None


class CreditChainEntry(BaseModel):
    role: str = Field(description="creator|verifier|contributor|maintainer|adapter|originator|forker|modifier|translator|extender|reviewer")
    address: str
    name: str
    contribution: str
    weight: float = Field(default=1.0, ge=0.0, le=1.0)
    timestamp: int = Field(description="Unix timestamp")
    signature: Optional[str] = None


class ContributorEntry(BaseModel):
    address: str
    role: str = Field(description="originator|forker|modifier|translator|extender|reviewer|maintainer")
    weight: float = Field(default=1.0, ge=0.0, le=1.0)
    skillId: Optional[int] = None
    contribution: str = ""
    timestamp: int = Field(description="Unix timestamp")


class ResponsibilityConfig(BaseModel):
    creator: Optional[str] = None
    verifiers: List[str] = Field(default_factory=list)
    auditReport: Optional[str] = None
    liabilityDeclaration: str = ""
    scopeDeclaration: str = ""
    creditChain: List[CreditChainEntry] = Field(default_factory=list)
    contributors: List[ContributorEntry] = Field(default_factory=list, description="All contributors with weights")


class ViolationType(BaseModel):
    type: str = Field(description="malicious_skill|verifier_misconduct|false_report")
    punishment: str = ""
    evidenceRequired: str = "multi_layer"


class AntiSlashConfig(BaseModel):
    enabled: bool = True
    slashRate: float = Field(default=0.5, ge=0.0, le=1.0)
    appealsPeriod: int = Field(default=7, ge=0)
    violationTypes: List[ViolationType] = Field(default_factory=list)


class MultiSigConfig(BaseModel):
    required: int = Field(default=2, ge=1)
    signers: List[str] = Field(default_factory=list)


class HumanAuthConfig(BaseModel):
    required: List[str] = Field(default_factory=list, description="stake|submit|publish|...")
    confirmedBy: Optional[str] = None
    multiSig: Optional[MultiSigConfig] = None


class OnChainReceipt(BaseModel):
    """链上回执（必须字段，MVP 强制写入）"""
    skillId: Optional[int] = None
    txHash: Optional[str] = None
    blockNumber: Optional[int] = None
    contractAddress: Optional[str] = None
    chainId: str = Field(default="chain1", description="ChainMaker chain1")
    submitter: Optional[str] = None
    creator: Optional[str] = None
    registeredAt: Optional[int] = None
    gasUsed: Optional[int] = None
    status: str = Field(default="pending", description="pending|confirmed|failed")


class PackageMeta(BaseModel):
    format: str = "zip"
    compression: str = "deflate"
    maxSize: str = "500MB"
    includeChecksums: bool = True
    includeSignature: bool = False


class LineageAncestor(BaseModel):
    skillId: int
    name: str
    creator: Optional[str] = None
    forkType: Optional[str] = None


class LineageDescendant(BaseModel):
    skillId: int
    name: str
    creator: Optional[str] = None
    forkType: Optional[str] = None


class LineageResponse(BaseModel):
    skillId: int
    name: str
    ancestors: List[LineageAncestor] = Field(default_factory=list)
    descendants: List[LineageDescendant] = Field(default_factory=list)
    contributors: List[ContributorEntry] = Field(default_factory=list)
    depth: int = 0
    branchCount: int = 0


class ReceiptResponse(BaseModel):
    skillId: int
    fingerprint: str
    parentFingerprint: Optional[str] = None
    creator: Optional[str] = None
    contributors: List[ContributorEntry] = Field(default_factory=list)
    txHash: Optional[str] = None
    blockNumber: Optional[int] = None
    timestamp: int
    platform: Optional[str] = None
    receiptUrl: Optional[str] = None
    verification: Dict[str, Any] = Field(default_factory=dict)


class FreeSkillEnhanced(BaseModel):
    """Canonical universal format for skill-packager-universal"""
    schema_ref: str = Field(default="freeskill-enhanced/1.0.0", alias="$schema")
    freeskill: FreeSkillMetadata
    skill: Optional[SkillDefinition] = None
    agent: Optional[AgentDefinition] = None
    mcp: Dict[str, List[MCPServerConfig]] = Field(default_factory=dict)
    hooks: Dict[str, List[HookEvent]] = Field(default_factory=dict)
    rules: Dict[str, List[RuleDefinition]] = Field(default_factory=dict)
    responsibility: ResponsibilityConfig = Field(default_factory=ResponsibilityConfig)
    antiSlash: AntiSlashConfig = Field(default_factory=AntiSlashConfig)
    humanAuth: HumanAuthConfig = Field(default_factory=HumanAuthConfig)
    onChain: OnChainReceipt = Field(default_factory=OnChainReceipt, description="链上回执")
    package: PackageMeta = Field(default_factory=PackageMeta)

    model_config = {"populate_by_name": True}
