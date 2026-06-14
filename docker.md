# Docker Deployment

You can run IdeoUI and a local S3 mock (Garage) entirely inside Docker. The included `docker-compose.yml` sets up two services:

1. **ideoui**: The main application containing both the frontend (served as static assets) and the FastAPI backend.
2. **garage**: A lightweight, S3-compatible object storage emulator (`dxflrs/garage`), configured automatically to provision an `ideoui` bucket.

## Prerequisites

- Docker
- Docker Compose

## Setup Instructions

1. **Configuration**:
   Copy the example config and adjust it for Docker deployment:

   ```bash
   cp config/config.example.toml config/config.toml
   ```

2. **Required config.toml Overrides**:
   You must update your `config/config.toml` to point to the local Garage container instance. Update your `[r2]` section as follows:

   ```toml
   [r2]
   account_id = "garage" # Garage doesn't need this, but the config parser expects it
   access_key_id = "garage_access_key"
   secret_access_key = "garage_secret_key"
   bucket_name = "ideoui"
   public_url = "http://localhost:3902/ideoui"
   endpoint_url = "http://garage:3900"
   ```

3. **Running**:
   Start the services in the background using docker-compose:

   ```bash
   docker-compose up -d
   ```

## Volume Mounts Explained

The `docker-compose.yml` mounts several local directories to persist data and inject configuration:

- `./config:/app/config`: Mounts the configuration folder so `config.toml` is read properly.
- `./db:/app/db`: Persists the SQLite database so generation history and state remain across container restarts. The backend reads the database from `sqlite:////app/db/ideoui.db`.
- `./r2_data:/var/lib/garage/data`: Persists the Garage S3 object data.
- `./garage.toml:/etc/garage.toml`: Injects the configuration for the Garage node.

## Accessing the App

Once running, access IdeoUI by navigating to:
**http://localhost:8000**
