# Docker Deployment

IdeoUI can be deployed easily using Docker and Docker Compose. This deployment utilizes [Garage](https://garagehq.deuxfleurs.fr/) as a local S3-compatible storage drop-in replacement for Cloudflare R2, using a local directory mount for persistence. It also mounts your configuration file and an SQLite database to ensure your data stays local.

## Setup Instructions

1. **Configure the application:**
   Copy the example config and modify it:
   ```bash
   cp config/config.example.toml config/config.toml
   ```
   Update `config/config.toml` with your DeepSeek/Modal API keys. For `database` and `r2`, you can use the values below to match the default credentials provided in `docker-compose.yml`:

   ```toml
   [database]
   url = "sqlite:////app/db/ideoui.db"

   [r2]
   account_id = ""
   access_key_id = "GKgarageaccesskeyid1234"
   secret_access_key = "garage_secret_key_12345678901234567890"
   bucket_name = "ideoui"
   public_url = "http://localhost:3902/ideoui"
   endpoint_url = "http://garage:3900"
   ```

2. **Run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

   This will build the Vite frontend, copy the built files into the FastAPI static directory, and run the Python backend to serve everything on port `8000`.

## Volumes Mounted

- `./config:/app/config`: Your local configuration file.
- `./db:/app/db`: The local SQLite database folder.
- `./r2_data:/var/lib/garage`: Local storage for Garage (the R2 alternative). Images and zipped previews will be saved here.
- `./garage.toml:/etc/garage.toml`: Configuration for the local Garage S3 mock.

## Services

- **ideoui**: The main application running FastAPI (and serving the pre-built Vite frontend).
- **garage**: Local S3-compatible object storage that mimics R2 for the application.

## Accessing the App

Once running, you can access the application at:
[http://localhost:8000](http://localhost:8000)
