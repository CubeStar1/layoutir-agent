"""
LayoutIR MCP Server — Stateless FastMCP server exposing LayoutIR tools.

Converts documents to IR, reads/edits/exports IR, all via MCP protocol.
Input documents are fetched from URLs (any object store).
All output is persisted to Supabase Storage with public URLs.
"""

import json
import shutil
import tempfile
from pathlib import Path
from typing import Optional

from fastmcp import FastMCP

from mcp_server.utils import storage, ir_helpers
from mcp_server.utils.download import download_to_temp


mcp = FastMCP("LayoutIR", instructions="""
You have access to LayoutIR tools for document processing.

Workflow:
1. Use `convert_document` with a **public URL** to a document to convert it into IR — returns a `document_id`
2. Use `read_ir` with the `document_id` to get the full document structure and JSON
3. Use `edit_ir_block`, `add_ir_block`, or `delete_ir_block` with the `document_id` to modify blocks
4. Use `export_to_markdown` with the `document_id` to export the final document

IMPORTANT:
- All tools use `document_id` to reference the document.
- Input must be an HTTP(S) URL to a document file.
- All output files (IR, images, exports) are stored in the cloud and accessible via public URLs.
""")


# ── Convert ─────────────────────────────────────────────────────────

@mcp.tool
def convert_document(file_url: str) -> dict:
    """Convert a document (PDF) from a URL to LayoutIR intermediate representation.

    The document is downloaded from the URL, processed locally, and all output
    files are uploaded to cloud storage. Asset paths in the IR are rewritten
    to public URLs.

    Args:
        file_url: HTTP(S) URL to the document file (PDF)

    Returns:
        Dictionary with document_id, block count, and public URLs
    """
    from layoutir import Pipeline
    from layoutir.adapters import DoclingAdapter
    from layoutir.chunking import SemanticSectionChunker

    # 1. Download file from URL to temp dir
    local_file = download_to_temp(file_url)
    tmp_output = Path(tempfile.mkdtemp(prefix="layoutir_out_"))

    try:
        # 2. Run the pipeline locally
        pipeline = Pipeline(
            adapter=DoclingAdapter(use_gpu=False),
            chunk_strategy=SemanticSectionChunker(max_heading_level=2),
        )
        document = pipeline.process(
            input_path=local_file,
            output_dir=tmp_output,
        )

        doc_id = document.document_id
        doc_dir = tmp_output / doc_id

        # 3. Upload all output files to Supabase Storage
        url_map = storage.upload_directory(doc_id, doc_dir)

        # 4. Rewrite local asset paths in IR to public URLs, then re-upload IR
        ir = json.loads((doc_dir / "ir.json").read_text(encoding="utf-8"))
        ir = ir_helpers.rewrite_asset_paths(ir, url_map)
        ir_helpers.save_ir(doc_id, ir)

        return {
            "document_id": doc_id,
            "block_count": len(ir.get("blocks", [])),
            "ir_url": url_map.get("ir.json"),
            "manifest_url": url_map.get("manifest.json"),
            "message": f"Document converted and uploaded. Use read_ir(document_id='{doc_id}') to see the structure.",
        }
    finally:
        # 5. Clean up temp directories
        shutil.rmtree(local_file.parent, ignore_errors=True)
        shutil.rmtree(tmp_output, ignore_errors=True)


# ── Read ─────────────────────────────────────────────────────────────

@mcp.tool
def read_ir(document_id: str) -> dict:
    """Read the full IR for a document, returning the structured JSON.

    Args:
        document_id: The document ID returned by convert_document

    Returns:
        The full IR JSON as a dictionary.
    """
    return ir_helpers.load_ir(document_id)


# ── Edit ─────────────────────────────────────────────────────────────

@mcp.tool
def edit_ir_block(
    document_id: str,
    block_id: str,
    new_content: Optional[str] = None,
    new_type: Optional[str] = None,
    new_metadata: Optional[str] = None,
) -> dict:
    """Edit a specific block in the IR by its block_id.

    Args:
        document_id: The document ID
        block_id: The ID of the block to edit
        new_content: New content text for the block (optional)
        new_type: New block type, e.g. 'heading', 'paragraph', 'list' (optional)
        new_metadata: New metadata as a JSON string (optional)

    Returns:
        Confirmation of the edit
    """
    ir = ir_helpers.load_ir(document_id)
    found = False

    for block in ir.get("blocks", []):
        if block["block_id"] == block_id:
            if new_content is not None:
                block["content"] = new_content
            if new_type is not None:
                block["type"] = new_type
            if new_metadata is not None:
                block["metadata"] = json.loads(new_metadata)
            found = True
            break

    if not found:
        return {"error": f"Block {block_id} not found"}

    ir_helpers.save_ir(document_id, ir)
    return {
        "success": True,
        "block_id": block_id,
        "message": f"Block {block_id} updated successfully.",
    }


