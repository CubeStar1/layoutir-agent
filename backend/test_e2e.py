"""
End-to-end test for the LayoutIR MCP Server with Supabase Storage.

Tests the full pipeline by calling the same logic the MCP tools use,
via the helper modules directly (storage, download, ir_helpers).

Steps:
  1. Upload a local PDF to Supabase Storage to get a public URL
  2. Download from URL + run pipeline + upload output (convert_document logic)
  3. Load IR from cloud (read_ir logic)
  4. Edit a block + save back (edit_ir_block logic)
  5. Add a new block (add_ir_block logic)
  6. Delete the new block (delete_ir_block logic)
  7. Export to markdown + upload (export_to_markdown logic)
  8. Load full IR JSON (get_ir_json logic)

Run:
  uv run python test_e2e.py
"""

import json
import shutil
import tempfile
from pathlib import Path

import storage
import ir_helpers
from download import download_to_temp


def separator(title: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")


def main():
    pdf_path = Path("./files/avinash_resume_del.pdf")
    if not pdf_path.exists():
        print(f"❌ PDF not found at {pdf_path}")
        return

    # ── Step 1: Upload the PDF to Supabase to get a public URL ──────
    separator("Step 1: Upload PDF to Supabase Storage")

    upload_path = f"test-uploads/{pdf_path.name}"
    file_url = storage.upload_file(upload_path, pdf_path)
    print(f"✅ Uploaded to: {file_url}")

    # ── Step 2: Convert document via URL ────────────────────────────
    separator("Step 2: convert_document (download + pipeline + upload)")

    from layoutir import Pipeline
    from layoutir.adapters import DoclingAdapter
    from layoutir.chunking import SemanticSectionChunker

    # Download from URL
    local_file = download_to_temp(file_url)
    tmp_output = Path(tempfile.mkdtemp(prefix="layoutir_out_"))
    print(f"  Downloaded to: {local_file}")

    try:
        # Run pipeline
        pipeline = Pipeline(
            adapter=DoclingAdapter(use_gpu=False),
            chunk_strategy=SemanticSectionChunker(max_heading_level=2),
        )
        document = pipeline.process(input_path=local_file, output_dir=tmp_output)
        doc_id = document.document_id
        doc_dir = tmp_output / doc_id
        print(f"  Pipeline done — doc_id: {doc_id}")

        # Upload all output to Supabase
        url_map = storage.upload_directory(doc_id, doc_dir)
        print(f"  Uploaded {len(url_map)} files to Supabase Storage")

        # Rewrite asset paths and re-upload IR
        ir = json.loads((doc_dir / "ir.json").read_text(encoding="utf-8"))
        ir = ir_helpers.rewrite_asset_paths(ir, url_map)
        ir_helpers.save_ir(doc_id, ir)
        print(f"  ✅ IR rewritten with public URLs and re-uploaded")
        print(f"  📄 document_id = {doc_id}")
        print(f"  📊 block_count = {len(ir.get('blocks', []))}")
    finally:
        shutil.rmtree(local_file.parent, ignore_errors=True)
        shutil.rmtree(tmp_output, ignore_errors=True)

    # ── Step 3: Read IR from cloud ──────────────────────────────────
    separator("Step 3: read_ir (load from Supabase)")

    ir = ir_helpers.load_ir(doc_id)
    blocks = ir.get("blocks", [])
    print(f"📊 block_count = {len(blocks)}")
    print(f"📋 schema_version = {ir.get('schema_version')}")
    print(f"\nFirst 3 blocks:")
    for b in blocks[:3]:
        preview = (b.get("content") or "")[:80]
        label = b.get("metadata", {}).get("label", "?")
        print(f"  [{b['block_id']}] type={b['type']}, label={label}")
        print(f"    preview: {preview}...")

    # Check image paths were rewritten
    image_blocks = [b for b in blocks if b.get("image_data")]
    if image_blocks:
        img_path = image_blocks[0]["image_data"]["extracted_path"]
        assert img_path.startswith("http"), f"Image path not rewritten: {img_path}"
        print(f"\n✅ Image URL rewritten: {img_path[:80]}...")

    # Pick a block to work with
    first_block = blocks[0]
    block_id = first_block["block_id"]

    # ── Step 4: Edit a block ────────────────────────────────────────
    separator("Step 4: edit_ir_block")

    ir = ir_helpers.load_ir(doc_id)
    for block in ir.get("blocks", []):
        if block["block_id"] == block_id:
            block["content"] = "[EDITED] This content was modified by the test script."
            break
    ir_helpers.save_ir(doc_id, ir)
    print(f"✅ Edited block {block_id}")

    # Verify the edit persisted
    ir = ir_helpers.load_ir(doc_id)
    edited = next(b for b in ir["blocks"] if b["block_id"] == block_id)
    assert "[EDITED]" in edited["content"], "Edit did not persist!"
    print(f"✅ Verified — content: {edited['content'][:60]}")

    # ── Step 5: Add a new block ─────────────────────────────────────
    separator("Step 5: add_ir_block")

    ir = ir_helpers.load_ir(doc_id)
    blocks = ir["blocks"]
    ref_idx = next(i for i, b in enumerate(blocks) if b["block_id"] == block_id)
    ref_block = blocks[ref_idx]
    new_order = ref_block["order"] + 1

    # Shift subsequent blocks
    for b in blocks[ref_idx + 1:]:
        b["order"] += 1

    new_block = {
        "block_id": ir_helpers.generate_block_id("Test block", "paragraph", new_order),
        "type": "paragraph",
        "parent_id": None,
        "page_number": ref_block.get("page_number", 1),
        "bbox": ref_block.get("bbox", {}),
        "content": "This is a new block added by the test script.",
        "metadata": {"label": "text"},
        "table_data": None,
        "image_data": None,
        "level": None,
        "list_level": None,
        "order": new_order,
    }
    blocks.insert(ref_idx + 1, new_block)
    ir["blocks"] = blocks
    ir_helpers.save_ir(doc_id, ir)

    new_block_id = new_block["block_id"]
    print(f"✅ Added block {new_block_id}")

    # ── Step 6: Delete the new block ────────────────────────────────
    separator("Step 6: delete_ir_block")

    ir = ir_helpers.load_ir(doc_id)
    original_count = len(ir["blocks"])
    ir["blocks"] = [b for b in ir["blocks"] if b["block_id"] != new_block_id]
    for i, b in enumerate(ir["blocks"]):
        b["order"] = i
    ir_helpers.save_ir(doc_id, ir)

    assert len(ir["blocks"]) == original_count - 1, "Deletion failed!"
    print(f"✅ Deleted block {new_block_id}")
    print(f"   Blocks: {original_count} → {len(ir['blocks'])}")

    # ── Step 7: Export to Markdown ──────────────────────────────────
    separator("Step 7: export_to_markdown")

    ir = ir_helpers.load_ir(doc_id)
    sorted_blocks = sorted(ir.get("blocks", []), key=lambda b: b.get("order", 0))

    lines = []
    for block in sorted_blocks:
        content = (block.get("content") or "").strip()
        if not content:
            continue
        block_type = block.get("type", "paragraph")
        label = block.get("metadata", {}).get("label", "text")
        if block_type == "heading" or label == "section_header":
            level = block.get("level") or 1
            lines.append(f"{'#' * min(level, 6)} {content}\n")
        elif block_type == "list" or label == "list_item":
            lines.append(f"- {content}")
        else:
            lines.append(f"{content}\n")
    markdown = "\n".join(lines)

    export_path = f"{doc_id}/exports/markdown/full_document.md"
    md_url = storage.upload_text(export_path, markdown, content_type="text/markdown")
    print(f"📎 Public URL: {md_url}")
    print(f"📝 Markdown preview (first 300 chars):")
    print(markdown[:300])

    # ── Step 8: Get raw IR JSON ─────────────────────────────────────
    separator("Step 8: get_ir_json")

    ir = ir_helpers.load_ir(doc_id)
    raw_json = json.dumps(ir, ensure_ascii=False)
    print(f"📊 Full IR has {len(ir.get('blocks', []))} blocks")
    print(f"✅ Raw IR JSON length: {len(raw_json)} characters")

    # ── Done ────────────────────────────────────────────────────────
    separator("✅ All tests passed!")
    print(f"Document ID: {doc_id}")
    print(f"All files are in Supabase Storage under: layoutir/{doc_id}/")
    print(f"\nSample URLs:")
    for key in ["ir.json", "manifest.json"]:
        url = storage.get_public_url(f"{doc_id}/{key}")
        print(f"  {key}: {url}")


if __name__ == "__main__":
    main()

