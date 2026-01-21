const path = require('path');
const Jimp = require('jimp');
const { v4: uuidv4 } = require('uuid');

/**
 * Filter-based “cartoon” effect:
 * - smooth (blur)
 * - boost colors a bit
 * - reduce colors (posterize) for flatter “toon” regions
 * - detect edges (convolution) and blend black lines on top
 */
async function cartoonizeToPng(inputPath, outputDirAbs) {
  const id = uuidv4();
  const outName = `cartoon-${id}.png`;
  const outPath = path.join(outputDirAbs, outName);

  const image = await Jimp.read(inputPath);

  // Keep processing fast + stable (avoid huge images on cheap hosts)
  if (image.getWidth() > 1400) {
    image.resize(1400, Jimp.AUTO);
  }

  // Base "toon" look: smooth + saturate + posterize (flatter color regions)
  const poster = image
    .clone()
    .blur(2)
    .contrast(0.15)
    .brightness(0.03)
    .color([{ apply: 'saturate', params: [35] }])
    .posterize(7);

  // Edge detection (Laplacian) -> convert into black lines on white background
  const laplacianKernel = [
    [-1, -1, -1],
    [-1,  8, -1],
    [-1, -1, -1]
  ];

  const edges = image
    .clone()
    .greyscale()
    .convolute(laplacianKernel)
    .contrast(1)
    // Make background white, edges dark
    .invert()
    // Slight blur fattens the linework a bit before binarizing
    .blur(1)
    .threshold({ max: 210 });

  // Blend edges onto posterized image (multiply keeps black lines)
  poster.composite(edges, 0, 0, {
    mode: Jimp.BLEND_MULTIPLY,
    opacitySource: 0.95,
    opacityDest: 1
  });

  await poster.writeAsync(outPath);

  return { outName, outPath };
}

module.exports = { cartoonizeToPng };
