import json
import re

from backend.utils import clean_and_reorder_prompt_json


def extract_json_from_text(text: str) -> str:
    match = re.search(r"```json\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if match:
        return match.group(1).strip()

    match = re.search(r"```\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()

    start_idx = text.find("{")
    end_idx = text.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        return text[start_idx:end_idx + 1]

    return text.strip()


def strict_json_prompt(text: str) -> str:
    extracted = extract_json_from_text(text)
    cleaned = clean_and_reorder_prompt_json(extracted)
    try:
        json.loads(cleaned)
    except Exception as exc:
        raise ValueError("Assistant did not return valid layout JSON.") from exc
    return cleaned
