"""
IR persistence helpers for LayoutIR MCP Server.

Handles loading and saving IR JSON documents via Supabase Storage,
plus block ID generation and asset path rewriting.
"""

import json
import hashlib

import storage


def get_ir_storage_path(document_id: str) -> str:
    """Return the Supabase Storage path for a document's IR JSON."""
    return f"{document_id}/ir.json"


def load_ir(document_id: str) -> dict:
    """Load IR JSON from Supabase Storage."""
    path = get_ir_storage_path(document_id)
    try:
        text = storage.download_text(path)
    except Exception as exc:
        raise FileNotFoundError(f"No IR found for document_id: {document_id}") from exc
    return json.loads(text)


def save_ir(document_id: str, ir: dict) -> str:
    """Save IR JSON to Supabase Storage. Returns the public URL."""
    path = get_ir_storage_path(document_id)
    text = json.dumps(ir, ensure_ascii=False)
    return storage.upload_text(path, text, content_type="application/json")


def generate_block_id(content: str, block_type: str, order: int) -> str:
    """Generate a deterministic block ID."""
    raw = f"{content}:{block_type}:{order}"
    return f"blk_{hashlib.sha256(raw.encode()).hexdigest()[:16]}"


def rewrite_asset_paths(ir: dict, url_map: dict[str, str]) -> dict:
    """
    Replace local relative asset paths in the IR with public Supabase URLs.

    `url_map` is a mapping from relative path (e.g. 'assets/images/img_xxx.png')
    to the full public URL.
    """
    for block in ir.get("blocks", []):
        # Rewrite image paths
        if block.get("image_data") and block["image_data"].get("extracted_path"):
            local_path = block["image_data"]["extracted_path"]
            if local_path in url_map:
                block["image_data"]["extracted_path"] = url_map[local_path]

        # Rewrite table metadata if it references CSV files
        if block.get("table_data") and block.get("metadata", {}).get("table_id"):
            table_id = block["metadata"]["table_id"]
            csv_path = f"assets/tables/{table_id}.csv"
            if csv_path in url_map:
                block["table_data"]["csv_url"] = url_map[csv_path]

    return ir
