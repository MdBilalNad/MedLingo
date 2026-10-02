from pydantic import BaseModel
from typing import Literal

class LabResult(BaseModel):
    test_name: str
    raw_name: str
    value: float | None = None
    value_text: str | None = None
    unit: str | None = None
    ref_low: float | None = None
    ref_high: float | None = None
    ref_text: str | None = None
    flag: Literal["low", "normal", "high", "critical_low", "critical_high", "unknown"]
    confidence: float

class AnalysisRequest(BaseModel):
    report_text: str | None = None
    report_image_base64: str | None = None
    language: str
    age: int | None = None
    sex: Literal["male", "female", "other"] | None = None
    include_audio: bool = False

class AnalysisResponse(BaseModel):
    results: list[LabResult]
    summary: str
    explanations: dict[str, str]
    questions_for_doctor: list[str]
    urgent_notice: str | None = None
    disclaimer: str
    language: str
    audio_url: str | None = None
    warnings: list[str] = []
