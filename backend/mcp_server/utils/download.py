"""
HTTP download helper for LayoutIR MCP Server.

Downloads files from any public URL to a temporary directory
so the LayoutIR pipeline can process them locally.
"""

import tempfile
from pathlib import Path
from urllib.parse import urlparse, unquote

import httpx


def download_to_temp(url: str, timeout: float = 120.0) -> Path:
    """
    Download a file from a URL into a temporary directory.

    Returns the path to the downloaded file. The caller is responsible
    for cleaning up the temp dir when done (use `shutil.rmtree`).
    """
    parsed = urlparse(url)
    filename = unquote(Path(parsed.path).name) or "document.pdf"

    tmp_dir = Path(tempfile.mkdtemp(prefix="layoutir_"))
    dest = tmp_dir / filename

    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        response = client.get(url)
        response.raise_for_status()
        dest.write_bytes(response.content)

    return dest
