from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Float
from sqlalchemy.sql import func
from app.database import Base
import enum


class LoanStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    denied = "denied"
    disbursed = "disbursed"
    repaid = "repaid"


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tax_return_id = Column(Integer, ForeignKey("tax_returns.id"), nullable=False)
    requested_amount_cents = Column(Integer, nullable=False)   # max 400000 ($4000)
    approved_amount_cents = Column(Integer)
    fee_cents = Column(Integer, default=0)
    status = Column(Enum(LoanStatus), default=LoanStatus.pending)

    # Disbursement
    bank_routing = Column(String)       # encrypted
    bank_account = Column(String)       # encrypted
    disbursed_at = Column(DateTime(timezone=True))

    # Applicant info (JSON blob for lender submission)
    applicant_info = Column(String)

    # Lender reference
    lender_ref_id = Column(String)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
