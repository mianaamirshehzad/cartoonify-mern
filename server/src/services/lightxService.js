const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { env } = require('../config/env');

// Use built-in fetch (Node 18+) or fallback to node-fetch
let fetch;
if (typeof globalThis.fetch === 'function') {
  fetch = globalThis.fetch;
} else {
  fetch = require('node-fetch');
}

const LIGHTX_UPLOAD_URL = 'https://api.lightxeditor.com/external/api/v2/uploadImageUrl';
const LIGHTX_CARTOON_ENDPOINT = 'https://api.lightxeditor.com/external/api/v2/aifilter';

/**
 * Upload image to LightX using their Image Upload API
 * @param {string} filePath - Path to the local image file
 * @param {string} contentType - MIME type (e.g., 'image/jpeg', 'image/png')
 * @returns {Promise<string>} - The imageUrl that can be used for cartoon generation
 */
async function uploadImageToLightX(filePath, contentType) {
  if (!env.lightxApiKey) {
    throw new Error('LightX API key is not configured');
  }

  const fileBuffer = fs.readFileSync(filePath);
  const stats = fs.statSync(filePath);
  const size = stats.size;

  console.log(`Uploading image to LightX: size=${size}, contentType=${contentType}, apiKey=${env.lightxApiKey ? 'configured' : 'missing'}`);

  // Step 1: Get upload URL and imageUrl
  const requestBody = {
    uploadType: 'imageUrl',
    size: size,
    contentType: contentType
  };
  
  console.log('Sending request to LightX upload API:', {
    url: LIGHTX_UPLOAD_URL,
    method: 'POST',
    body: requestBody,
    hasApiKey: !!env.lightxApiKey,
    apiKeyLength: env.lightxApiKey?.length || 0
  });
  
  const uploadResponse = await fetch(LIGHTX_UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.lightxApiKey
    },
    body: JSON.stringify(requestBody)
  });

  console.log('LightX upload response status:', uploadResponse.status, uploadResponse.statusText);
  console.log('LightX upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('LightX upload URL error:', uploadResponse.status, errorText);
    throw new Error(`LightX upload URL request failed: ${uploadResponse.status} ${errorText}`);
  }

  let uploadData;
  try {
    uploadData = await uploadResponse.json();
  } catch (parseError) {
    const textResponse = await uploadResponse.text();
    console.error('Failed to parse LightX response as JSON:', textResponse);
    throw new Error(`LightX API returned invalid JSON: ${textResponse}`);
  }
  
  console.log('LightX upload response:', JSON.stringify(uploadData, null, 2));
  
  // Check if response contains an error
  if (uploadData.error || uploadData.message || uploadData.status === 'error') {
    const errorMsg = uploadData.error || uploadData.message || 'Unknown error from LightX API';
    console.error('LightX API error in response:', errorMsg);
    throw new Error(`LightX API error: ${errorMsg}`);
  }
  
  // LightX API might return different field names - check all possibilities
  // Also check nested structures (data.uploadImage, etc.)
  const uploadImage = uploadData.uploadImage 
    || uploadData.uploadUrl 
    || uploadData.upload_url 
    || uploadData.putUrl 
    || uploadData.put_url
    || uploadData.data?.uploadImage
    || uploadData.data?.uploadUrl
    || uploadData.result?.uploadImage;
    
  const imageUrl = uploadData.imageUrl 
    || uploadData.image_url 
    || uploadData.url 
    || uploadData.finalUrl 
    || uploadData.final_url
    || uploadData.data?.imageUrl
    || uploadData.data?.url
    || uploadData.result?.imageUrl;

  if (!uploadImage) {
    const availableKeys = Object.keys(uploadData);
    const fullResponse = JSON.stringify(uploadData, null, 2);
    console.error('Missing uploadImage/uploadUrl in response.');
    console.error('Available keys:', availableKeys);
    console.error('Full response structure:', fullResponse);
    
    // Create a more detailed error message
    const errorMsg = `Invalid response from LightX upload API: missing upload URL.\n` +
      `Response keys: ${availableKeys.join(', ')}\n` +
      `Full response: ${fullResponse}`;
    throw new Error(errorMsg);
  }

  if (!imageUrl) {
    const availableKeys = Object.keys(uploadData);
    const fullResponse = JSON.stringify(uploadData, null, 2);
    console.error('Missing imageUrl in response.');
    console.error('Available keys:', availableKeys);
    console.error('Full response structure:', fullResponse);
    
    // Create a more detailed error message
    const errorMsg = `Invalid response from LightX upload API: missing image URL.\n` +
      `Response keys: ${availableKeys.join(', ')}\n` +
      `Full response: ${fullResponse}`;
    throw new Error(errorMsg);
  }
  
  console.log('Successfully extracted uploadImage and imageUrl from response');

  // Step 1.1: PUT the image data to the uploadImage URL
  // For Node.js built-in fetch, Buffer works directly
  // For node-fetch, it also works with Buffer
  console.log(`PUTting image to: ${uploadImage.substring(0, 50)}...`);
  const putResponse = await fetch(uploadImage, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType
    },
    body: fileBuffer
  });

  if (!putResponse.ok) {
    const errorText = await putResponse.text();
    console.error('LightX PUT upload error:', putResponse.status, errorText);
    throw new Error(`LightX image upload failed: ${putResponse.status} ${errorText}`);
  }

  console.log('Image uploaded successfully to LightX, imageUrl:', imageUrl);
  return imageUrl;
}

