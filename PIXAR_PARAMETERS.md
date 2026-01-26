# Pixar 3D Style Refinement Parameters

This document explains the parameters available to refine the Pixar 3D cartoon conversion results.

## Available Parameters

All parameters can be adjusted via the request body when uploading an image. If not provided, default values are used.

### Color & Vibrancy Parameters

#### `pixarSaturation` (Default: 35)
- **Range**: 0-100
- **Effect**: Initial color saturation boost
- **Higher values**: More vibrant, colorful images
- **Lower values**: More muted, subtle colors
- **Recommended range**: 25-50

#### `pixarVibrance` (Default: 25)
- **Range**: 0-100
- **Effect**: Color vibrance/intensity
- **Higher values**: More vivid, eye-catching colors
- **Lower values**: Softer, more natural colors
- **Recommended range**: 15-35

#### `pixarFinalSaturation` (Default: 20)
- **Range**: 0-100
- **Effect**: Final saturation adjustment after other effects
- **Purpose**: Fine-tune overall color warmth
- **Recommended range**: 15-30

### Cartoonify Parameters

#### `pixarLineStrength` (Default: 30)
- **Range**: 0-100
- **Effect**: Strength of cartoon outline/edges
- **Higher values**: Stronger, more defined lines (more cartoon-like)
- **Lower values**: Softer, smoother lines (more 3D-like)
- **Recommended range**: 20-40
- **Note**: Lower values create a smoother, more Pixar-like appearance

#### `pixarColorReduction` (Default: 35)
- **Range**: 0-100
- **Effect**: Number of colors in the final image
- **Higher values**: Fewer colors, more flat/shaded look
- **Lower values**: More colors, more detailed/gradient look
- **Recommended range**: 25-45
- **Note**: Lower values preserve more detail and gradients

### Brightness & Contrast Parameters

#### `pixarBrightness` (Default: 10)
- **Range**: -100 to 100
- **Effect**: Overall image brightness
- **Positive values**: Brighter image
- **Negative values**: Darker image
- **Recommended range**: 5-20 for brighter Pixar look
- **Note**: Pixar style typically uses positive values for that bright, cheerful look

#### `pixarContrast` (Default: 20)
- **Range**: -100 to 100
- **Effect**: Contrast between light and dark areas
- **Positive values**: More contrast, more dramatic
- **Negative values**: Less contrast, softer look
- **Recommended range**: 15-30
- **Note**: Moderate positive values enhance the 3D effect

### Detail Parameters

#### `pixarSharpen` (Default: 30)
- **Range**: 0-100
- **Effect**: Sharpening intensity for crisp details
- **Higher values**: Sharper, more defined details
- **Lower values**: Softer, smoother appearance
- **Recommended range**: 20-40
- **Note**: Too high can create artifacts, too low loses detail

## How to Use

### Option 1: Adjust in Code (Server-side)

Edit `server/src/controllers/imageController.js` and modify the default values:

```javascript
const pixarParams = {
  style,
  pixarSaturation: 40,        // Increase for more vibrant colors
  pixarVibrance: 30,           // Increase for more vivid colors
  pixarLineStrength: 25,      // Decrease for smoother lines
  pixarColorReduction: 30,    // Decrease for more color detail
  pixarBrightness: 15,         // Increase for brighter images
  pixarContrast: 25,           // Increase for more contrast
  pixarSharpen: 35,            // Increase for sharper details
  pixarFinalSaturation: 25    // Fine-tune final color
};
```

### Option 2: Send via Request (Future Enhancement)

You can modify the frontend to send these parameters in the request body:

```javascript
formData.append('pixarSaturation', '40');
formData.append('pixarLineStrength', '25');
// ... etc
```

## Recommended Presets

### Softer Pixar Look
- `pixarLineStrength: 20`
- `pixarColorReduction: 30`
- `pixarBrightness: 12`
- `pixarContrast: 18`
- `pixarSharpen: 25`

### Bold Pixar Look
- `pixarLineStrength: 40`
- `pixarColorReduction: 45`
- `pixarBrightness: 15`
- `pixarContrast: 25`
- `pixarSharpen: 35`

### Vibrant Pixar Look
- `pixarSaturation: 45`
- `pixarVibrance: 35`
- `pixarFinalSaturation: 25`
- `pixarBrightness: 12`

## Testing Tips

1. Start with default values
2. Adjust one parameter at a time to see its effect
3. Test with different types of images (portraits, landscapes, etc.)
4. Keep notes on what works best for your use case
5. Remember: Lower line strength = smoother, more 3D-like
6. Remember: Lower color reduction = more detail and gradients

## Current Default Values Summary

```javascript
pixarSaturation: 35
pixarVibrance: 25
pixarLineStrength: 30
pixarColorReduction: 35
pixarBrightness: 10
pixarContrast: 20
pixarSharpen: 30
pixarFinalSaturation: 20
```

These defaults are optimized for a balanced Pixar 3D animation style.
