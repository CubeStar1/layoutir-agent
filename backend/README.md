# LayoutIR MCP Server

This is the backend for the LayoutIR Agent, implemented as a FastMCP server

## Setup

1. **Install uv**:

   ```bash
   powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
   ```

2. **Environment Variables**:
   Create a `.env` file with your Supabase Storage credentials:

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

3. **Run the Server**:
   ```bash
   uv run .\run_server.py
   ```

## MCP Tools

The server provides several tools that the AI agent uses to interact with documents:

- **`convert_document`**: Converts a PDF from a URL into LayoutIR structure.
- **`read_ir`**: Retrieves the full IR JSON for visualization and analysis.
- **`edit_ir_block`**: Updates the content or type of a specific layout block.
- **`add_ir_block`**: Insert a new block into the document layout.
- **`delete_ir_block`**: Removes a block from the document.
- **`export_to_latex`**: Converts the current IR into a LaTeX document.

## Architecture

- **FastMCP**: Unified tool definition framework.
- **LayoutIR Library**: Core logic for IR manipulation and PDF analysis.
- **Supabase Storage**: Centralized storage for document files and IR snapshots.
