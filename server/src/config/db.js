const mongoose = require('mongoose');

async function connectDb(mongodbUri) {
  mongoose.set('strictQuery', true);
  // Fail fast in local-dev when Mongo isn't running so the API can still boot.
  await mongoose.connect(mongodbUri, {
    serverSelectionTimeoutMS: 1500,
    connectTimeoutMS: 1500
  });
  return mongoose.connection;
}

module.exports = { connectDb };
