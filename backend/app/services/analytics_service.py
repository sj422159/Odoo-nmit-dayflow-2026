"""Analytics built on pandas, with two scikit-learn models:

1. Attendance forecast  - Ridge regression on calendar + lag features.
2. Irregularity flags   - IsolationForest over per-employee behaviour vectors.

Both degrade explicitly (and say so in the payload) when history is too thin,
rather than inventing numbers.
"""
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error
from sklearn.preprocessing import StandardScaler
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.attendance import AttendanceRecord
from app.models.employee import Employee
from app.models.enums import AttendanceStatus, LeaveStatus
from app.models.leave import LeaveRequest
from app.schemas.analytics import (
    AttendanceForecast,
    ForecastPoint,
    IrregularityFlag,
    TrendPoint,
)
from app.services.attendance_service import is_working_day, workday_start_time

MIN_TRAINING_DAYS = 21
LAGS = (1, 2, 5)


# --------------------------------------------------------------------------- #
# Shared frames
# --------------------------------------------------------------------------- #
def attendance_frame(db: Session, start: date, end: date, employee_id: Optional[int] = None) -> pd.DataFrame:
    stmt = select(
        AttendanceRecord.employee_id,
        AttendanceRecord.work_date,
        AttendanceRecord.status,
        AttendanceRecord.worked_minutes,
        AttendanceRecord.check_in,
    ).where(AttendanceRecord.work_date >= start, AttendanceRecord.work_date <= end)
    if employee_id is not None:
        stmt = stmt.where(AttendanceRecord.employee_id == employee_id)
    rows = db.execute(stmt).all()
    frame = pd.DataFrame(
        rows, columns=["employee_id", "work_date", "status", "worked_minutes", "check_in"]
    )
    if frame.empty:
        return frame
    frame["work_date"] = pd.to_datetime(frame["work_date"]).dt.date
    return frame


def daily_trend(frame: pd.DataFrame, start: date, end: date) -> List[TrendPoint]:
    """Per-day counts and a credited attendance rate, working days only."""
    days = [d for d in pd.date_range(start, end).date if is_working_day(d)]
    if frame.empty:
        return [
            TrendPoint(work_date=d, present=0, absent=0, half_day=0, leave=0, attendance_rate=0.0)
            for d in days
        ]

    pivot = (
        frame.pivot_table(
            index="work_date", columns="status", values="employee_id", aggfunc="count", fill_value=0
        )
        .reindex(days, fill_value=0)
        .fillna(0)
    )
    for status in AttendanceStatus.values():
        if status not in pivot.columns:
            pivot[status] = 0

    points: List[TrendPoint] = []
    for day, row in pivot.iterrows():
        present = int(row[AttendanceStatus.PRESENT.value])
        absent = int(row[AttendanceStatus.ABSENT.value])
        half = int(row[AttendanceStatus.HALF_DAY.value])
        leave = int(row[AttendanceStatus.LEAVE.value])
        total = present + absent + half + leave
        rate = round(((present + 0.5 * half) / total) * 100, 2) if total else 0.0
        points.append(
            TrendPoint(
                work_date=day, present=present, absent=absent, half_day=half, leave=leave,
                attendance_rate=rate,
            )
        )
    return points


# --------------------------------------------------------------------------- #
# Model 1: attendance forecast (Ridge regression)
# --------------------------------------------------------------------------- #
def _feature_row(day: date, history: List[float]) -> List[float]:
    weekday = day.weekday()
    features = [1.0 if weekday == i else 0.0 for i in range(5)]
    features.append(day.day / 31.0)
    for lag in LAGS:
        features.append(history[-lag] if len(history) >= lag else float(np.mean(history) if history else 0.0))
    window = history[-5:] if history else [0.0]
    features.append(float(np.mean(window)))
    return features