@mcp.tool
def add_ir_block(
    document_id: str,
    after_block_id: str,
    content: str,
    block_type: str = "paragraph",
    label: str = "text",
) -> dict:
    """Add a new block after a specified block.

    Args:
        document_id: The document ID
        after_block_id: Insert the new block after this block_id
        content: Text content for the new block
        block_type: Block type (paragraph, heading, list, etc.)
        label: Metadata label for the block

    Returns:
        Confirmation with the new block's ID
    """
    ir = ir_helpers.load_ir(document_id)
    blocks = ir.get("blocks", [])

    insert_idx = None
    ref_block = None
    for i, block in enumerate(blocks):
        if block["block_id"] == after_block_id:
            insert_idx = i + 1
            ref_block = block
            break

    if insert_idx is None:
        return {"error": f"Block {after_block_id} not found"}

    new_order = ref_block["order"] + 1

    # Shift orders of subsequent blocks
    for block in blocks[insert_idx:]:
        block["order"] += 1

    new_block = {
        "block_id": ir_helpers.generate_block_id(content, block_type, new_order),
        "type": block_type,
        "parent_id": None,
        "page_number": ref_block.get("page_number", 1),
        "bbox": ref_block.get("bbox", {"x0": 0, "y0": 0, "x1": 0, "y1": 0, "page_width": None, "page_height": None}),
        "content": content,
        "metadata": {"label": label},
        "table_data": None,
        "image_data": None,
        "level": None,
        "list_level": None,
        "order": new_order,
    }

    blocks.insert(insert_idx, new_block)
    ir["blocks"] = blocks

    if "stats" in ir:
        ir["stats"]["block_count"] = len(blocks)

    ir_helpers.save_ir(document_id, ir)
    return {
        "success": True,
        "new_block_id": new_block["block_id"],
        "message": f"New {block_type} block added after {after_block_id}.",
    }


@mcp.tool
def delete_ir_block(document_id: str, block_id: str) -> dict:
    """Delete a block from the IR by its block_id.

    Args:
        document_id: The document ID
        block_id: The ID of the block to delete

    Returns:
        Confirmation of the deletion
    """
    ir = ir_helpers.load_ir(document_id)
    blocks = ir.get("blocks", [])
    original_len = len(blocks)

    ir["blocks"] = [b for b in blocks if b["block_id"] != block_id]

    if len(ir["blocks"]) == original_len:
        return {"error": f"Block {block_id} not found"}

    # Re-order blocks
    for i, block in enumerate(ir["blocks"]):
        block["order"] = i

    if "stats" in ir:
        ir["stats"]["block_count"] = len(ir["blocks"])

    ir_helpers.save_ir(document_id, ir)
    return {
        "success": True,
        "block_id": block_id,
        "message": f"Block {block_id} deleted successfully.",
    }


# ── Export ───────────────────────────────────────────────────────────

@mcp.tool
def export_to_markdown(document_id: str) -> dict:
    """Export IR to Markdown format and upload to cloud storage.

    Args:
        document_id: The document ID

    Returns:
        Dictionary with the markdown content and its public URL
    """
    ir = ir_helpers.load_ir(document_id)
    blocks = sorted(ir.get("blocks", []), key=lambda b: b.get("order", 0))

    lines = []
    for block in blocks:
        content = block.get("content", "").strip()
        if not content:
            continue

        block_type = block.get("type", "paragraph")
        label = block.get("metadata", {}).get("label", "text")

        if block_type == "heading" or label == "section_header":
            level = block.get("level") or 1
            prefix = "#" * min(level, 6)
            lines.append(f"{prefix} {content}")
            lines.append("")
        elif block_type == "list" or label == "list_item":
            lines.append(f"- {content}")
        elif block_type == "table":
            lines.append(content)
            lines.append("")
        else:
            lines.append(content)
            lines.append("")

    markdown = "\n".join(lines)

    # Upload to Supabase Storage
    export_path = f"{document_id}/exports/markdown/full_document.md"
    public_url = storage.upload_text(export_path, markdown, content_type="text/markdown")

    return {
        "markdown": markdown,
        "url": public_url,
        "message": f"Markdown exported and uploaded for document {document_id}.",
    }


# ── Entry point ──────────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8000)