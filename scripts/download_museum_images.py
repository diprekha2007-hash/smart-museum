#!/usr/bin/env python3
"""
Download 36 real museum-related photographs from Wikimedia Commons into:
frontend/images/artifacts (12)
frontend/images/galleries (10)
frontend/images/exhibitions (6)
frontend/images/events (8)

The script keeps each image as a separate file and writes attribution.csv.
Run this script from your SmartMuseum project root:
    python scripts/download_museum_images.py

Requires: Python 3.9+, requests, Pillow (pip install requests pillow)
Images are selected from Wikimedia Commons search results. Check attribution.csv
and each file's Commons page before publishing/submitting.
"""
from pathlib import Path
from io import BytesIO
import csv
import re
import time
import requests

API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {
    "User-Agent": "SmartMuseumStudentProject/1.0 (educational use; contact project maintainer)"
}
ROOT = Path.cwd()
IMAGE_ROOT = ROOT / "frontend" / "images"

# Stable local filenames: use these paths in your frontend.
COLLECTIONS = {
    "artifacts": [
        ("A001", "painted terracotta pot Indian pottery artifact", "artifact_A001.jpg"),
        ("A002", "bronze dancing figure Indian bronze sculpture", "artifact_A002.jpg"),
        ("A003", "Chola bronze Nataraja sculpture India", "artifact_A003.jpg"),
        ("A004", "ancient Indian terracotta figurine archaeological artifact", "artifact_A004.jpg"),
        ("A005", "Rajasthani miniature painting Indian miniature art", "artifact_A005.jpg"),
        ("A006", "ancient Indian copper coin archaeological coin", "artifact_A006.jpg"),
        ("A007", "stone Buddha sculpture India museum", "artifact_A007.jpg"),
        ("A008", "traditional Indian woven textile handloom fabric", "artifact_A008.jpg"),
        ("A009", "Indian ceremonial mask folk art", "artifact_A009.jpg"),
        ("A010", "brass oil lamp South India traditional", "artifact_A010.jpg"),
        ("A011", "authentic palm leaf manuscript India", "artifact_A011.jpg"),
        ("A012", "Jaipur blue pottery vase traditional ceramic", "artifact_A012.jpg"),
    ],
    "galleries": [
        ("G001", "museum ancient civilizations gallery archaeological objects display", "gallery_G001.jpg"),
        ("G002", "museum sculpture gallery stone and bronze statues", "gallery_G002.jpg"),
        ("G003", "Indian painting gallery museum paintings on walls", "gallery_G003.jpg"),
        ("G004", "textile heritage museum traditional textile gallery", "gallery_G004.jpg"),
        ("G005", "archaeology museum hall artifacts display cases", "gallery_G005.jpg"),
        ("G006", "museum coins and currency exhibition display", "gallery_G006.jpg"),
        ("G007", "museum bronze collection display sculptures", "gallery_G007.jpg"),
        ("G008", "Indian folk art gallery museum traditional art", "gallery_G008.jpg"),
        ("G009", "manuscript room archival palm leaf manuscripts library", "gallery_G009.jpg"),
        ("G010", "Indian cultural heritage museum gallery interior", "gallery_G010.jpg"),
    ],
    "exhibitions": [
        ("EX001", "museum exhibition pottery and bronze artifacts display", "exhibition_EX001.jpg"),
        ("EX002", "ancient India archaeology museum exhibition artifacts", "exhibition_EX002.jpg"),
        ("EX003", "art across ages museum exhibition paintings sculptures", "exhibition_EX003.jpg"),
        ("EX004", "traditional Indian textiles heritage exhibition", "exhibition_EX004.jpg"),
        ("EX005", "Nataraja sculpture spiritual art museum exhibition", "exhibition_EX005.jpg"),
        ("EX006", "living cultural heritage exhibition India museum", "exhibition_EX006.jpg"),
    ],
    "events": [
        ("EV001", "museum heritage walk guided tour visitors gallery", "event_EV001.jpg"),
        ("EV002", "pottery workshop potter making clay pot on wheel", "event_EV002.jpg"),
        ("EV003", "museum curator talk speaker presenting collection", "event_EV003.jpg"),
        ("EV004", "family art day museum family painting activity", "event_EV004.jpg"),
        ("EV005", "museum conservation demonstration artifact restoration", "event_EV005.jpg"),
        ("EV006", "student research meetup museum archaeology students", "event_EV006.jpg"),
        ("EV007", "cultural heritage lecture museum audience speaker", "event_EV007.jpg"),
        ("EV008", "museum discovery tour visitors exploring exhibition", "event_EV008.jpg"),
    ],
}

def clean_filename(value):
    return re.sub(r"[^A-Za-z0-9._-]+", "_", value)