def forecast_attendance(db: Session, horizon: int = 7, lookback_days: int = 120) -> AttendanceForecast:
    end = date.today()
    start = end - timedelta(days=lookback_days)
    frame = attendance_frame(db, start, end)
    trend = daily_trend(frame, start, end)
    series = [(p.work_date, p.attendance_rate) for p in trend if p.present + p.absent + p.half_day + p.leave > 0]

    if len(series) < MIN_TRAINING_DAYS:
        baseline = round(float(np.mean([v for _, v in series])), 2) if series else 0.0
        points = []
        cursor = end
        while len(points) < horizon:
            cursor += timedelta(days=1)
            if is_working_day(cursor):
                points.append(
                    ForecastPoint(
                        work_date=cursor,
                        predicted_attendance_rate=baseline,
                        lower_bound=max(baseline - 10, 0.0),
                        upper_bound=min(baseline + 10, 100.0),
                    )
                )
        return AttendanceForecast(
            model="baseline_mean",
            trained_on_days=len(series),
            mean_absolute_error=None,
            points=points,
            note=(
                f"Only {len(series)} working days of history are recorded. "
                f"The regression starts once {MIN_TRAINING_DAYS} days exist; until then this is the running average."
            ),
        )

    values = [v for _, v in series]
    dates = [d for d, _ in series]
    X, y = [], []
    for idx in range(max(LAGS), len(values)):
        X.append(_feature_row(dates[idx], values[:idx]))
        y.append(values[idx])
    X_arr, y_arr = np.array(X), np.array(y)

    split = max(int(len(X_arr) * 0.8), len(X_arr) - 20)
    scaler = StandardScaler().fit(X_arr[:split])
    model = Ridge(alpha=1.0).fit(scaler.transform(X_arr[:split]), y_arr[:split])

    mae = None
    if len(X_arr) - split >= 3:
        preds = model.predict(scaler.transform(X_arr[split:]))
        mae = round(float(mean_absolute_error(y_arr[split:], preds)), 2)

    # Refit on everything, then roll forward autoregressively.
    scaler_full = StandardScaler().fit(X_arr)
    model_full = Ridge(alpha=1.0).fit(scaler_full.transform(X_arr), y_arr)
    residual_std = float(np.std(y_arr - model_full.predict(scaler_full.transform(X_arr)))) or 5.0

    history = list(values)
    points: List[ForecastPoint] = []
    cursor = end
    while len(points) < horizon:
        cursor += timedelta(days=1)
        if not is_working_day(cursor):
            continue
        features = scaler_full.transform([_feature_row(cursor, history)])
        prediction = float(np.clip(model_full.predict(features)[0], 0.0, 100.0))
        history.append(prediction)
        points.append(
            ForecastPoint(
                work_date=cursor,
                predicted_attendance_rate=round(prediction, 2),
                lower_bound=round(max(prediction - 1.96 * residual_std, 0.0), 2),
                upper_bound=round(min(prediction + 1.96 * residual_std, 100.0), 2),
            )
        )

    return AttendanceForecast(
        model="ridge_regression",
        trained_on_days=len(values),
        mean_absolute_error=mae,
        points=points,
        note="Weekday, day-of-month, lagged rates (1/2/5 days) and a 5-day rolling mean drive the prediction.",
    )


# --------------------------------------------------------------------------- #
# Model 2: irregular attendance flags (IsolationForest)
# --------------------------------------------------------------------------- #
def _late_minutes(check_in, day_start) -> float:
    """Minutes past the official start time. Missing check-ins contribute nothing."""
    if check_in is None or pd.isna(check_in):
        return 0.0
    local = check_in.time()
    delta = (local.hour * 60 + local.minute) - (day_start.hour * 60 + day_start.minute)
    return float(max(delta, 0))


