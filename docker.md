# Docker Deployment

IdeoUI can be deployed easily using Docker and Docker Compose. This deployment utilizes a local S3-compatible storage setup (MinIO) as a drop-in replacement for Cloudflare R2, using a local directory mount for persistence. It also mounts your configuration file and an SQLite database to ensure your data stays local.

## Setup Instructions

1. **Configure the application:**
   Copy the example config and modify it:
   ```bash
   cp config/config.example.toml config/config.toml
   ```
   Update `config/config.toml` with your DeepSeek/Modal API keys. For `database` and `r2`, you can use the values below to match the Docker Compose setup:

   ```toml
   [database]
   url = "sqlite:///config/ideoui.db"

   [r2]
   account_id = "minio-local"  # This is ignored by the endpoint override
   access_key_id = "minioadmin"
   secret_access_key = "minioadmin"
   bucket_name = "ideoui"
   public_url = "http://localhost:9000/ideoui"
   ```
   *Note: In the Docker environment, the R2 endpoint URL is overridden via environment variables in `docker-compose.yml` to point to the local MinIO instance.*

2. **Run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

   This will build the Vite frontend, copy the built files into the FastAPI static directory, and run the Python backend to serve everything on port `8000`.

## Volumes Mounted

- `./config:/app/config`: Your local configuration file and the local SQLite database.
- `./r2_data:/data`: Local storage for MinIO (the R2 alternative). Images and zipped previews will be saved here.

## Services

- **ideoui**: The main application running FastAPI (and serving the pre-built Vite frontend).
- **minio**: Local S3-compatible object storage that mimics R2 for the application.

## Accessing the App

Once running, you can access the application at:
[http://localhost:8000](http://localhost:8000)

MinIO console (for viewing uploaded files):
[http://localhost:9001](http://localhost:9001) (Credentials: `minioadmin` / `minioadmin`)
