from pydantic import BaseModel, Field, AliasChoices
from typing import Optional, List, Dict, Any

class HistoryItemBase(BaseModel):
    timestamp: int
    uuid: str
    parentUuid: Optional[str] = Field(default=None, validation_alias=AliasChoices('parentUuid', 'parent_uuid'))
    rawPrompt: str = Field(validation_alias=AliasChoices('rawPrompt', 'raw_prompt'))
    upsampledPrompt: Optional[str] = Field(default=None, validation_alias=AliasChoices('upsampledPrompt', 'upsampled_prompt'))
    images: List[str]
    params: Dict[str, Any]
    previewsUrl: Optional[str] = Field(default=None, validation_alias=AliasChoices('previewsUrl', 'previews_url'))

class HistoryItemCreate(HistoryItemBase):
    pass

class HistoryItemResponse(HistoryItemBase):
    id: int

    class Config:
        from_attributes = True


class JobCreate(BaseModel):
    raw_prompt: str = Field(validation_alias=AliasChoices("raw_prompt", "rawPrompt"))
    provider: str
    upsampler: Optional[str] = None
    parent_uuid: Optional[str] = Field(default=None, validation_alias=AliasChoices("parent_uuid", "parentUuid"))
    magic_prompt: bool = Field(default=True, validation_alias=AliasChoices("magic_prompt", "magicPrompt"))
    advanced_mode: bool = Field(default=False, validation_alias=AliasChoices("advanced_mode", "advancedMode"))
    is_json_mode: bool = Field(default=False, validation_alias=AliasChoices("is_json_mode", "isJsonMode"))
    provider_params: Dict[str, Any] = Field(default_factory=dict, validation_alias=AliasChoices("provider_params", "providerParams"))
    upsampler_params: Dict[str, Any] = Field(default_factory=dict, validation_alias=AliasChoices("upsampler_params", "upsamplerParams"))
    upsampled_prompt: Optional[str] = Field(default=None, validation_alias=AliasChoices("upsampled_prompt", "upsampledPrompt"))
    draft_json: Optional[Dict[str, Any]] = Field(default=None, validation_alias=AliasChoices("draft_json", "draftJson"))
    chat_messages: Optional[List[Dict[str, Any]]] = Field(default=None, validation_alias=AliasChoices("chat_messages", "chatMessages"))
    job_type: str = Field(default="generation", validation_alias=AliasChoices("job_type", "jobType"))


class ActiveJobResponse(BaseModel):
    id: str
    job_id: str = Field(validation_alias=AliasChoices("job_id", "jobId"))
    uuid: str
    parentUuid: Optional[str] = None
    rawPrompt: str
    upsampledPrompt: Optional[str] = None
    params: Dict[str, Any]
    provider: str
    upsampler: Optional[str] = None
    status: str
    detailedStep: Optional[str] = None
    displayText: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = None
    chatMessages: Optional[List[Dict[str, Any]]] = None
    draftJson: Optional[Dict[str, Any]] = None
    images: Optional[List[str]] = None
    error: Optional[str] = None


class SessionStatePayload(BaseModel):
    tab_uuid: str = Field(validation_alias=AliasChoices("tab_uuid", "tabUuid"))
    active_job_id: Optional[str] = Field(default=None, validation_alias=AliasChoices("active_job_id", "activeJobId"))
    route: str = "#/"
    form_state: Dict[str, Any] = Field(default_factory=dict, validation_alias=AliasChoices("form_state", "formState"))
    draft_json: Optional[Dict[str, Any]] = Field(default=None, validation_alias=AliasChoices("draft_json", "draftJson"))


class SessionStateResponse(SessionStatePayload):
    lastUpdated: Optional[str] = None
