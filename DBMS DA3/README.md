# SmartMuseum — image-based Neo4j application

This project uses the existing Neo4j Aura graph database, an Express API, and a responsive HTML/CSS/JavaScript frontend. The database schema and records are not changed by the image upgrade.

## Project structure

```text
smartmuseum/
  database.cypher                 # original schema/sample data; unchanged
  backend/
    server.js
    package.json
    .env.example
  frontend/
    index.html
    app.js
    styles.css
    images/                        # created by the image downloader
      artifacts/                   # 12 distinct record images
      galleries/                   # 10 distinct record images
      exhibitions/                 # 6 distinct record images
      events/                      # 8 distinct record images
  scripts/
    download_museum_images.py
```

## 1. Configure Neo4j Aura

In a terminal opened in `smartmuseum/backend`, install packages:

```powershell
npm install
```

Copy `.env.example` to `.env`, then enter the URI, username, and password for your existing Neo4j Aura database. Do not share or commit `.env`.

The backend defaults to port `3001`, matching `frontend/app.js`.

## 2. Download 36 distinct image files

Open a second terminal in the `smartmuseum` project root (the folder containing `database.cypher`) and run:

```powershell
python -m pip install requests pillow
python scripts/download_museum_images.py
```

The script searches Wikimedia Commons for each artifact/gallery/exhibition/event, downloads a separate image file for each stable ID, and writes `frontend/images/attribution.csv` with the source page and license details. It tracks Commons file titles during a run to avoid assigning the same file twice. Review the downloaded photographs and attribution before submission. If a record reports “No suitable image found,” adjust that record's search phrase in the script and run it again.

The photographs are downloaded on your computer because this project bundle does not embed third-party images. Before downloading, the frontend shows a neutral fallback with the record's name; it does not display a different record's photograph as a substitute.

## 3. Start the backend

In the backend terminal:

```powershell
npm start
```

Expected message:

```text
SmartMuseum API running at http://localhost:3001
```

Keep this terminal open. Check `http://localhost:3001/api/health` in your browser. It should report `Neo4j connected`.

## 4. Start the frontend

In VS Code, open `frontend/index.html` with Live Server, or serve the frontend folder with a local static server. Do not open the HTML as a `file://` URL if your browser blocks requests.

## 5. Image and database behavior

- Artifacts, galleries, exhibitions, and events are fetched from the existing API.
- Image filenames are associated with stable database IDs, not array positions.
- If a database record already has an image URL property, the frontend can use it; otherwise it uses that record ID's local image file.
- If an image is missing or fails to load, only that card's image area changes to a neutral fallback with the record name.
- The backend uses parameterized search input and returns unique artifact rows even when an artifact has multiple gallery relationships.
- The image script writes local files and an attribution CSV only. It does not write to Neo4j, alter labels/properties, delete records, or change relationships.

## API routes used by the frontend

- `GET /api/health`
- `GET /api/stats`
- `GET /api/artifacts?search=...`
- `GET /api/galleries`
- `GET /api/exhibitions`
- `GET /api/events`

## Database safety

`database.cypher` is included unchanged. The image upgrade does not require rerunning any Cypher script and does not change the 23 entity labels or existing graph relationships.
