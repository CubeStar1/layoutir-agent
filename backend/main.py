from pathlib import Path
from layoutir import Pipeline
from layoutir.adapters import DoclingAdapter
from layoutir.chunking import SemanticSectionChunker

# Create pipeline
adapter = DoclingAdapter(use_gpu=False)
chunker = SemanticSectionChunker(max_heading_level=2)
pipeline = Pipeline(adapter=adapter, chunk_strategy=chunker)

input_path = "files/avinash_resume_del.pdf"
output_dir = "./output"

# Process document
document = pipeline.process(
    input_path=Path(input_path),
    output_dir=Path(output_dir)
)

# Access results
print(f"Extracted {len(document.blocks)} blocks")
print(f"Document ID: {document.document_id}")