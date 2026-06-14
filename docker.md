# Docker Deployment

IdeoUI can be deployed easily using Docker and Docker Compose. This deployment utilizes [Garage](https://garagehq.deuxfleurs.fr/) as a local S3-compatible storage drop-in replacement for Cloudflare R2, using a local directory mount for persistence. It also mounts your configuration file and an SQLite database to ensure your data stays local.

## Setup Instructions

1. **Configure the application:**
   Copy the example config and modify it:
   ```bash
   cp config/config.example.toml config/config.toml
   ```
   Update `config/config.toml` with your DeepSeek/Modal API keys. For `database` and `r2`, you can use the values below to match the Docker Compose setup:

   ```toml
   [database]
   url = "sqlite:///app/db/ideoui.db"

   [r2]
   account_id = "garage-local"  # This is ignored by the endpoint override
   access_key_id = "INSERT_YOUR_GARAGE_ACCESS_KEY"
   secret_access_key = "INSERT_YOUR_GARAGE_SECRET_KEY"
   bucket_name = "ideoui"
   public_url = "http://localhost:3902/ideoui"
   ```
   *Note: To get your `access_key_id` and `secret_access_key` for Garage, view the logs of the `garage-init` container after it finishes initializing:*
   ```bash
   docker-compose logs garage-init
   ```
   *Copy the generated `Key ID` and `Secret key` into your `config.toml` and then restart the `ideoui` service.*

   *Note: In the Docker environment, the R2 endpoint URL is overridden via environment variables in `docker-compose.yml` to point to the local Garage instance.*

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
- **garage-init**: A setup container that provisions the Garage bucket and access keys.

## Accessing the App

Once running, you can access the application at:
[http://localhost:8000](http://localhost:8000)
