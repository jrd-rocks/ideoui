import json
import re
from json_repair import repair_json

def clean_and_reorder_prompt_dict(caption: dict) -> dict:
    if not isinstance(caption, dict):
        return caption

    cleaned = {}
    
    # Preserve aspect_ratio is removed since aspect_ratio is treated purely as metadata
        
    # 1. High level description
    if "high_level_description" in caption:
        cleaned["high_level_description"] = caption["high_level_description"]
        
    # 2. Style description
    if "style_description" in caption and isinstance(caption["style_description"], dict):
        sd = caption["style_description"]
        cleaned_sd = {}
        
        # Determine expected order
        has_photo = "photo" in sd
        has_art_style = "art_style" in sd
        
        if has_art_style and not has_photo:
            expected_order = ("aesthetics", "lighting", "medium", "art_style", "color_palette")
        else:
            expected_order = ("aesthetics", "lighting", "photo", "medium", "color_palette")
            
        for k in expected_order:
            if k in sd:
                cleaned_sd[k] = sd[k]
                
        cleaned["style_description"] = cleaned_sd

    # 3. Compositional deconstruction
    if "compositional_deconstruction" in caption and isinstance(caption["compositional_deconstruction"], dict):
        cd = caption["compositional_deconstruction"]
        cleaned_cd = {}
        
        # Key order: background, elements
        if "background" in cd:
            cleaned_cd["background"] = cd["background"]
            
        if "elements" in cd and isinstance(cd["elements"], list):
            cleaned_elements = []
            for elem in cd["elements"]:
                if isinstance(elem, dict):
                    cleaned_elem = {}
                    elem_type = elem.get("type", "obj")
                    
                    if elem_type == "text":
                        expected_elem_order = ("type", "bbox", "text", "desc", "color_palette")
                    else:
                        expected_elem_order = ("type", "bbox", "desc", "color_palette")
                        
                    for k in expected_elem_order:
                        if k in elem:
                            cleaned_elem[k] = elem[k]
                    cleaned_elements.append(cleaned_elem)
                else:
                    cleaned_elements.append(elem)
            cleaned_cd["elements"] = cleaned_elements
            
        cleaned["compositional_deconstruction"] = cleaned_cd
        
    return cleaned

def clean_and_reorder_prompt_json(prompt_str: str) -> str:
    try:
        # Check if it starts like a JSON string. If not, just return as-is
        trimmed = prompt_str.strip()
        if not (trimmed.startswith("{") or trimmed.startswith("[")):
            return prompt_str
            
        # Parse it
        data = json.loads(trimmed)
        if isinstance(data, dict):
            cleaned_data = clean_and_reorder_prompt_dict(data)
            return json.dumps(cleaned_data, ensure_ascii=False, indent=2)
    except Exception:
        # Try repairing it
        try:
            repaired = repair_json(trimmed)
            data = json.loads(repaired)
            if isinstance(data, dict):
                cleaned_data = clean_and_reorder_prompt_dict(data)
                return json.dumps(cleaned_data, ensure_ascii=False, indent=2)
        except Exception:
            pass
            
    return prompt_str

def clean_json_in_text(text: str) -> str:
    if not isinstance(text, str):
        return text
        
    # 1. Try to find ```json ... ``` codeblock
    match = re.search(r"(```json\s*)([\s\S]*?)(\s*```)", text, re.IGNORECASE)
    if match:
        prefix, json_part, suffix = match.groups()
        cleaned_json = clean_and_reorder_prompt_json(json_part)
        return text[:match.start()] + prefix + cleaned_json + suffix + text[match.end():]
        
    # 2. Try to find any ``` ... ``` codeblock
    match = re.search(r"(```\s*)([\s\S]*?)(\s*```)", text)
    if match:
        prefix, json_part, suffix = match.groups()
        cleaned_json = clean_and_reorder_prompt_json(json_part)
        return text[:match.start()] + prefix + cleaned_json + suffix + text[match.end():]
        
    # 3. Try to find first '{' and last '}'
    start_idx = text.find('{')
    end_idx = text.rfind('}')
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        json_part = text[start_idx:end_idx + 1]
        cleaned_json = clean_and_reorder_prompt_json(json_part)
        return text[:start_idx] + cleaned_json + text[end_idx + 1:]
        
    # 4. Fallback: try cleaning the whole text as JSON
    return clean_and_reorder_prompt_json(text)
