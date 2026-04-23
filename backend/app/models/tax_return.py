from sqlalchemy import Column, Integer, BigInteger, String, Float, ForeignKey, DateTime, Enum, Text
from sqlalchemy.sql import func
from app.database import Base
import enum


class ReturnType(str, enum.Enum):
    extension_4868 = "4868"
    individual_1040 = "1040"
    schedule_c = "schedule_c"
    form_1120s = "1120s"
    form_1065 = "1065"


class ReturnStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    accepted = "accepted"
    rejected = "rejected"


class TaxReturn(Base):
    __tablename__ = "tax_returns"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tax_year = Column(Integer, nullable=False)
    return_type = Column(Enum(ReturnType), nullable=False)
    status = Column(Enum(ReturnStatus), default=ReturnStatus.draft)

    # Financial fields (stored as cents to avoid float issues)
    estimated_tax_cents = Column(BigInteger, default=0)
    tax_owed_cents = Column(BigInteger, default=0)
    refund_amount_cents = Column(BigInteger, default=0)
    total_income_cents = Column(BigInteger, default=0)

    # IRS e-file tracking
    submission_id = Column(String)
    irs_acknowledgment = Column(Text)
    irs_timestamp = Column(DateTime(timezone=True))

    # Raw data (JSON string)
    form_data = Column(Text)    # JSON blob of all form fields

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
