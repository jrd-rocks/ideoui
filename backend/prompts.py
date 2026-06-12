from pathlib import Path

CURR_DIR = Path(__file__).parent.parent.resolve()
PROMPTS_DIR = CURR_DIR / "config" / "upsample-prompts"


def list_templates():
    if not PROMPTS_DIR.exists():
        PROMPTS_DIR.mkdir(parents=True, exist_ok=True)
    templates = [f.stem for f in PROMPTS_DIR.glob("*.txt")]
    if not templates:
        return ["v1"]
    return sorted(templates)


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