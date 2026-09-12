from pydantic import BaseModel
from datetime import datetime


class OrganizationCreate(BaseModel):
    name: str
    domain: str | None = None
    subscription_tier: str = "professional"
    description: str | None = None


class OrganizationRead(BaseModel):
    id: int
    name: str
    domain: str | None
    subscription_tier: str
    description: str | None
    created_at: datetime | None

    model_config = {"from_attributes": True}