/**
 * Generate cartoon using LightX AI Cartoon Generator API
 * @param {string} imageUrl - The imageUrl from LightX upload
 * @param {string} textPrompt - Optional text prompt for style (e.g., 'bright cartoon style, bold outlines')
 * @param {string} styleImageUrl - Optional style image URL
 * @returns {Promise<Object>} - The cartoon generation result
 */
async function generateCartoon(imageUrl, textPrompt = null, styleImageUrl = null) {
  const body = { imageUrl };
  
  if (textPrompt) {
    body.textPrompt = textPrompt;
  }
  
  if (styleImageUrl) {
    body.styleImageUrl = styleImageUrl;
  }

  const response = await fetch(LIGHTX_CARTOON_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.lightxApiKey
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LightX cartoon generation error:', response.status, errorText);
    throw new Error(`LightX cartoon generation failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log('LightX cartoon generation response:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Download image from URL and save it locally
 * @param {string} imageUrl - URL of the image to download
 * @param {string} outputDir - Directory to save the image
 * @param {string} extension - File extension (e.g., 'jpg', 'png')
 * @returns {Promise<{outName: string, outPath: string}>}
 */
async function downloadAndSaveImage(imageUrl, outputDir, extension = 'jpg') {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Downloading cartoon from: ${imageUrl}`);
  const response = await fetch(imageUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  // Handle both built-in fetch (arrayBuffer) and node-fetch (buffer)
  let buffer;
  if (response.buffer) {
    // node-fetch
    buffer = await response.buffer();
  } else {
    // built-in fetch
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  const id = uuidv4();
  const outName = `cartoon-${id}.${extension}`;
  const outPath = path.join(outputDir, outName);

  fs.writeFileSync(outPath, buffer);

  return { outName, outPath };
}

/**
 * Main function: Upload image, generate cartoon, and save result
 * @param {string} inputPath - Path to the local input image
 * @param {string} outputDirAbs - Absolute path to output directory
 * @param {string} mimetype - MIME type of the input image
 * @param {string} textPrompt - Optional text prompt for cartoon style
 * @param {string} styleImageUrl - Optional style image URL
 * @returns {Promise<{outName: string, outPath: string, cartoonUrl: string}>}
 */
async function cartoonizeWithLightX(inputPath, outputDirAbs, mimetype, textPrompt = null, styleImageUrl = null) {
  // Determine content type
  const contentType = mimetype || 'image/jpeg';
  
  // Upload image to LightX
  const imageUrl = await uploadImageToLightX(inputPath, contentType);
  
  // Generate cartoon
  const cartoonResult = await generateCartoon(imageUrl, textPrompt, styleImageUrl);
  
  // Extract the cartoon image URL from the response
  // The response structure may vary, but typically contains an 'imageUrl' or 'outputUrl' field
  const cartoonUrl = cartoonResult.imageUrl || cartoonResult.outputUrl || cartoonResult.url || cartoonResult.resultUrl || cartoonResult.data?.imageUrl || cartoonResult.data?.outputUrl;
  
  if (!cartoonUrl) {
    console.error('LightX API response structure:', JSON.stringify(cartoonResult, null, 2));
    throw new Error(`Cartoon generation succeeded but no image URL in response. Response keys: ${Object.keys(cartoonResult).join(', ')}`);
  }

  // Download and save the cartoon image
  const extension = 'jpg'; // LightX returns JPEG format
  const { outName, outPath } = await downloadAndSaveImage(cartoonUrl, outputDirAbs, extension);

  return { outName, outPath, cartoonUrl };
}

module.exports = { cartoonizeWithLightX };
