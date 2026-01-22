import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Cloudinary } from '@cloudinary/url-gen';
import { AdvancedImage } from '@cloudinary/react';
import { cartoonify } from '@cloudinary/url-gen/actions/effect';

// In local dev, default to the API dev server if not configured via env.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050').replace(/\/$/, '');
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';

export default function CartoonMaker() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [publicId, setPublicId] = useState('');
  const [cartoonUrl, setCartoonUrl] = useState('');
  const [error, setError] = useState('');

  const cld = useMemo(() => {
    if (!CLOUD_NAME) return null;
    return new Cloudinary({ cloud: { cloudName: CLOUD_NAME } });
  }, []);

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
        const { data } = await axios.post(
          `${API_BASE_URL}/api/cartoonify`,
          { imagePath: reader.result },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (!data?.success) {
          throw new Error(data?.message || 'Cartoonify failed');
        }

        // Prefer using the backend-returned publicId (more reliable than parsing URL)
        setPublicId(data.publicId || '');
        setCartoonUrl(data.cartoonUrl || '');
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || 'Upload failed');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setLoading(false);
      setError('Could not read the selected file.');
    };
  }

  const myImage = useMemo(() => {
    if (!cld || !publicId) return null;
    // Render using SDK transformation (you can tweak these numbers)
    return cld.image(publicId).effect(cartoonify().lineStrength(40).colorReduction(70));
  }, [cld, publicId]);

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

            {loading || myImage || cartoonUrl ? (
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
                  ) : myImage ? (
                    <AdvancedImage cldImg={myImage} className="frameImg" />
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


