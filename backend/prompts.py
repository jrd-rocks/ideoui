from pathlib import Path

CURR_DIR = Path(__file__).parent.parent.resolve()
PROMPTS_DIR = CURR_DIR / "config" / "upsample-prompts"


def load_meta(name: str) -> dict:
    v_path = PROMPTS_DIR / f"{name}.txt"
    if not v_path.exists():
        return {}
    try:
        with open(v_path, "r", encoding="utf-8") as f:
            raw = f.read()
        
        meta_lines = []
        in_meta = False
        for line in raw.splitlines():
            stripped = line.strip()
            if stripped.startswith("[") and stripped.endswith("]"):
                if stripped.lower() == "[meta]":
                    in_meta = True
                else:
                    in_meta = False
            elif in_meta:
                meta_lines.append(line)
        
        meta = {}
        for line in meta_lines:
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip().lower()] = v.strip()
        return meta
    except Exception:
        return {}


def list_templates():
    if not PROMPTS_DIR.exists():
        PROMPTS_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(list(PROMPTS_DIR.glob("*.txt")), key=lambda f: f.stem)
    if not files:
        return [{"id": "v1", "fullname": "Standard V1", "abbreviation": "v1"}]
        
    results = []
    for f in files:
        meta = load_meta(f.stem)
        results.append({
            "id": f.stem,
            "fullname": meta.get("fullname", f.stem),
            "abbreviation": meta.get("abbreviation", f.stem),
        })
    return results


def load_template_prompts(name: str):
    v_path = PROMPTS_DIR / f"{name}.txt"
    if not v_path.exists():
        return {
            "system": "You convert a natural-language user idea into a structured JSON caption an image renderer can consume. Output a single-line minified JSON with keys: aspect_ratio, high_level_description, compositional_deconstruction.",
            "user": "TARGET IMAGE ASPECT RATIO: {{aspect_ratio}} (width:height).\nUser idea: {{original_prompt}}"
        }

    with open(v_path, "r", encoding="utf-8") as f:
        raw = f.read()

    sections = {}
    current = None
    lines = []
    for line in raw.splitlines():
        stripped = line.strip()
        if stripped.startswith("[") and stripped.endswith("]") and " " not in stripped:
            if current is not None:
                sections[current] = "\n".join(lines).strip()
            current = stripped[1:-1].strip().lower()
            lines = []
        else:
            lines.append(line)
    if current is not None:
        sections[current] = "\n".join(lines).strip()

    return {
        "system": sections.get("system", ""),
        "user": sections.get("user", "TARGET IMAGE ASPECT RATIO: {{aspect_ratio}} (width:height).\nUser idea: {{original_prompt}}")
    }