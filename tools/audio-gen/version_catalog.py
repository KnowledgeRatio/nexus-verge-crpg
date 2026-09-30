#!/usr/bin/env python3
"""Verify or append immutable local audio versions without publishing audio files."""

import argparse
import hashlib
import json
import os
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = ROOT / "data/audio/cue-versions.json"
PROMPTS_PATH = Path(__file__).with_name("mvp-prompts.json")
LOCAL_ROOT = ROOT / "data/audio/local"
RECORD_PATH = LOCAL_ROOT / "generation-record.json"
STATUSES = {"candidate", "current", "rejected", "source", "superseded"}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def request_sha256(request):
    request = {key: value for key, value in request.items() if key != "mvp"}
    encoded = json.dumps(request, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def load_catalog():
    return json.loads(CATALOG_PATH.read_text())


def save_catalog(catalog):
    temporary = CATALOG_PATH.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(catalog, indent=2) + "\n")
    os.replace(temporary, CATALOG_PATH)


def verify(metadata_only=False):
    catalog = load_catalog()
    prompts = json.loads(PROMPTS_PATH.read_text())
    versions = catalog["versions"]
    errors = []
    if catalog.get("schemaVersion") != 1 or catalog.get("assetRoot") != "data/audio":
        errors.append("Unsupported catalog schema or asset root")
    sources = set()
    revisions = set()
    files = set()
    for version_id, entry in versions.items():
        source = entry["source"]
        family_revision = (entry["family"], entry["revision"])
        if source in sources or family_revision in revisions:
            errors.append(f"Duplicate source or family revision: {version_id}")
        sources.add(source)
        revisions.add(family_revision)
        if version_id != f"{entry['family']}-v{entry['revision']:02d}":
            errors.append(f"ID does not match family and revision: {version_id}")
        if entry["status"] not in STATUSES:
            errors.append(f"Invalid status: {version_id}")
        file = Path(entry["file"])
        if file.parts[:1] != ("local",) or ".." in file.parts or file.suffix not in {".mp3", ".m4a"}:
            errors.append(f"Invalid local asset path: {version_id}")
            continue
        preview_file = entry.get("previewFile")
        if preview_file:
            preview_path = Path(preview_file)
            if preview_path.parts[:1] != ("local",) or ".." in preview_path.parts or preview_path.suffix != ".wav":
                errors.append(f"Invalid derived preview path: {version_id}")
        files.add(file.name)
        if not re.fullmatch(r"[0-9a-f]{64}", entry["sha256"]):
            errors.append(f"Invalid SHA-256: {version_id}")
        prompt_id = entry.get("promptId")
        if prompt_id:
            if prompt_id not in prompts:
                errors.append(f"Missing prompt: {version_id}")
            elif request_sha256(prompts[prompt_id]) != entry.get("requestSha256"):
                errors.append(f"Prompt changed since generation: {version_id}")
        elif entry.get("sources"):
            if any(source_id not in versions for source_id in entry["sources"]):
                errors.append(f"Composite has missing source versions: {version_id}")
        else:
            errors.append(f"Missing prompt or composition sources: {version_id}")
        if not metadata_only:
            asset = LOCAL_ROOT / file.name
            if not asset.exists():
                errors.append(f"Missing local asset: {version_id} ({file.name})")
            elif sha256(asset) != entry["sha256"]:
                errors.append(f"Local asset hash differs from version: {version_id}")

    for family, version_id in catalog["current"].items():
        entry = versions.get(version_id)
        if not entry or entry["family"] != family or entry["status"] != "current":
            errors.append(f"Invalid current pointer: {family} -> {version_id}")
    preview = catalog["previewOrder"]
    if len(preview) != len(set(preview)) or any(version_id not in versions for version_id in preview):
        errors.append("Preview order contains duplicates or unknown versions")
    if preview[:1] != [catalog["current"]["combat"]]:
        errors.append("The current combat cue must be first in preview order")
    if not metadata_only:
        local_files = {path.name for path in LOCAL_ROOT.iterdir() if path.suffix in {".mp3", ".m4a"}}
        for name in sorted(local_files - files):
            errors.append(f"Uncataloged local asset: {name}")
        if RECORD_PATH.exists():
            record = json.loads(RECORD_PATH.read_text())
            for version_id, entry in versions.items():
                item = record.get(entry["source"])
                if not item or item["sha256"] != entry["sha256"]:
                    errors.append(f"Private generation record differs: {version_id}")
                elif item.get("request") and request_sha256(item["request"]) != entry.get("requestSha256"):
                    errors.append(f"Private prompt record differs: {version_id}")
    if errors:
        raise SystemExit("Audio version check failed:\n- " + "\n- ".join(errors))
    print(f"Verified {len(versions)} audio versions; current combat {catalog['current']['combat']}, "
          f"overworld {catalog['current']['overworld']}")