def search_commons(session, query):
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f'filetype:bitmap {query}',
        "gsrnamespace": 6,
        "gsrlimit": 10,
        "prop": "imageinfo",
        "iiprop": "url|extmetadata",
        "iiurlwidth": 1200,
        "format": "json",
    }
    response = session.get(API, params=params, timeout=40)
    response.raise_for_status()
    pages = response.json().get("query", {}).get("pages", {})
    # Wikimedia Commons returns search-ranked results; keep that relevance order.
    return list(pages.values())

def download_one(session, query, destination, used_titles):
    pages = search_commons(session, query)
    for page in pages:
        title = page.get("title", "")
        if title in used_titles:
            continue
        infos = page.get("imageinfo", [])
        if not infos:
            continue
        info = infos[0]
        url = info.get("thumburl") or info.get("url")
        if not url or not url.lower().split("?")[0].endswith((".jpg", ".jpeg", ".png", ".webp")):
            continue
        try:
            r = session.get(url, timeout=60)
            r.raise_for_status()
            content_type = r.headers.get("Content-Type", "")
            if not content_type.startswith("image/") or len(r.content) < 10_000:
                continue
            # Normalize every download to JPEG so the filenames stay consistent.
            try:
                from PIL import Image
                with Image.open(BytesIO(r.content)) as im:
                    if im.mode not in ("RGB", "L"):
                        im = im.convert("RGB")
                    elif im.mode == "L":
                        im = im.convert("RGB")
                    im.save(destination.with_suffix(".jpg"), format="JPEG", quality=88, optimize=True)
            except ImportError:
                raise SystemExit("Missing Pillow. Run: python -m pip install requests pillow")
            except Exception as exc:
                print(f"  Could not convert image {title}: {exc}")
                continue
            final_destination = destination.with_suffix(".jpg")
            metadata = info.get("extmetadata", {})
            def meta(key):
                return metadata.get(key, {}).get("value", "")
            used_titles.add(title)
            return {
                "saved_file": str(final_destination).replace("\\", "/"),
                "commons_title": title,
                "commons_page": "https://commons.wikimedia.org/wiki/" + requests.utils.quote(title.replace("File:", ""), safe="()!,"),
                "source_url": info.get("descriptionurl", ""),
                "artist": re.sub("<[^>]+>", "", meta("Artist")),
                "license": re.sub("<[^>]+>", "", meta("LicenseShortName")),
                "license_url": re.sub("<[^>]+>", "", meta("LicenseUrl")),
                "credit": re.sub("<[^>]+>", "", meta("Credit")),
                "query": query,
            }
        except requests.RequestException as exc:
            print(f"  Download failed for {title}: {exc}")
    return None

def main():
    try:
        import requests  # noqa
    except ImportError:
        raise SystemExit("Missing dependency. Run: python -m pip install requests")

    session = requests.Session()
    session.headers.update(HEADERS)
    used_titles = set()
    attribution_rows = []
    failed = []

    for category, items in COLLECTIONS.items():
        folder = IMAGE_ROOT / category
        folder.mkdir(parents=True, exist_ok=True)
        print(f"\n[{category}]")
        for record_id, query, filename in items:
            destination = folder / filename
            if destination.exists() and destination.stat().st_size > 10_000:
                print(f"  Keeping existing: {destination}")
                attribution_rows.append({
                    "record_id": record_id, "category": category,
                    "saved_file": str(destination).replace("\\", "/"),
                    "commons_title": "Existing file kept; verify source manually",
                    "commons_page": "", "source_url": "", "artist": "",
                    "license": "", "license_url": "", "credit": "", "query": query,
                })
                continue
            print(f"  Searching: {record_id} — {query}")
            result = download_one(session, query, destination, used_titles)
            if result:
                result.update({"record_id": record_id, "category": category})
                attribution_rows.append(result)
                print(f"    Saved: {result['saved_file']}")
            else:
                failed.append((record_id, query))
                print("    No suitable image found. Try another search phrase.")
            time.sleep(0.35)  # be polite to Wikimedia Commons

    csv_path = IMAGE_ROOT / "attribution.csv"
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "record_id", "category", "saved_file", "commons_title", "commons_page",
        "source_url", "artist", "license", "license_url", "credit", "query"
    ]
    with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(attribution_rows)

    print(f"\nFinished. Attribution list: {csv_path}")
    print(f"Successfully saved/kept: {len(attribution_rows)} / 36")
    if failed:
        print("\nThese files need another search phrase:")
        for record_id, query in failed:
            print(f"  {record_id}: {query}")
        print("\nDo not rename the successful files unless you also update your frontend paths.")

if __name__ == "__main__":
    main()
