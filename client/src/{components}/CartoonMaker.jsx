import React, { useEffect, useState } from 'react';
import axios from 'axios';

// In local dev, default to the API dev server if not configured via env.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050').replace(/\/$/, '');

export default function CartoonMaker() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
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

  async function downloadResult() {
    if (!cartoonUrl || downloading) return;

    setDownloading(true);
    setError('');

    try {
      // Add minimum delay for better UX (ensures "Downloading..." is visible)
      const minDelay = 800; // 800ms minimum delay
      const startTime = Date.now();

      // Fetch the image as a blob to ensure proper download
      const response = await fetch(cartoonUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image for download');
      }

      const blob = await response.blob();
      
      // Calculate remaining time to meet minimum delay
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, minDelay - elapsed);
      
      // Wait for remaining delay if needed
      if (remainingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingDelay));
      }
      
      // Create a blob URL and trigger download
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      
      // Generate a filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      a.download = `pixar-cartoon-${timestamp}.png`;
      a.rel = 'noreferrer';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err?.message || 'Failed to download image');
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
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
            <button 
              className="btn" 
              type="button" 
              disabled={!cartoonUrl || loading || downloading} 
              onClick={downloadResult}
            >
              {downloading ? 'Downloading…' : 'Download'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}


