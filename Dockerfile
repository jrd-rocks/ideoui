# Stage 1: Build the frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend and serve the application
FROM python:3.11-slim
WORKDIR /app

# Install uv for dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY pyproject.toml uv.lock ./

# Install dependencies using uv
RUN uv sync --frozen --no-dev

# Copy backend code
COPY backend/ backend/
COPY server.py ./
COPY alembic.ini ./

# Copy frontend build (vite.config.js sets outDir: '../static', so build output lands in /app/static)
COPY --from=frontend-builder /app/static/ static/

# Make sure virtual environment bin directory is on the path
ENV PATH="/app/.venv/bin:$PATH"

# Run server
CMD ["python", "-u", "server.py"]
