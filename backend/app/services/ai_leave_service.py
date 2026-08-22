import json
import logging
from typing import Dict, Any, List
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.employee import Employee
from app.models.leave import LeaveRequest
from app.services.leave_service import get_or_create_balance

logger = logging.getLogger(__name__)

def evaluate_leave_request_ai(db: Session, request_id: int) -> Dict[str, Any]:
    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not req:
        raise ValueError("Leave request not found.")

    emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
    emp_name = emp.full_name if emp else "Employee"
    emp_code = emp.employee_code if emp else "EMP-000"
    emp_dept = emp.department if emp else "General"

    balance = get_or_create_balance(db, req.employee_id)
    paid_remaining = balance.paid_remaining
    sick_remaining = balance.sick_remaining

    leave_type = req.leave_type
    days = req.days
    remarks = req.remarks or ""
    start_date = str(req.start_date)
    end_date = str(req.end_date)

    # Attempt Mistral AI Call if API Key exists
    if settings.MISTRAL_API_KEY:
        try:
            return _call_mistral_api(
                emp_name=emp_name,
                emp_code=emp_code,
                emp_dept=emp_dept,
                leave_type=leave_type,
                days=days,
                start_date=start_date,
                end_date=end_date,
                remarks=remarks,
                paid_remaining=paid_remaining,
                sick_remaining=sick_remaining,
            )
        except Exception as err:
            logger.warning(f"Mistral AI API call failed, using intelligent rule evaluator: {err}")

    # Fallback Rule Evaluator
    return _rule_based_evaluation(
        emp_name=emp_name,
        leave_type=leave_type,
        days=days,
        remarks=remarks,
        paid_remaining=paid_remaining,
        sick_remaining=sick_remaining,
    )

def _call_mistral_api(
    emp_name: str,
    emp_code: str,
    emp_dept: str,
    leave_type: str,
    days: int,
    start_date: str,
    end_date: str,
    remarks: str,
    paid_remaining: float,
    sick_remaining: float,
) -> Dict[str, Any]:
    url = "https://api.mistral.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.MISTRAL_API_KEY}",
        "Content-Type": "application/json",
    }

    prompt = f"""
Employee Name: {emp_name} ({emp_code})
Department: {emp_dept}
Requested Leave Type: {leave_type}
Dates: {start_date} to {end_date} ({days} days)
Employee Remarks/Reason: "{remarks}"
Current Paid Leave Balance: {paid_remaining} days
Current Sick Leave Balance: {sick_remaining} days

Evaluate this leave request for an HR Officer. Output ONLY valid JSON in this exact structure:
{{
  "recommendation": "APPROVE" | "REJECT" | "NEEDS_MORE_INFO",
  "confidence": 92,
  "summary": "Short 1-2 sentence executive summary",
  "reasoning": ["Point 1", "Point 2", "Point 3"],
  "suggested_comment": "Suggested response to employee"
}}
"""

    payload = {
        "model": "mistral-small-latest",
        "messages": [
            {
                "role": "system",
                "content": "You are an expert HR AI assistant evaluating employee leave applications. Return strictly valid JSON."
            },
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }

    with httpx.Client(timeout=15.0) as client:
        res = client.post(url, headers=headers, json=payload)
        res.raise_for_status()
        data = res.json()
        raw_text = data["choices"][0]["message"]["content"]
        parsed = json.loads(raw_text)
        return parsed

def _rule_based_evaluation(
    emp_name: str,
    leave_type: str,
    days: int,
    remarks: str,
    paid_remaining: float,
    sick_remaining: float,
) -> Dict[str, Any]:
    remarks_clean = remarks.lower().strip()
    reasoning: List[str] = []
    recommendation = "APPROVE"
    confidence = 94

    # Balance check
    if leave_type == "SICK":
        if sick_remaining >= days:
            reasoning.append(f"Sufficient sick leave balance ({sick_remaining:.0f} days remaining for {days} day(s) request).")
        else:
            recommendation = "REJECT"
            confidence = 88
            reasoning.append(f"Insufficient sick leave balance ({sick_remaining:.0f} days remaining for {days} day(s) request).")
    elif leave_type == "PAID":
        if paid_remaining >= days:
            reasoning.append(f"Sufficient paid leave balance ({paid_remaining:.0f} days remaining for {days} day(s) request).")
        else:
            recommendation = "REJECT"
            confidence = 90
            reasoning.append(f"Insufficient paid leave balance ({paid_remaining:.0f} days remaining for {days} day(s) request).")
    else:  # UNPAID
        reasoning.append("Unpaid leave request requires standard HR policy check.")

    # Remarks / Reason assessment
    if not remarks_clean:
        if recommendation == "APPROVE":
            recommendation = "NEEDS_MORE_INFO"
            confidence = 85
        reasoning.append("No specific reason or remarks provided by employee.")
    else:
        medical_keywords = ["sick", "fever", "doctor", "hospital", "medical", "health", "clinic", "surgery", "pain", "treatment"]
        personal_keywords = ["family", "personal", "vacation", "travel", "wedding", "emergency", "relocation", "function", "event"]

        if any(k in remarks_clean for k in medical_keywords):
            reasoning.append("Valid medical / health reason provided in employee remarks.")
            if days >= 3:
                reasoning.append("Medical certificate/proof recommended for leaves longer than 2 days.")
        elif any(k in remarks_clean for k in personal_keywords):
            reasoning.append("Standard personal / family leave reason provided.")
        else:
            reasoning.append("Custom reason provided in employee submission.")

    # Generate summary & suggested comment
    if recommendation == "APPROVE":
        summary = f"{emp_name}'s {leave_type.lower()} leave request meets leave policy rules with adequate balance."
        suggested_comment = f"Approved. {leave_type.title()} leave request is within policy guidelines and remaining balance."
    elif recommendation == "REJECT":
        summary = f"Request exceeds available {leave_type.lower()} leave balance."
        suggested_comment = f"Rejected due to insufficient {leave_type.lower()} leave balance."
    else:  # NEEDS_MORE_INFO
        summary = f"Employee reason is brief. Recommend requesting additional details or proof documentation."
        suggested_comment = "Please provide additional remarks or supporting proof for your leave request."

    return {
        "recommendation": recommendation,
        "confidence": confidence,
        "summary": summary,
        "reasoning": reasoning,
        "suggested_comment": suggested_comment,
    }
