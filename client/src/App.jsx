import React, { useEffect, useMemo, useState } from 'react';
import { uploadAndCartoonize, validateFile } from './api.js';

export default function App() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [imageId, setImageId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canSubmit = useMemo(() => !!file && !loading, [file, loading]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setResultUrl('');
    setImageId('');

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const data = await uploadAndCartoonize(file);
      setResultUrl(data.pngUrl);
      setImageId(data.imageId);
    } catch (err) {
      setError(err?.name === 'AbortError' ? 'Request timed out. Please try a smaller image.' : (err?.message || 'Something went wrong.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Cartoonify</h1>
        <p>Upload an image and download a cartoon-style PNG (filter-based processing, no AI API).</p>
      </header>

      <main className="grid">
        <section className="card">
          <h2>1) Upload</h2>

          <form onSubmit={onSubmit}>
            <label className="fileLabel">
              <span>Choose an image (JPG/JPEG/PNG, max 5MB)</span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => {
                  setError('');
                  setResultUrl('');
                  setImageId('');
                  setFile(e.target.files?.[0] || null);
                }}
              />
            </label>

            {previewUrl ? (
              <div className="preview">
                <div className="caption">Preview</div>
                <img src={previewUrl} alt="Upload preview" />
              </div>
            ) : (
              <div className="placeholder">No file selected.</div>
            )}

            <button className="btn" type="submit" disabled={!canSubmit}>
              {loading ? 'Processing…' : 'Create cartoon PNG'}
            </button>

            {error ? <div className="error">{error}</div> : null}
          </form>
        </section>

        <section className="card">
          <h2>2) Result</h2>

          {loading ? (
            <div className="placeholder">Working… this can take ~5–15 seconds depending on size.</div>
          ) : resultUrl ? (
            <>
              <div className="preview">
                <div className="caption">Cartoon PNG</div>
                <img src={resultUrl} alt="Cartoon result" />
              </div>

              <div className="actions">
                <a className="btn secondary" href={resultUrl} download>
                  Download PNG
                </a>
              </div>

              {imageId ? (
                <div className="meta">
                  <div><strong>Image ID:</strong> {imageId}</div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="placeholder">No result yet.</div>
          )}
        </section>
      </main>

      <footer className="footer">
        <small>
          Configure the backend URL via <code>VITE_API_BASE_URL</code> (for WordPress, point this to your hosted API).
        </small>
      </footer>
    </div>
  );
}
