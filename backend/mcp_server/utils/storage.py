"""
Supabase Storage abstraction for LayoutIR.

Handles uploading, downloading, and URL generation for all document
artifacts stored in a public Supabase Storage bucket.
"""

import mimetypes
from pathlib import Path

from supabase import create_client, Client


BUCKET = "layoutir"


def _get_client() -> Client:
    """Create a Supabase client from environment variables."""
    import os
    from dotenv import load_dotenv

    load_dotenv()

    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


_supabase: Client | None = None


def _client() -> Client:
    """Singleton Supabase client."""
    global _supabase
    if _supabase is None:
        _supabase = _get_client()
        _ensure_bucket()
    return _supabase


def _ensure_bucket() -> None:
    """Create the storage bucket if it doesn't exist."""
    try:
        _supabase.storage.get_bucket(BUCKET)
    except Exception:
        _supabase.storage.create_bucket(
            BUCKET,
            options={"public": True},
        )


def _guess_content_type(path: str) -> str:
    """Guess MIME type from file extension."""
    ct, _ = mimetypes.guess_type(path)
    return ct or "application/octet-stream"


# ── Upload helpers ──────────────────────────────────────────────────

def upload_file(storage_path: str, local_path: Path) -> str:
    """Upload a local file and return its public URL."""
    content_type = _guess_content_type(str(local_path))
    with open(local_path, "rb") as f:
        _client().storage.from_(BUCKET).upload(
            path=storage_path,
            file=f,
            file_options={"content-type": content_type, "upsert": "true"},
        )
    return get_public_url(storage_path)


def upload_bytes(storage_path: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    """Upload raw bytes and return the public URL."""
    _client().storage.from_(BUCKET).upload(
        path=storage_path,
        file=data,
        file_options={"content-type": content_type, "upsert": "true"},
    )
    return get_public_url(storage_path)


def upload_text(storage_path: str, text: str, content_type: str = "text/plain") -> str:
    """Upload a text string and return the public URL."""
    return upload_bytes(storage_path, text.encode("utf-8"), content_type)


# ── Download helpers ────────────────────────────────────────────────

def download_text(storage_path: str) -> str:
    """Download a file as text."""
    data = _client().storage.from_(BUCKET).download(storage_path)
    return data.decode("utf-8")


def download_bytes(storage_path: str) -> bytes:
    """Download a file as raw bytes."""
    return _client().storage.from_(BUCKET).download(storage_path)


# ── URL helpers ─────────────────────────────────────────────────────

def get_public_url(storage_path: str) -> str:
    """Return the public URL for a stored object."""
    return _client().storage.from_(BUCKET).get_public_url(storage_path)


# ── Bulk upload ─────────────────────────────────────────────────────

def upload_directory(document_id: str, local_dir: Path) -> dict[str, str]:
    """
    Upload an entire output directory to Supabase Storage.

    Returns a mapping of relative_path → public_url for every file uploaded.
    """
    url_map: dict[str, str] = {}

    for local_file in local_dir.rglob("*"):
        if not local_file.is_file():
            continue

        relative = local_file.relative_to(local_dir).as_posix()
        storage_path = f"{document_id}/{relative}"
        public_url = upload_file(storage_path, local_file)
        url_map[relative] = public_url

    return url_map
