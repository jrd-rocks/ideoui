# Stage 1: Build Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM python:3.11-slim
WORKDIR /app

# Install uv
RUN pip install uv

# Install dependencies via uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy backend code
COPY backend/ backend/
COPY server.py alembic.ini ./

# Copy built frontend assets from the static folder
COPY --from=frontend-build /app/static /app/static

# Use the virtual environment created by uv
ENV PATH="/app/.venv/bin:$PATH"

# Run the server
CMD ["python", "-u", "server.py"]