def register(args):
    catalog = load_catalog()
    record = json.loads(RECORD_PATH.read_text())
    item = record.get(args.source)
    if not item:
        raise SystemExit(f"No private generation record for {args.source}")
    asset = LOCAL_ROOT / item["file"]
    if not asset.exists() or sha256(asset) != item["sha256"]:
        raise SystemExit(f"Missing or modified generated asset: {asset}")
    version_id = f"{args.family}-v{args.revision:02d}"
    if version_id in catalog["versions"] or any(v["source"] == args.source for v in catalog["versions"].values()):
        raise SystemExit("Version ID or source already registered; existing versions are immutable")
    if any(v["family"] == args.family and v["revision"] == args.revision for v in catalog["versions"].values()):
        raise SystemExit("Family revision already registered")
    entry = {
        "family": args.family,
        "revision": args.revision,
        "label": args.label,
        "status": "candidate",
        "source": args.source,
        "file": f"local/{item['file']}",
        "sha256": item["sha256"],
        "generatedAt": item["generated_at"],
        "note": args.note,
    }
    if item.get("request"):
        prompts = json.loads(PROMPTS_PATH.read_text())
        if args.source not in prompts or request_sha256(prompts[args.source]) != request_sha256(item["request"]):
            raise SystemExit("The versioned prompt must match the private generation record")
        entry["promptId"] = args.source
        entry["requestSha256"] = request_sha256(item["request"])
    else:
        by_source = {value["source"]: key for key, value in catalog["versions"].items()}
        sources = item.get("sources", [])
        if not sources or any(source not in by_source for source in sources) or not args.recipe:
            raise SystemExit("Composite versions need registered sources and --recipe")
        entry["sources"] = [by_source[source] for source in sources]
        entry["editEndsSeconds"] = item["edit_ends_seconds"]
        entry["crossfadeSeconds"] = item["crossfade_seconds"]
        entry["recipe"] = args.recipe
    catalog["versions"][version_id] = entry
    save_catalog(catalog)
    print(f"Registered {version_id} as a candidate; asset remains local and Git-ignored")


def promote(version_id):
    catalog = load_catalog()
    entry = catalog["versions"].get(version_id)
    if not entry or entry["family"] not in catalog["current"] or entry["status"] == "rejected":
        raise SystemExit("Promote a registered, non-rejected music version")
    family = entry["family"]
    previous = catalog["current"][family]
    if previous == version_id:
        print(f"{version_id} is already current")
        return
    catalog["versions"][previous]["status"] = "superseded"
    entry["status"] = "current"
    catalog["current"][family] = version_id
    order = [item for item in catalog["previewOrder"] if item != version_id]
    if family == "combat":
        order.insert(0, version_id)
    else:
        order.insert(order.index(previous), version_id)
    catalog["previewOrder"] = order
    save_catalog(catalog)
    print(f"Promoted {version_id}; the preview will select it from the catalogue")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    check = commands.add_parser("verify", help="Check metadata and local audio hashes")
    check.add_argument("--metadata-only", action="store_true", help="Check a clone without private audio")
    add = commands.add_parser("register", help="Append one new immutable candidate")
    add.add_argument("--source", required=True, help="Name in the private generation record")
    add.add_argument("--family", required=True, help="Cue family, such as combat")
    add.add_argument("--revision", required=True, type=int)
    add.add_argument("--label", required=True)
    add.add_argument("--note", default="Awaiting listening review")
    add.add_argument("--recipe", help="Build script for a composite candidate")
    select = commands.add_parser("promote", help="Set a reviewed combat or overworld cue as current")
    select.add_argument("version_id")
    args = parser.parse_args()
    if args.command == "verify":
        verify(args.metadata_only)
    elif args.command == "register":
        register(args)
    else:
        promote(args.version_id)


if __name__ == "__main__":
    main()
