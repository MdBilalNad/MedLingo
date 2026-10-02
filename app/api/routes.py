from fastapi import APIRouter
from app.api.schemas import AnalysisRequest, AnalysisResponse

router = APIRouter()

@router.get("/languages")
def get_languages():
    return {
        "languages": [
            {"code": "en", "name": "English", "dir": "ltr"},
            {"code": "hi", "name": "Hindi", "dir": "ltr"},
            {"code": "es", "name": "Spanish", "dir": "ltr"},
            {"code": "ar", "name": "Arabic", "dir": "rtl"},
            {"code": "fr", "name": "French", "dir": "ltr"},
            {"code": "bn", "name": "Bengali", "dir": "ltr"},
            {"code": "ur", "name": "Urdu", "dir": "rtl"},
            {"code": "ta", "name": "Tamil", "dir": "ltr"},
        ]
    }

@router.post("/analyze", response_model=AnalysisResponse)
def analyze_endpoint(request: AnalysisRequest):
    return AnalysisResponse(
        results=[],
        summary="API scaffold initialized. Full analysis supported through core engine.",
        explanations={},
        questions_for_doctor=["What steps should I take next with my doctor?"],
        urgent_notice=None,
        disclaimer="MedLingo provides health literacy support, not clinical diagnosis.",
        language=request.language,
        warnings=[]
    )