def employee_behaviour_frame(db: Session, window_days: int = 90) -> pd.DataFrame:
    end = date.today()
    start = end - timedelta(days=window_days)
    frame = attendance_frame(db, start, end)
    employees = list(db.scalars(select(Employee)))
    day_start = workday_start_time()

    leave_rows = db.execute(
        select(LeaveRequest.employee_id, func.sum(LeaveRequest.days))
        .where(
            LeaveRequest.status == LeaveStatus.APPROVED.value,
            LeaveRequest.start_date >= start,
        )
        .group_by(LeaveRequest.employee_id)
    ).all()
    leave_days = {int(eid): int(total or 0) for eid, total in leave_rows}

    records: List[Dict] = []
    for employee in employees:
        subset = frame[frame["employee_id"] == employee.id] if not frame.empty else pd.DataFrame()
        total = len(subset)
        if total == 0:
            absence_rate = avg_minutes = late = variability = 0.0
        else:
            absence_rate = float((subset["status"] == AttendanceStatus.ABSENT.value).mean() * 100)
            avg_minutes = float(subset["worked_minutes"].mean())
            late = float(np.mean([_late_minutes(ci, day_start) for ci in subset["check_in"]]))
            variability = float(subset["worked_minutes"].std(ddof=0) or 0.0)
        records.append(
            {
                "employee_id": employee.id,
                "employee_name": employee.full_name,
                "department": employee.department,
                "days_recorded": total,
                "absence_rate": round(absence_rate, 2),
                "avg_worked_minutes": round(avg_minutes, 1),
                "avg_late_minutes": round(late, 1),
                "minutes_variability": round(variability, 1),
                "leave_days_90d": leave_days.get(employee.id, 0),
            }
        )
    return pd.DataFrame(records)


def irregularity_flags(db: Session, window_days: int = 90, top_n: int = 8) -> List[IrregularityFlag]:
    frame = employee_behaviour_frame(db, window_days)
    if frame.empty or len(frame) < 5 or frame["days_recorded"].sum() == 0:
        return []

    feature_cols = [
        "absence_rate",
        "avg_worked_minutes",
        "avg_late_minutes",
        "minutes_variability",
        "leave_days_90d",
    ]
    X = StandardScaler().fit_transform(frame[feature_cols].to_numpy())
    forest = IsolationForest(n_estimators=200, contamination=0.15, random_state=42).fit(X)
    frame["anomaly_score"] = -forest.score_samples(X)  # higher = more unusual
    frame["is_outlier"] = forest.predict(X) == -1

    codes = {
        e.id: e.employee_code
        for e in db.scalars(select(Employee))
    }

    flagged = frame[frame["is_outlier"]].sort_values("anomaly_score", ascending=False).head(top_n)
    results: List[IrregularityFlag] = []
    for _, row in flagged.iterrows():
        reasons = []
        if row["absence_rate"] > frame["absence_rate"].mean() + 1:
            reasons.append(f"{row['absence_rate']:.0f}% absence")
        if row["avg_late_minutes"] > 10:
            reasons.append(f"{row['avg_late_minutes']:.0f} min average late arrival")
        if row["minutes_variability"] > frame["minutes_variability"].mean():
            reasons.append("uneven daily hours")
        if row["leave_days_90d"] > frame["leave_days_90d"].mean() + 1:
            reasons.append(f"{int(row['leave_days_90d'])} leave days in 90 days")
        results.append(
            IrregularityFlag(
                employee_id=int(row["employee_id"]),
                employee_name=row["employee_name"],
                employee_code=codes.get(int(row["employee_id"]), "—"),
                department=row["department"],
                anomaly_score=round(float(row["anomaly_score"]), 4),
                absence_rate=float(row["absence_rate"]),
                avg_late_minutes=float(row["avg_late_minutes"]),
                leave_days_90d=int(row["leave_days_90d"]),
                reason=", ".join(reasons) or "pattern differs from the rest of the team",
            )
        )
    return results


# --------------------------------------------------------------------------- #
# Employee-level insights
# --------------------------------------------------------------------------- #
def punctuality_score(frame: pd.DataFrame) -> float:
    if frame.empty:
        return 0.0
    day_start = workday_start_time()
    lateness = [_late_minutes(ci, day_start) for ci in frame["check_in"] if ci is not None]
    if not lateness:
        return 0.0
    avg_late = float(np.mean(lateness))
    return round(float(max(0.0, 100.0 - avg_late * 1.5)), 2)
