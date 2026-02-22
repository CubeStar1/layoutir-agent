import sys
from pathlib import Path

# Add the current directory to sys.path to allow 'from mcp_server' imports
sys.path.append(str(Path(__file__).parent))

if __name__ == "__main__":
    from mcp_server.main import mcp
    # Defaulting to 0.0.0.0:8000 for development
    mcp.run(transport="http", host="0.0.0.0", port=8000)
