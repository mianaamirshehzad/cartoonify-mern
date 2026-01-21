const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    originalPath: { type: String, required: true },
    mimetype: { type: String, required: true },
    sizeBytes: { type: Number, required: true },

    processedName: { type: String, required: true },
    processedPath: { type: String, required: true },
    processedUrl: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Image', ImageSchema);
