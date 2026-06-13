# IdeoUI - Ideogram 4 Studio 🎨🚀

**IdeoUI** (Ideogram 4 Studio) is a private, professional image-generation workspace and visual composition director. It is designed to harness the advanced prompt structure of the **Ideogram v4** model, combined with **DeepSeek** (via `deepseek-reasoner`) for smart prompt upsampling and composition assistance.

The studio replaces standard text-prompt limitations with an interactive, **JSON-based layout editor**, allowing you to drag visual bounding boxes directly onto a canvas, configure specific spatial styling details, and generate high-fidelity images using a configurable, endpoint-agnostic generation backend.

---

## 🌟 Key Features

*   **Advanced Layout Director (Visual Canvas)**: Drag, resize, duplicate, and delete visual bounding boxes over a canvas to position characters, objects, or text fields precisely where you want them.
*   **Prompt-to-JSON Upsampling**: Write natural language descriptions and let DeepSeek compile them into structured Ideogram 4 layout JSON formats behind the scenes.
*   **Comprehensive Parameter Sidebar**:
    *   **Composition Panel**: Fine-tune aesthetics tags (e.g., `dark-fantasy`, `tactical-rpg`), lighting styles (`moody overhead spotlight`), mediums (`3d_render`, `photograph`), specific style category presets, custom hex color palettes (up to 16 colors), and background details.
    *   **Raw JSON Panel**: View and edit the generated structured JSON payload directly with real-time UI state sync.
*   **Endpoint-Agnostic Design**: Built to be backend-agnostic, easily communicating with any compatible image generation runner configured in your system.
*   **Real-time Generation Previews**: Displays real-time generation progress and intermediate image previews streamed directly to the UI via Server-Sent Events (SSE) and WebSockets.
*   **Robust State Management**: Built-in debounced synchronization and UI input locks to prevent typing lag and network echo race conditions.
*   **Persistent Generation History**: Browse, review, or fork previous generations from a persistent SQLite/PostgreSQL-backed local database with a full lightbox viewer.

---

## 📸 UI Walkthrough

The interface is structured as a premium, responsive workspace designed for seamless visual control:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [✓] JSON Mode         ┌──────────────────────────────────────┐  [ Composition ] [JSON] │
│                       │  Advanced Layout Director            │                         │
│ ASPECT RATIO          │  Drag boxes to compose...            │  HIGH LEVEL DESCRIPTION │
│ [ 1:1 (1024x1024) ] ▼ │ ┌──────────────────────────────────┐ │  [ An ornate fantasy ]  │
│                       │ │ ┌─────────┐                      │ │                         │
│ SEED                  │ │ │ 01      │                      │ │  AESTHETICS             │
│ [ 0               ]   │ │ │         │    ┌─────────┐       │ │  [ dark-fantasy ] [rpg] │
│                       │ │ └─────────┘    │ 02      │       │ │                         │
│ [ Generate ]          │ │                └─────────┘       │ │  MEDIUM                 │
│                       │ └──────────────────────────────────┘ │  [ 3d_render ]          │
│                       │  [Undo] [Redo] [Duplicate] [Delete]  │                         │
│                       │  [+ Add Element Box]                 │  COLOR PALETTE          │
│                       └──────────────────────────────────────┘  [ #121315 ] [ #9CB0C3 ]│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1.  **Left Sidebar (Inference & Presets)**: Control generation variables including aspect ratio presets, generation seeds (0 for random), and toggle JSON generation mode.
2.  **Central Workspace (Visual Director)**:
    *   **Interactive Canvas**: Superimposes draggable and resizable element boxes on top of your current output or background composition.
    *   **Canvas Controls**: Quickly `Undo`, `Redo`, `Duplicate`, or `Delete` boxes, or add new element boxes using the custom `+ Add Element Box` action.
    *   **Tabs**: Easily switch between `Current Output` and a comprehensive generation `History` (with support for full lightbox inspection).
3.  **Right Sidebar (Detailed Fields & Raw Code)**:
    *   **Composition Tab**: Modify the High Level Description, include Style Descriptions, define Aesthetics, Lighting, Medium, Style Category, Art Style Details, Style Color Palette, and Scene Background.
    *   **Raw JSON Tab**: Gain full developer access to the underlying structured Ideogram 4 JSON layout payload for direct modifications.

---

## 📁 Repository Layout

```filepath
├── frontend/                   # Reactive Lit + Vite web UI
├── backend/                    # FastAPI backend (SQLAlchemy, Alembic, WebSockets)
│   ├── migrations/             # Alembic database migrations
│   └── providers/              # API connectors (DeepSeek, external endpoints)
├── config/
│   ├── config.example.toml     # Template configuration
│   └── config.toml             # Local configuration (secrets, R2/DB/API keys)
├── static/                     # Compiled frontend assets (git-ignored)
├── server.py                   # Local Uvicorn backend launcher
├── alembic.ini                 # Alembic configuration
└── pyproject.toml              # Backend Python dependencies
```

---

## 🛠️ Installation & Setup

### Prerequisites
*   **Python**: Version 3.11 or newer.
*   **Node.js**: Long-Term Support (LTS) version.
*   **Package Managers**: [uv](https://github.com/astral-sh/uv) (recommended for Python package management) and `npm`.

### 1. Configuration Setup
Clone the example configuration and fill in your credential values (database URL, DeepSeek API key, Cloudflare R2 configurations, and inference backend endpoints):

```bash
cp config/config.example.toml config/config.toml
```

### 2. Backend Setup
Synchronize Python virtual environment and dependencies using `uv`:

```bash
uv sync
```

### 3. Frontend Setup
Navigate to the frontend package directory and install Node dependencies:

```bash
cd frontend
npm install
```

---

## 🚀 Running the App Locally

### Development Mode (Concurrent Vite & FastAPI)
Run the concurrent runner from the `frontend/` folder. This starts both the **Vite Dev Server** (on port `5173`) and the **FastAPI Backend** (on port `8000`) with auto-reloads and API proxying:

```bash
cd frontend
npm run dev
```

### Standalone Backend Execution
If you only need to run the FastAPI service (for external frontends or production serving):

```bash
uv run python -u server.py
```

### Building the Frontend for Production
To compile and bundle the Lit components into the backend's static directory:

```bash
cd frontend
npm run build
```

---

## 🧪 Verification & Development

To verify compiling and imports across the python backend:

```bash
uv run python -m compileall backend backend/migrations/versions
uv run python -c "import backend.main; print('backend import ok')"
```

---

## 🔒 Security & Deployment Notes

*   **Private Workspace**: IdeoUI is intended as a single-user private studio. It does **not** include an authentication system out-of-the-box. Ensure you configure proper authentication and secure firewalls before exposing this service publicly.
*   **Database**: Alembic runs database migrations automatically upon server boot. Customize the connection string inside `config.toml` to connect to your PostgreSQL or SQLite instance.
