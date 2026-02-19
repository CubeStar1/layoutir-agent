"""
LayoutIR MCP Server — Stateless FastMCP server exposing LayoutIR tools.
Converts documents to IR, reads/edits/exports IR, all via MCP protocol.

IR is stored on disk (output/<document_id>/ir.json) so tools reference
documents by `document_id` instead of passing the full JSON through the LLM.
"""

import json
import hashlib
from pathlib import Path
from typing import Optional

from fastmcp import FastMCP

mcp = FastMCP("LayoutIR", instructions="""
You have access to LayoutIR tools for document processing.

Workflow:
1. Use `convert_document` to convert a PDF/document into IR — returns a `document_id`
2. Use `read_ir` with the `document_id` to understand the document structure
3. Use `edit_ir_block`, `add_ir_block`, or `delete_ir_block` with the `document_id` to modify blocks
4. Use `export_to_markdown` with the `document_id` to export the final document

IMPORTANT: All tools use `document_id` to reference the document — you do NOT need to pass IR JSON directly.
""")

OUTPUT_DIR = Path("./output")


def _get_ir_path(document_id: str) -> Path:
    """Get the path to the IR JSON file for a document."""
    return OUTPUT_DIR / document_id / "ir.json"


def _load_ir(document_id: str) -> dict:
    """Load IR from disk by document_id."""
    ir_path = _get_ir_path(document_id)
    if not ir_path.exists():
        raise FileNotFoundError(f"No IR found for document_id: {document_id}")
    return json.loads(ir_path.read_text(encoding="utf-8"))


def _save_ir(document_id: str, ir: dict) -> None:
    """Save IR to disk by document_id."""
    ir_path = _get_ir_path(document_id)
    ir_path.parent.mkdir(parents=True, exist_ok=True)
    ir_path.write_text(json.dumps(ir, ensure_ascii=False), encoding="utf-8")


def _generate_block_id(content: str, block_type: str, order: int) -> str:
    """Generate a deterministic block ID."""
    raw = f"{content}:{block_type}:{order}"
    return f"blk_{hashlib.sha256(raw.encode()).hexdigest()[:16]}"


@mcp.tool
def convert_document(file_path: str, output_dir: str = "./output") -> dict:
    """Convert a document (PDF) to LayoutIR intermediate representation.
    
    Args:
        file_path: Path to the document file (PDF)
        output_dir: Directory to write output files to
        
    Returns:
        Dictionary with document_id and block count
    """
    from layoutir import Pipeline
    from layoutir.adapters import DoclingAdapter
    from layoutir.chunking import SemanticSectionChunker

    global OUTPUT_DIR
    OUTPUT_DIR = Path(output_dir)

    pipeline = Pipeline(
        adapter=DoclingAdapter(use_gpu=False),
        chunk_strategy=SemanticSectionChunker(max_heading_level=2),
    )

    document = pipeline.process(
        input_path=Path(file_path),
        output_dir=OUTPUT_DIR,
    )

    ir = _load_ir(document.document_id)

    return {
        "document_id": document.document_id,
        "block_count": len(ir.get("blocks", [])),
        "message": f"Document converted successfully. Use read_ir(document_id='{document.document_id}') to see the structure.",
    }


@mcp.tool
def read_ir(document_id: str) -> dict:
    """Read and summarize the IR for a document, returning structured block information.
    
    Args:
        document_id: The document ID returned by convert_document
        
    Returns:
        Dictionary with document info and a summary of all blocks
    """
    ir = _load_ir(document_id)

    blocks_summary = []
    for b in ir.get("blocks", []):
        blocks_summary.append({
            "block_id": b["block_id"],
            "type": b["type"],
            "content_preview": b["content"][:200] if b.get("content") else "",
            "order": b["order"],
            "page_number": b.get("page_number"),
            "label": b.get("metadata", {}).get("label"),
        })

    return {
        "document_id": ir.get("document_id"),
        "schema_version": ir.get("schema_version"),
        "metadata": ir.get("metadata"),
        "block_count": len(blocks_summary),
        "blocks": blocks_summary,
        "stats": ir.get("stats"),
    }


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
    ir = _load_ir(document_id)
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

    _save_ir(document_id, ir)
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
    ir = _load_ir(document_id)
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
        "block_id": _generate_block_id(content, block_type, new_order),
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

    _save_ir(document_id, ir)
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
    ir = _load_ir(document_id)
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

    _save_ir(document_id, ir)
    return {
        "success": True,
        "block_id": block_id,
        "message": f"Block {block_id} deleted successfully.",
    }


@mcp.tool
def export_to_markdown(document_id: str) -> str:
    """Export IR to Markdown format.
    
    Args:
        document_id: The document ID
        
    Returns:
        The document rendered as a Markdown string
    """
    ir = _load_ir(document_id)
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

    return "\n".join(lines)


@mcp.tool
def get_ir_json(document_id: str) -> str:
    """Get the full IR JSON for a document. Use this when the frontend needs the raw IR.
    
    Args:
        document_id: The document ID
        
    Returns:
        The full IR JSON string
    """
    ir = _load_ir(document_id)
    return json.dumps(ir, ensure_ascii=False)


if __name__ == "__main__":
    mcp.run(transport="http", host="0.0.0.0", port=8000)