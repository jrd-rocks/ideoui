# TOML-Driven Generic Provider System

IdeoUI uses a configuration-driven system where each provider is declared either as a `[section]` entry inside `config/config.toml` (preferred) or as a `.toml` file in `config/providers/`. Both forms are equivalent and resolve through the same two maximally generic engines — there are no hardcoded provider classes.

## Naming Conventions & File Layout

```
config/
├── config.toml                        # infra (database, r2, [auth]) + provider [entries] — private
├── config.example.toml                # committed template, no secrets
└── providers/
    ├── _modal.toml                    # base — extended by Modal diffusion entries/files
    ├── _deepseek.toml                 # base — extended by DeepSeek
    ├── diffusion_modal.example.toml   # selectable file example — extends _modal.toml
    ├── llm_deepseek.toml              # selectable — extends _deepseek.toml
    └── llm_ideogram_magic.toml        # selectable — standalone
```

| Prefix | Meaning | Selectable in UI? |
|---|---|---|
| `_*` | Base / abstract config | No — only inherited from |
| `llm_*` | LLM / text endpoint | Yes — upsampler dropdown |
| `diffusion_*` | Image generation endpoint | Yes — generation dropdown |

Providers can also be declared as `[section]` entries inside `config/config.toml` (marked `type = "entry"`) — the preferred form for credential/display variants. The section name becomes the provider id. See [Provider Entries](#provider-entries-preferred) below.

---

## Provider Entries (preferred)

Instead of one file per provider, declare providers as `[section]` tables inside `config/config.toml`, marked with `type = "entry"`. This is the preferred format for providers that differ only in credentials and display metadata (e.g. multiple Modal deployments). The section name becomes the provider id.

```toml
[my_endpoint]
type = "entry"                          # marks this section as a provider
enabled = true                          # optional; false skips loading
kind = "diffusion"                      # becomes the merged config's `type`
extends = "providers/_modal.toml"       # base template (relative to config.toml)
display_name = "fp8"                    # short label
fullname = "Modal fp8"       # explicit; entries have no filename
url = "socks://proxy:8391|https://….modal.run"   # flat at entry root → mapped into [auth].url

[my_entry.auth]
modal_key = "wk-…"
modal_secret = "ws-…"
```

| Field | Purpose |
|---|---|
| `type = "entry"` | Marker — distinguishes providers from infra sections (`[database]`, `[r2]`, `[auth]`) |
| `kind` | Maps to the merged config's `type` (`diffusion` or `llm`) |
| `extends` | Base template path, relative to `config.toml` (e.g. `providers/_modal.toml`) |
| `enabled` | `false` skips this provider; defaults to `true` |
| `display_name` / `fullname` | Explicit naming (entries have no filename to derive these from) |
| `url` (flat) | Convenience: mapped into `[auth].url` so the `http` engine finds it |
| `[<entry>.auth]` | Credentials, merged onto the base `[auth]` and available to `{{auth.X}}` templates |

Entries and file-based providers coexist and are fully equivalent — use whichever fits. Entries are kind-agnostic and work for `llm` providers exactly the same way.

---

## Two Generic Engines

The TOML does all the specialization, routing to one of two generic engines:

### 1. `http` engine
Generic REST API engine. Handles **any** HTTP request/response cycle. Used for Modal diffusion endpoints, Ideogram magic prompt, or any future REST API.

What the TOML controls:
- **Auth**: `[auth.headers]` table for arbitrary header key-value pairs
- **Request**: method, URL construction, body format (JSON body vs query params), field mapping from internal params to API fields
- **Response**: format (JSON, pickle, base64 list), field extraction via dot-path (`json_prompt`, `images[0].url`)
- **Streaming**: enabled/disabled, line prefix, event type field, event-to-handler mapping, result extraction, error field

### 2. `chat` engine
OpenAI-compatible chat completions engine. Handles **any** API that follows the messages array pattern. Used for DeepSeek or any OpenAI-compatible LLM.

What the TOML controls:
- **Auth**: same as http engine (`[auth.headers]`)
- **Model**: name, extra payload fields (reasoning_effort, thinking, temperature, etc.)
- **Request**: base URL + path, extra body fields
- **Streaming**: enabled/disabled, SSE prefix, done signal, delta path, content/reasoning field names
- **Capabilities**: `allow_chat`, template prompt support

The difference from `http` is structural: `chat` always takes a `messages: [{role, content}]` array, handles template rendering (system/user prompts), and accumulates streaming deltas across choices. This is a fundamentally different request/response pattern from a generic REST call.

---

## TOML Schema Design

### Inheritance
```toml
extends = "_modal.toml"
# OR
extends = ["_modal.toml", "../config.toml"]
```
Single-level, recursive dict merge. Child keys override parent. Nested tables merged key-by-key. If an array is provided, parents are merged from left to right, and finally the child config overrides them all.

`extends` paths resolve relative to the file that declares them: file-based providers (in `config/providers/`) resolve relative to that directory, while `[section]` entries in `config/config.toml` resolve relative to `config/` — e.g. `extends = "providers/_modal.toml"`.

### Template Resolution
Values wrapped in `{{section.key}}` are templates resolved as a **last pass** after TOML hierarchy merge. This means a base file can define templates that reference keys the child provides.

Three namespaces:

| Namespace | Source | Example | When resolved |
|---|---|---|---|
| `{{auth.X}}` | `[auth]` section of merged config | `{{auth.api_key}}`, `{{auth.proxy_auth_key}}` | At request time (after merge) |
| `{{inputs.X}}` | Normalized UI parameters | `{{inputs.seed}}`, `{{inputs.sampler_preset}}` | At execution time |
| `{{runtime.X}}` | Job execution context | `{{runtime.prompt}}`, `{{runtime.raw_prompt}}` | At execution time |

**Resolution order:**
1. Load base TOML (if `extends` is set)
2. Load child TOML
3. Deep merge (child overrides parent at every level)
4. Resolve `{{auth.X}}` templates from the merged `[auth]` section
5. At execution time, resolve `{{inputs.X}}` from normalized params and `{{runtime.X}}` from job context

---

## Examples

### Diffusion base: `_modal.toml` (engine = `http`)
```toml
display_name = "Modal"
type = "diffusion"
engine = "http"
max_simultaneous = 2

[auth]
url = ""
proxy_auth_key = ""
proxy_auth_secret = ""
[auth.headers]
Modal-Key = "{{auth.proxy_auth_key}}"
Modal-Secret = "{{auth.proxy_auth_secret}}"

[request]
method = "GET"
format = "query_params"
timeout = 600
[request.fields]
prompt = "{{runtime.prompt}}"
seed = "{{inputs.seed}}"
width = "{{inputs.width}}"
height = "{{inputs.height}}"
num_images_per_prompt = "{{inputs.num_images_per_prompt}}"
prompt_upsampling = "{{inputs.prompt_upsampling}}"
sampler_preset = "{{inputs.sampler_preset}}"
[request.optional_fields]
n_steps = "{{inputs.n_steps}}"
guidance_scale = "{{inputs.guidance_scale}}"

[response]
format = "pickle"
images_field = ""
images_encoding = "bytes"

[streaming]
enabled = true
format = "sse"
data_prefix = "data: "
type_field = "type"
done_signal = ""
[streaming.events]
status = "status"
step = "step"
complete = "complete"
error = "error"
[streaming.result]
field = "images"
encoding = "base64"
[streaming.error]
field = "message"

[inputs.sampler_preset]
label = "Sampler Preset"
type = "select"
default = "V4_QUALITY_48"
[[inputs.sampler_preset.options]]
value = "V4_QUALITY_48"
label = "Quality (48 steps)"
[[inputs.sampler_preset.options]]
value = "V4_DEFAULT_20"
label = "Default (20 steps)"
[[inputs.sampler_preset.options]]
value = "V4_TURBO_12"
label = "Turbo (12 steps)"
[[inputs.sampler_preset.options]]
value = "custom"
label = "Custom Parameters"

[inputs.aspect_ratio]
label = "Aspect Ratio"
type = "aspect_ratio"
default = "1:1"

[inputs.scale]
label = "Resolution Scale"
type = "select"
default = "standard"
[[inputs.scale.options]]
value = "standard"
label = "Standard"
[[inputs.scale.options]]
value = "2k"
label = "2K (2x dimensions)"
[[inputs.scale.options]]
value = "4k"
label = "4K (4x dimensions)"

[inputs.steps]
label = "Steps"
type = "number"
min = 1
max = 150
default = 48
visible_when = { sampler_preset = "custom" }

[inputs.guidance]
label = "Guidance Scale"
type = "number"
min = 1
max = 20
step = 0.5
default = 7
visible_when = { sampler_preset = "custom" }

[inputs.image_count]
label = "Number of Images"
type = "number"
min = 1
max = 4
default = 4

[inputs.seed]
label = "Seed"
type = "number"
min = 0
default = 0
placeholder = "0 (random)"

[[layout]]
fields = [{ id = "sampler_preset", col_span = 1 }, { id = "aspect_ratio", col_span = 1 }]
[[layout]]
fields = [{ id = "scale", col_span = 2 }]
[[layout]]
fields = [{ id = "steps", col_span = 1 }, { id = "guidance", col_span = 1 }]
[[layout]]
fields = [{ id = "image_count", col_span = 1 }, { id = "seed", col_span = 1 }]

[sizes]
"1:1" = [1024, 1024]
"16:9" = [1344, 768]
"9:16" = [768, 1344]
"5:4" = [1152, 896]
"4:5" = [896, 1152]
"3:2" = [1216, 832]
"2:3" = [832, 1216]
```

### LLM base: `_deepseek.toml` (engine = `chat`)
```toml
display_name = "DeepSeek"
type = "llm"
engine = "chat"
max_simultaneous = 3
allow_chat = true

[auth]
api_key = ""
[auth.headers]
Authorization = "Bearer {{auth.api_key}}"

[request]
method = "POST"
base_url = "https://api.deepseek.com"
path = "/chat/completions"
format = "json_body"
timeout = 180

[model]
name = "deepseek-reasoner"
[model.extra]
reasoning_effort = "high"
thinking = { type = "enabled" }

[streaming]
enabled = true
format = "sse"
data_prefix = "data:"
done_signal = "[DONE]"
[streaming.delta]
path = "choices[].delta"
content_field = "content"
reasoning_field = "reasoning_content"
```

### Ideogram Magic Prompt: `llm_ideogram_magic.toml` (engine = `http`)
```toml
display_name = "Ideogram Magic Prompt"
type = "llm"
engine = "http"
max_simultaneous = 2
allow_chat = false
needs_user_prompt = false

[auth]
api_key = ""
[auth.headers]
Api-Key = "{{auth.api_key}}"

[request]
method = "POST"
base_url = "https://api.ideogram.ai"
path = "/v1/ideogram-v4/magic-prompt"
format = "json_body"
timeout = 60
[request.fields]
text_prompt = "{{runtime.raw_prompt}}"
aspect_ratio = "{{inputs.aspect_ratio}}"

[response]
format = "json"
content_field = "json_prompt"
aspect_ratio_field = "aspect_ratio"

[streaming]
enabled = false

[inputs.aspect_ratio]
label = "Aspect Ratio"
type = "select"
default = "AUTO"
[[inputs.aspect_ratio.options]]
value = "AUTO"
label = "Auto (model selects)"
[[inputs.aspect_ratio.options]]
value = "1x1"
label = "1:1"
[[inputs.aspect_ratio.options]]
value = "16x9"
label = "16:9"
[[layout]]
fields = [{ id = "aspect_ratio", col_span = 2 }]
```
