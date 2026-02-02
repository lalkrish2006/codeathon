from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from enum import Enum
from datetime import datetime

class PackageType(str, Enum):
    MEDICAL = "medical"
    ESSENTIAL = "essential"
    COMMERCIAL = "commercial"
    LEGAL = "legal"
    PERSONAL = "personal"
    UNKNOWN = "unknown"

class UrgencyLevel(str, Enum):
    CRITICAL = "critical"  # Life-saving
    HIGH = "high"          # Time-sensitive, potential harm
    MEDIUM = "medium"      # Standard delivery
    LOW = "low"            # No rush

class EthicalCategory(str, Enum):
    LIFE_SAVING = "life_saving"
    HARM_PREVENTION = "harm_prevention"
    STANDARD = "standard"

class PackageInput(BaseModel):
    id: str
    description: str
    sender: str
    recipient_type: str  # e.g., "hospital", "residential", "government"
    claimed_urgency: Optional[str] = None
    is_hazmat: bool = False
    metadata: Optional[Dict] = {}

class MLPrediction(BaseModel):
    predicted_category: PackageType
    urgency_score: float = Field(..., ge=0.0, le=1.0)
    harm_score: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    explanation: str

class LLMAnalysis(BaseModel):
    detected_category: PackageType
    intent: str
    is_false_positive: bool # e.g. "Model Kit" vs "Real"
    urgency_modifier: float = 0.0 # -0.5 to +0.5
    new_keywords: List[str] = [] # For adaptive ML
    reasoning: str

class DecisionLog(BaseModel):
    package_id: str
    final_priority_score: int  # 1 (Highest) to 10 (Lowest)
    decision_source: str       # "ETHICAL_RULE" or "ML_MODEL"
    ethical_category: EthicalCategory
    ml_prediction: Optional[MLPrediction] = None
    llm_analysis: Optional[LLMAnalysis] = None
    reasoning: str
    timestamp: datetime = Field(default_factory=datetime.now)

    # Phase 4 Extensions
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    requires_human_approval: bool = False
    human_approved: Optional[bool] = None
    sender_trust_score: float = Field(default=1.0, ge=0.0, le=1.0)
    ai_models_used: List[str] = []
    misuse_flag: bool = False
