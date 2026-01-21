// In local dev, default to the API dev server if not configured via env.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050').replace(/\/$/, '');

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export function validateFile(file) {
  if (!file) return 'Please choose an image.';
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPG, JPEG, and PNG files are allowed.';
  if (file.size > MAX_FILE_SIZE_BYTES) return 'File is too large (max 5MB).';
  return null;
}

export async function uploadAndCartoonize(file) {
  const form = new FormData();
  form.append('image', file);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(`${API_BASE_URL}/api/images/cartoonize`, {
      method: 'POST',
      body: form,
      signal: controller.signal
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.error || 'Upload failed.';
      throw new Error(msg);
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}
