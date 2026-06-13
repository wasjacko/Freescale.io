# Freescale — Landing page

Static marketing landing page for Freescale (the unified multi-channel inbox + AI copilot **Mue** for freelancers).

Plain **HTML / CSS / JS**, no build step.

## Run locally
Serve the folder with any static server, e.g.:

```bash
cd landing
python3 -m http.server 4321
# → http://localhost:4321
```

## Files
- `index.html` — page markup (hero · product screen · "Pourquoi" · gallery · pricing · FAQ · closer)
- `styles.css` — all styles (design tokens at the top)
- `script.js` — scroll/reveal interactions (word-wave titles, sticky morph, flying channel icons, FAQ, …)
- `three-icons.js` — real-time **Three.js** 3D step icons (loaded via an importmap CDN)
- `assets/` — images & icons

All copy is in French. Reference designs were provided iteratively.
