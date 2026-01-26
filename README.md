## Cartoonify (MERN)

Full‑stack MERN app that uploads a photo and transforms it into a cartoon using **Cloudinary** (cartoonify effect). Optionally stores metadata in MongoDB and returns a URL for preview + download.

### What you get

- **Frontend (React + hooks)**: clean UI, upload preview, validation, loading state, error handling, result preview, download button
- **Backend (Node + Express)**: upload + Cloudinary transformation, MongoDB metadata (optional), rate limiting + basic security
- **Database (MongoDB)**: stores metadata and generated cartoon image URLs
- **Image transformation**: Uses Cloudinary `e_cartoonify` effect for the cartoon look
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
# create server/.env (copy from server/env.template) and add Cloudinary credentials
npm install
npm run dev
```

API: `http://localhost:5050`

### 3) Start frontend

In a new terminal:

```bash
cd client
# create client/.env (copy from client/env.template)
npm install
npm run dev
```

UI: `http://localhost:5173`

---

## Environment variables

### Server (`server/.env`)

Copy `server/env.template` to `server/.env` (recommended) or `<repo-root>/.env`. Key ones:

- **`MONGODB_URI`**: Mongo connection
- **`PUBLIC_BASE_URL`**: base URL used to build returned PNG URLs (set this to your hosted API domain in production)
- **`CORS_ORIGIN`**: allowed origins (React dev URL, WordPress domain)
- **`MAX_FILE_SIZE_BYTES`**: backend file size limit
- **`CLOUDINARY_CLOUD_NAME`**, **`CLOUDINARY_API_KEY`**, **`CLOUDINARY_API_SECRET`**: your Cloudinary credentials (required)
- **`AI_STYLE_API_URL`** (optional): enable `pixar_3d` style by pointing to an external image-to-image stylization API
- **`AI_STYLE_API_KEY`** (optional): bearer token sent as `Authorization: Bearer <key>`
- **`AI_STYLE_TIMEOUT_MS`** (optional): request timeout for the AI style API
- **`AI_STYLE_PROMPT_PIXAR_3D`** (optional): override the default Pixar-style prompt

### Client (`client/.env`)

Copy `client/env.template` to `client/.env`:

- **`VITE_API_BASE_URL`**: your backend API base URL
- **`VITE_CLOUDINARY_CLOUD_NAME`**: your Cloudinary cloud name (used by the Cloudinary React SDK to render transformations)

---

## API routes (examples)

### Health

- `GET /api/health`

### Upload + cartoonize

- `POST /api/images/cartoonize`
  - Content-Type: `multipart/form-data`
  - Field name: `image`
  - Optional field: `style` = `cloudinary` | `cloudinary_clean` | `pixar_3d`
  - Uploads to Cloudinary and returns the result URL (kept for back-compat)

### Cartoonify (base64 or URL)

- `POST /api/cartoonify`
  - Content-Type: `application/json`
  - Body: `{ "imagePath": "<base64 data URI or remote URL>", "style": "cloudinary|cloudinary_clean|pixar_3d" }`
  - Returns `{ success, cartoonUrl, publicId, style, provider }`

### Pixar-style (AI) notes

Cloudinary Generative AI transformations support prompts for **editing operations** (background replace/fill, remove, replace, recolor, restore), but they do **not** provide a documented prompt-based “style transfer” effect (e.g. `gen_style`) to convert a photo into a Pixar-like 3D portrait.

This repo supports Pixar-style output by calling an **external AI stylization API** when `style: "pixar_3d"` is requested, then re-uploading the result to Cloudinary.

The server calls `AI_STYLE_API_URL` with:

- JSON body: `{ "style": "pixar_3d", "prompt": "...", "image": "<data-uri>" }`

Your AI service must respond with one of:

- `{ "imageUrl": "https://..." }`
- `{ "imageBase64": "data:image/png;base64,..." }` or `{ "imageBase64": "<base64>" }`
- OpenAI-like: `{ "data": [ { "url": "https://..." } ] }` or `{ "data": [ { "b64_json": "<base64>" } ] }`

Example cURL:

```bash
curl -F "image=@/path/to/photo.jpg" http://localhost:5050/api/images/cartoonize
```

Example response (cartoonify):

```json
{
  "success": true,
  "cartoonUrl": "https://res.cloudinary.com/.../image/upload/...jpg",
  "publicId": "cartoon_app/abc123"
}
```

### Fetch metadata

- `GET /api/images/:id`

---

## Cartoon Generation (Cloudinary)

The backend uploads your image to Cloudinary and applies `e_cartoonify:<line_strength>:<color_reduction>` plus `q_auto` and `f_auto`.

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

