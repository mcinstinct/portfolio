# Portfolio globe prototype

A local-only COBE dot-map globe for trying against the current portfolio. Nothing on this branch is deployed.

## Run it

```bash
npm install
npm run dev
```

Open the local URL Vite prints (normally `http://localhost:5173`).

## Add or change dots

Edit **`locations.js`**, the only location-data file:

```js
{ label: 'Lisbon, Portugal', lat: 38.7223, lon: -9.1393 }
```

The 29 included locations are Matt's current visited-place list. The globe spins slowly and can be dragged. Click a marker to center it, pause rotation, and pin its full location label. Click off to resume. There are no connecting arcs. Reduced-motion preferences stop rotation and pulsing.
