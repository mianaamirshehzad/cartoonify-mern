import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { Cloudinary } from '@cloudinary/url-gen';
import { AdvancedImage } from '@cloudinary/react';
import { cartoonify } from '@cloudinary/url-gen/actions/effect';

// In local dev, default to the API dev server if not configured via env.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050').replace(/\/$/, '');
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';

export default function CartoonMaker() {
  const [loading, setLoading] = useState(false);
  const [publicId, setPublicId] = useState('');
  const [cartoonUrl, setCartoonUrl] = useState('');
  const [error, setError] = useState('');

  const cld = useMemo(() => {
    if (!CLOUD_NAME) return null;
    return new Cloudinary({ cloud: { cloudName: CLOUD_NAME } });
  }, []);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setPublicId('');
    setCartoonUrl('');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      setLoading(true);
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
  }

  const myImage = useMemo(() => {
    if (!cld || !publicId) return null;
    // Render using SDK transformation (you can tweak these numbers)
    return cld.image(publicId).effect(cartoonify().lineStrength(40).colorReduction(70));
  }, [cld, publicId]);

  return (
    <div className="page">
      <header className="header">
        <h1>Cartoonify</h1>
        <p>Upload an image and transform it into a cartoon using Cloudinary.</p>
      </header>

      <main className="grid">
        <section className="card">
          <h2>1) Upload</h2>
          <label className="fileLabel">
            <span>Choose an image</span>
            <input type="file" onChange={handleUpload} accept="image/*" />
          </label>

          {loading ? <div className="placeholder">Processing cartoon…</div> : null}
          {error ? <div className="error">{error}</div> : null}
        </section>

        <section className="card">
          <h2>2) Result</h2>
          {myImage ? (
            <div className="preview">
              <div className="caption">Cartoon</div>
              <AdvancedImage cldImg={myImage} style={{ maxWidth: '100%' }} />
            </div>
          ) : cartoonUrl ? (
            <div className="preview">
              <div className="caption">Cartoon</div>
              <img src={cartoonUrl} alt="Cartoon result" style={{ maxWidth: '100%' }} />
            </div>
          ) : (
            <div className="placeholder">No result yet.</div>
          )}
        </section>
      </main>
    </div>
  );
}


