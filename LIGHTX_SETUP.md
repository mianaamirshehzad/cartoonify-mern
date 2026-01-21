# LightX API Setup Guide

## Quick Start

1. **Get your LightX API Key**
   - Visit [LightX API](https://api.lightxeditor.com) to sign up and get your API key
   - Free trial includes 25 credits

2. **Configure Environment Variables**
   - Create a `.env` file in the `server/` directory (or copy from `.env.example` if available)
   - Add your API key:
     ```
     LIGHTX_API_KEY=your_api_key_here=
     ```

3. **Install Dependencies** (if not already done)
   ```bash
   cd server
   npm install
   ```

4. **Start the Server**
   ```bash
   cd server
   npm run dev
   ```

5. **Start the Client** (in a new terminal)
   ```bash
   cd client
   npm install
   npm run dev
   ```

6. **Test the Application**
   - Open http://localhost:5173 in your browser
   - Upload an image (minimum 512x512 pixels, max 5MB)
   - Wait for the AI cartoon generation (may take 10-30 seconds)
   - Download your cartoon result!

## API Endpoints

### POST /api/images/cartoonize
Upload an image and generate a cartoon.

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `image` (required)
- Optional fields:
  - `textPrompt`: Style description (e.g., "bright cartoon style, bold outlines")
  - `styleImageUrl`: URL of a style reference image

**Response:**
```json
{
  "pngUrl": "http://localhost:5050/static/processed/cartoon-xxx.jpg",
  "originalName": "photo.jpg",
  "lightxCartoonUrl": "https://...",
  "imageId": "65a..."
}
```

## Notes

- Each cartoon generation costs **1 credit**
- Images must be at least **512x512 pixels**
- Maximum file size: **5 MB**
- Supported formats: **JPEG, PNG**
- The generated cartoon is saved locally and also available via the LightX URL (valid for 24 hours)

## Troubleshooting

**Error: "LightX API key not configured"**
- Make sure you've set `LIGHTX_API_KEY` in your `.env` file
- Restart the server after adding the environment variable

**Error: "Cartoon generation failed"**
- Check your API key is valid
- Ensure you have credits remaining
- Verify the image meets size requirements (min 512x512)

**Error: "No image URL in response"**
- Check the server logs for the actual API response
- The LightX API response structure may have changed
