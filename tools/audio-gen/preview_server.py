#!/usr/bin/env python3
"""Serve the combat audio study on loopback without exposing local secrets."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[2]
PORT = 8765
FILES = {"combat-study.html", "settlement-study.html", "index.html", "combat-scene.css", "styles.css"}
DIRECTORIES = ("src/", "data/", "vendor/")


class StudyHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      ".m4a": "audio/mp4", ".wav": "audio/wav"}

    def send_head(self):
        # Browsers request byte ranges when decoding or seeking in MP4 audio.
        # SimpleHTTPRequestHandler ignores Range and returns the entire file.
        self.range_remaining = None
        requested = self.headers.get("Range")
        if not requested or not urlsplit(self.path).path.endswith((".m4a", ".mp3", ".wav")):
            return super().send_head()
        path = self.translate_path(self.path)
        if not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        try:
            unit, spec = requested.split("=", 1)
            first, last = spec.split("-", 1)
            if unit != "bytes" or "," in spec or not (first or last):
                raise ValueError("Unsupported byte range")
            if first:
                start = int(first)
                end = min(int(last), size - 1) if last else size - 1
            else:
                length = int(last)
                start, end = max(0, size - length), size - 1
            if start < 0 or end < start or start >= size:
                raise ValueError("Byte range outside file")
        except ValueError:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None
        stream = open(path, "rb")
        stream.seek(start)
        self.range_remaining = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(self.range_remaining))
        self.end_headers()
        return stream

    def copyfile(self, source, outputfile):
        if self.range_remaining is None:
            return super().copyfile(source, outputfile)
        while self.range_remaining:
            chunk = source.read(min(64 * 1024, self.range_remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            self.range_remaining -= len(chunk)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def allowed(self):
        path = unquote(urlsplit(self.path).path).lstrip("/")
        parts = Path(path).parts
        if not path or path.endswith("/") or "%" in path or any(part.startswith(".") for part in parts):
            return False
        if path.startswith("data/audio/local/") and not path.endswith((".mp3", ".m4a", ".wav")):
            return False
        return path in FILES or path.startswith(DIRECTORIES)

    def do_GET(self):
        if not self.allowed():
            self.send_error(403)
            return
        super().do_GET()

    def do_HEAD(self):
        if not self.allowed():
            self.send_error(403)
            return
        super().do_HEAD()

    def list_directory(self, path):
        self.send_error(403)


if __name__ == "__main__":
    handler = partial(StudyHandler, directory=str(ROOT))
    with ThreadingHTTPServer(("127.0.0.1", PORT), handler) as server:
        print(f"Combat audio study: http://127.0.0.1:{server.server_port}/combat-study.html", flush=True)
        server.serve_forever()
