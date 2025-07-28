from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class FieldBase(BaseModel):
    """Base field model with common attributes."""
    name: str = Field(..., description="Name of the field")
    address: str = Field(..., description="Address of the field")

class FieldCreate(FieldBase):
    """Model for creating a new field."""
    pass

class FieldUpdate(BaseModel):
    """Model for updating a field."""
    name: Optional[str] = Field(None, description="Name of the field")
    address: Optional[str] = Field(None, description="Address of the field")

class FieldResponse(FieldBase):
    """Model for field response with additional metadata."""
    id: str = Field(..., description="Unique identifier of the field")
    created_at: datetime = Field(..., description="Timestamp when the field was created")
    updated_at: datetime = Field(..., description="Timestamp when the field was last updated")

    class Config:
        from_attributes = True