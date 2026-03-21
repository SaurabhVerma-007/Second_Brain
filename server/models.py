from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from pgvector.sqlalchemy import Vector
from server.db import Base

EMBEDDING_DIM = 2048

class Document(Base):
    __tablename__ = "documents"

    id         = Column(Integer, primary_key=True, index=True)
    filename   = Column(String, nullable=False)
    fileType   = Column(String, nullable=False)
    content    = Column(Text, nullable=False)
    embedding  = Column(Vector(EMBEDDING_DIM), nullable=True)
    uploadDate = Column(DateTime, default=datetime.utcnow)