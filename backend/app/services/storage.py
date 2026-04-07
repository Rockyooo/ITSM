# ═══════════════════════════════════════════════════════════════
# app/services/storage.py
# Storage adapter — abstrae el proveedor de almacenamiento.
# Hoy: local/R2. Mañana: S3, MinIO, Supabase Storage.
# Para agregar un nuevo provider: implementar StorageBackend.
# ═══════════════════════════════════════════════════════════════
import os, uuid, hashlib
from abc import ABC, abstractmethod
from pathlib import Path

# ── Tipos permitidos — whitelist estricta ──────────────────────
ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain", "text/csv",
    "application/zip",
}

ALLOWED_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
    ".pdf", ".xls", ".xlsx", ".doc", ".docx",
    ".txt", ".csv", ".zip",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def validate_file(filename: str, content_type: str, size: int) -> tuple[bool, str]:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Extensión no permitida: {ext}"
    if content_type not in ALLOWED_MIME_TYPES:
        return False, f"Tipo de archivo no permitido: {content_type}"
    if size > MAX_FILE_SIZE:
        return False, f"Archivo muy grande. Máximo 10MB"
    # Prevenir path traversal
    safe_name = Path(filename).name
    if ".." in safe_name or "/" in safe_name or "\\" in safe_name:
        return False, "Nombre de archivo inválido"
    return True, ""

def safe_filename(original: str) -> str:
    """Genera nombre seguro: UUID + extensión original."""
    ext = Path(original).suffix.lower()
    return f"{uuid.uuid4().hex}{ext}"


class StorageBackend(ABC):
    """Interfaz base — todos los providers deben implementar esto."""

    @abstractmethod
    async def upload(self, file_data: bytes, filename: str, content_type: str) -> str:
        """Sube archivo y retorna la URL de acceso."""
        pass

    @abstractmethod
    async def delete(self, file_url: str) -> bool:
        """Elimina archivo. Retorna True si exitoso."""
        pass

    @abstractmethod
    async def get_url(self, filename: str) -> str:
        """Retorna URL pública o presigned URL."""
        pass


class LocalStorage(StorageBackend):
    """
    Storage local — para desarrollo y Railway MVP.
    Guarda en /app/uploads/ dentro del contenedor.
    NOTA: Railway resetea el filesystem en cada deploy.
    Usar solo para pruebas — migrar a R2 para producción.
    """

    def __init__(self, base_path: str = "/app/uploads"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def upload(self, file_data: bytes, filename: str, content_type: str) -> str:
        file_path = self.base_path / filename
        with open(file_path, "wb") as f:
            f.write(file_data)
        base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
        return f"{base_url}/uploads/{filename}"

    async def delete(self, file_url: str) -> bool:
        filename = file_url.split("/")[-1]
        file_path = self.base_path / filename
        if file_path.exists():
            file_path.unlink()
            return True
        return False

    async def get_url(self, filename: str) -> str:
        base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
        return f"{base_url}/uploads/{filename}"


class R2Storage(StorageBackend):
    """
    Cloudflare R2 — compatible con S3 API.
    Variables requeridas:
      CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_R2_ACCESS_KEY,
      CLOUDFLARE_R2_SECRET_KEY, CLOUDFLARE_R2_BUCKET,
      CLOUDFLARE_R2_PUBLIC_URL
    """

    def __init__(self):
        import boto3
        self.client = boto3.client(
            "s3",
            endpoint_url=os.getenv("CLOUDFLARE_R2_ENDPOINT"),
            aws_access_key_id=os.getenv("CLOUDFLARE_R2_ACCESS_KEY"),
            aws_secret_access_key=os.getenv("CLOUDFLARE_R2_SECRET_KEY"),
        )
        self.bucket = os.getenv("CLOUDFLARE_R2_BUCKET", "itsm-attachments")
        self.public_url = os.getenv("CLOUDFLARE_R2_PUBLIC_URL", "")

    async def upload(self, file_data: bytes, filename: str, content_type: str) -> str:
        self.client.put_object(
            Bucket=self.bucket,
            Key=filename,
            Body=file_data,
            ContentType=content_type,
        )
        return f"{self.public_url}/{filename}"

    async def delete(self, file_url: str) -> bool:
        filename = file_url.split("/")[-1]
        self.client.delete_object(Bucket=self.bucket, Key=filename)
        return True

    async def get_url(self, filename: str) -> str:
        return f"{self.public_url}/{filename}"


def get_storage() -> StorageBackend:
    """
    Factory — selecciona el backend según STORAGE_BACKEND env var.
    Valores: 'local' (default), 'r2', 's3', 'minio'
    Para agregar nuevo provider: crear clase + agregar aquí.
    """
    backend = os.getenv("STORAGE_BACKEND", "local")
    if backend == "r2":
        return R2Storage()
    return LocalStorage()
