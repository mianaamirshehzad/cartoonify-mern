const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    originalPath: { type: String },
    mimetype: { type: String, required: true },
    sizeBytes: { type: Number, required: true },

    // Legacy filesystem fields (optional now that Cloudinary is used)
    processedName: { type: String },
    processedPath: { type: String },

    // Result URL (can be local /static/processed/... or Cloudinary secure_url)
    processedUrl: { type: String },

    // Cloudinary metadata
    cloudinaryPublicId: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Image', ImageSchema);
