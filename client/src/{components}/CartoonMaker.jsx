import React, { useEffect, useState } from 'react';
import axios from 'axios';

// In local dev, default to the API dev server if not configured via env.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050').replace(/\/$/, '');

export default function CartoonMaker() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [publicId, setPublicId] = useState('');
  const [cartoonUrl, setCartoonUrl] = useState('');
  const [error, setError] = useState('');
  // Always use Pixar 3D style
  const style = 'pixar';

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onFileChange(e) {
    const next = e.target.files?.[0] || null;
    setFile(next);
    setError('');
    setPublicId('');
    setCartoonUrl('');
  }

  async function startCartoonify() {
    if (!file || loading) return;

    setError('');
    setPublicId('');
    setCartoonUrl('');

    const reader = new FileReader();
    reader.readAsDataURL(file);

    setLoading(true);

    reader.onloadend = async () => {
      try {
        // Use FormData for multipart upload (matches backend route)
        const formData = new FormData();
        formData.append('image', file);
        formData.append('style', style);

        const { data } = await axios.post(
          `${API_BASE_URL}/api/images/cartoonize`,
          formData,
          { 
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000 // 2 minutes for processing
          }
        );

        // Backend returns pngUrl or cartoonUrl
        setPublicId(data.publicId || '');
        setCartoonUrl(data.pngUrl || data.cartoonUrl || '');
      } catch (err) {
        setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Upload failed');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setLoading(false);
      setError('Could not read the selected file.');
    };
  }

  function downloadResult() {
    if (!cartoonUrl) return;
    const a = document.createElement('a');
    a.href = cartoonUrl;
    a.download = 'converted-image';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="page">
      <header className="header">
        <h1>iFoodie Cartoonify</h1>
        <p>Upload an image and transform it into cartoonish style using iFoodie</p>
      </header>

      <main className="grid">
        <section className="card">
          <h2>Upload</h2>
          <div className="cardContent">
            <div className="cardTopSlot">
              <label className="fileLabel">
                <span>Choose an image</span>
                <input type="file" onChange={onFileChange} accept="image/*" />
              </label>
            </div>

            {previewUrl ? (
              <div className="preview">
                <div className="caption">Selected image</div>
                <div className="imageFrame">
                  <img className="frameImg" src={previewUrl} alt="Selected preview" />
                </div>
              </div>
            ) : (
              <div className="placeholder big">No image selected.</div>
            )}

            {error ? <div className="error">{error}</div> : null}
          </div>

          <div className="cardActions">
            <button className="btn" type="button" disabled={!file || loading} onClick={startCartoonify}>
              {loading ? 'Converting…' : 'Convert'}
            </button>
          </div>
        </section>

        <section className="card resultCard">
          <h2>Result</h2>
          <div className="cardContent">
            <div className="cardTopSlot">
              <div className="fileLabel">
                <span>Results will appear here</span>
                <div className="topSlotSpacer" aria-hidden="true" />
              </div>
            </div>

            {loading || cartoonUrl ? (
              <div className="preview">
                <div className="caption">Converted image</div>
                <div className="imageFrame">
                  {loading ? (
                    <div className="framePlaceholder">
                      <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
                        <div className="spinner" />
                        <div>Processing…</div>
                      </div>
                    </div>
                  ) : (
                    <img className="frameImg" src={cartoonUrl} alt="Converted image" />
                  )}
                </div>
              </div>
            ) : (
              <div className="placeholder big">
                No result yet.
              </div>
            )}
          </div>

          <div className="cardActions">
            <button className="btn" type="button" disabled={!cartoonUrl || loading} onClick={downloadResult}>
              Download
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}


