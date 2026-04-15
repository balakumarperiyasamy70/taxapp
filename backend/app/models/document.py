from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tax_return_id = Column(Integer, ForeignKey("tax_returns.id"), nullable=True)
    filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)    # path on VPS
    doc_type = Column(String)                       # W2, 1099, ID, etc.
    file_size = Column(Integer)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
