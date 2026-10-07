"""Start or reuse the repository's loopback-only combined preview server.

This helper never builds, kills a server, or launches a browser. Call it after
assembling saved source files, from a worker thread rather than Tk's UI thread.
"""
from __future__ import annotations

import errno
import hashlib
import http.client
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
from urllib.parse import urlsplit


def _result(ok, status, message, url="", pid=None, started=False):
    return {"ok": ok, "status": status, "message": message,
            "url": url, "pid": pid, "started": started}


def preview_identity(repo_root: Path) -> str:
    """Match serve.mjs: normalized build path, SHA-256, first 16 hex digits."""
    output = str((Path(repo_root).resolve() / "showcase" / "site-dist").resolve()).replace("\\", "/")
    if sys.platform == "win32":
        output = output.lower()
    return hashlib.sha256(output.encode("utf-8")).hexdigest()[:16]


def _probe(port: int, expected_id: str | None = None) -> str:
    """Distinguish a ready novel endpoint, an occupied port, and a closed port."""
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=0.75)
    try:
        # HTTPConnection ignores environment proxies and never follows redirects.
        connection.request("HEAD", "/novel/")
        response = connection.getresponse()
        if response.status != 200 or "text/html" not in response.getheader("Content-Type", "").lower():
            return "occupied"
        if expected_id is not None:
            identity = response.getheader("X-Portfolio-Preview", "").strip()
            if not identity:
                return "identity_missing"
            if identity != expected_id:
                return "identity_mismatch"
        return "ready"
    except ConnectionRefusedError:
        return "closed"
    except OSError as error:
        if error.errno in (errno.ECONNREFUSED, 10061):
            return "closed"
        return "occupied"
    except (socket.timeout, http.client.HTTPException):
        return "occupied"
    finally:
        connection.close()


def ensure_local_preview(repo_root: Path, base: str) -> dict:
    """Return ``ok/status/message/url/pid/started`` without touching source files.

    Only an HTTP origin on ``localhost`` or ``127.0.0.1`` can start a process.
    Existing servers are reused only if their ``X-Portfolio-Preview`` header
    matches this worktree's build path. The header contains the first 16 hex
    digits of SHA-256 over the resolved ``showcase/site-dist`` path, with forward
    slashes and lowercase on Windows. Older/different previews are never replaced.
    A newly launched Node process is hidden on Windows and remains independent
    of the editor. Its output goes to the ignored ``tools/novel_preview.log``.
    """
    try:
        address = urlsplit(str(base or "").strip())
        if address.username or address.password or address.query or address.fragment or address.path not in ("", "/"):
            return _result(False, "invalid", "Use a plain preview origin, such as http://127.0.0.1:4175.")
        if address.scheme != "http" or address.hostname not in ("127.0.0.1", "localhost"):
            return _result(False, "unsupported", "Automatic preview startup requires an HTTP address on localhost or 127.0.0.1. Saved pages were built; remote previews remain separate.")
        port = address.port if address.port is not None else 80
        if not 1 <= port <= 65535:
            return _result(False, "invalid", "Choose a preview port between 1 and 65535.")
    except (ValueError, TypeError):
        return _result(False, "invalid", "The preview address is invalid. Use http://127.0.0.1:4175.")
    origin = f"http://{address.hostname}:{port}"
    url = origin + "/novel/"
    root = Path(repo_root).resolve()
    expected_id = preview_identity(root)
    state = _probe(port, expected_id)
    if state == "ready":
        return _result(True, "running", f"Saved preview is ready at {url}", url)
    if state != "closed":
        if state in ("identity_missing", "identity_mismatch"):
            return _result(False, state, f"Port {port} serves a different worktree or an older preview without an identity header. Choose an unused local preview port; the existing comparison was left running.", url)
        return _result(False, "occupied", f"Port {port} is occupied or unresponsive. Choose another local preview port; the existing process was left running.", url)
    script = root / "showcase" / "scripts" / "serve.mjs"
    if not script.is_file():
        return _result(False, "missing_script", f"Preview server script is missing: {script}", url)
    if not (root / "showcase" / "site-dist" / "novel" / "index.html").is_file():
        return _result(False, "missing_build", "Assemble the saved pages before starting the combined preview server.", url)
    node = shutil.which("node")
    if not node:
        return _result(False, "missing_node", "Node.js is unavailable. Install the project's supported Node.js version, then build the saved preview again.", url)
    log = root / "tools" / "novel_preview.log"
    try:
        log.parent.mkdir(parents=True, exist_ok=True)
        options = {"creationflags": subprocess.CREATE_NO_WINDOW | subprocess.DETACHED_PROCESS} if sys.platform == "win32" else {"start_new_session": True}
        with log.open("ab") as output:
            process = subprocess.Popen([node, str(script), f"--port={port}"], cwd=root,
                                       stdin=subprocess.DEVNULL, stdout=output,
                                       stderr=subprocess.STDOUT, close_fds=True, **options)
    except OSError as error:
        return _result(False, "start_failed", f"Could not start the local preview: {error}", url)
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        state = _probe(port, expected_id)
        if state == "ready":
            return _result(True, "started", f"Saved preview is ready at {url}", url, process.pid, True)
        if state in ("identity_missing", "identity_mismatch"):
            return _result(False, state, f"Port {port} now serves another preview. Choose an unused port; no existing process was stopped.", url, process.pid, True)
        exit_code = process.poll()
        if exit_code is not None:
            return _result(False, "start_failed", f"The preview server exited with code {exit_code}. See {log} for details.", url, process.pid, True)
        time.sleep(0.15)
    return _result(False, "starting", f"The preview process started but has not responded yet. Try {url} again or inspect {log}.", url, process.pid, True)
