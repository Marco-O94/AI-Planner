"""ProjectNotes MCP server package.

Exposes the ProjectNotes FastAPI backend to AI agents (Claude Code) over MCP.
The server talks to the backend over HTTP only — it never imports backend code,
keeping the two services decoupled.
"""

__all__ = ["__version__"]

__version__ = "0.1.0"
