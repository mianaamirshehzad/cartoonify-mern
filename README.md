## Cartoonify (MERN)

Full‑stack MERN app that uploads a photo, applies a **filter-based cartoon effect** on the backend (no paid AI APIs), saves the PNG result, stores metadata in MongoDB, and returns a URL for preview + download.

### What you get

- **Frontend (React + hooks)**: clean UI, upload preview, validation, loading state, error handling, result preview, download button
- **Backend (Node + Express)**: multipart upload, filter-based image processing (Jimp), filesystem storage, MongoDB metadata, rate limiting + basic security
- **Database (MongoDB)**: stores metadata and generated PNG URLs
- **Deploy-ready**: configurable via environment variables

---

## Folder structure

- `cartoonify-mern/`
  - `client/`
    - `src/App.jsx` UI
    - `src/api.js` API calls + validation
  - `server/`
    - `src/app.js` Express app
    - `src/routes/imageRoutes.js` API routes
    - `src/services/cartoonService.js` cartoon effect
    - `uploads/` original uploads (local)
    - `processed/` generated PNGs (local)
  - `docker-compose.yml` local MongoDB

---

## Run locally

### Prerequisites

- Node.js 18+ (recommended)
- Docker Desktop (for MongoDB) OR use your own Mongo connection string

### 1) Start MongoDB

From repo root:

```bash
docker compose up -d
```

### 2) Start backend API

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

API: `http://localhost:5050`

### 3) Start frontend

In a new terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

UI: `http://localhost:5173`

---

## Environment variables

### Server (`server/.env`)

See `server/.env.example`. Key ones:

- **`MONGODB_URI`**: Mongo connection
- **`PUBLIC_BASE_URL`**: base URL used to build returned PNG URLs (set this to your hosted API domain in production)
- **`CORS_ORIGIN`**: allowed origins (React dev URL, WordPress domain)
- **`MAX_FILE_SIZE_BYTES`**: backend file size limit

### Client (`client/.env`)

See `client/.env.example`:

- **`VITE_API_BASE_URL`**: your backend API base URL

---

## API routes (examples)

### Health

- `GET /api/health`

### Upload + cartoonize

- `POST /api/images/cartoonize`
  - Content-Type: `multipart/form-data`
  - Field name: `image`
  - Validates type + size (frontend and backend)
  - Produces a PNG and returns its URL

Example cURL:

```bash
curl -F "image=@/path/to/photo.jpg" http://localhost:5050/api/images/cartoonize
```

Example response:

```json
{
  "imageId": "65a...",
  "pngUrl": "http://localhost:5050/static/processed/cartoon-...png",
  "originalName": "photo.jpg"
}
```

### Fetch metadata

- `GET /api/images/:id`

---

## Image processing approach (filter-based, no AI API)

Backend applies:

- **Smoothing**: blur
- **Color reduction**: posterize
- **Edge detection**: convolution kernel + threshold
- **Blend**: multiply edges over reduced-color base

Implementation: `server/src/services/cartoonService.js`.

---

## WordPress integration (frontend calls API)

Your backend API will be hosted externally (VPS/shared hosting with Node support). WordPress can then call it via normal HTTP.

### Option A: Plain WordPress page + JS (no React)

Add a simple file input in a WP page/template and call your API:

```js
async function cartoonize(file) {
  const form = new FormData();
  form.append('image', file);

  const res = await fetch('https://api.yourdomain.com/api/images/cartoonize', {
    method: 'POST',
    body: form
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Upload failed');

  // data.pngUrl is your downloadable PNG
  return data.pngUrl;
}
```

### Option B: Embed the React app into WordPress

1. Build React with your API base URL:

```bash
cd client
# set VITE_API_BASE_URL in client/.env before building
npm run build
```

2. Copy `client/dist/` into your theme, e.g.

- `wp-content/themes/YOUR_THEME/cartoonify/`

3. Enqueue assets in `functions.php` (example):

```php
function cartoonify_enqueue() {
  $dir = get_stylesheet_directory_uri() . '/cartoonify/assets/';
  wp_enqueue_script('cartoonify', $dir . 'index-xxxxx.js', array(), null, true);
  wp_enqueue_style('cartoonify-css', $dir . 'index-xxxxx.css', array(), null);
}
add_action('wp_enqueue_scripts', 'cartoonify_enqueue');
```

4. Add `<div id="root"></div>` in the page template where you want the UI.

### Important: CORS

Set backend `CORS_ORIGIN` to your WordPress site origin:

- Example: `CORS_ORIGIN=https://yourwordpresssite.com`

---

## Hosting notes

- **Filesystem storage**: current backend writes to `server/processed/` and serves via `/static/processed/...`.
- **Cloud storage** (optional): replace the “save to filesystem” step in `server/src/controllers/imageController.js` with S3/Spaces/MinIO upload, and store that URL in Mongo.

