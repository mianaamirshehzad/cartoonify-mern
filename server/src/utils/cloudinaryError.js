function extractCloudinaryError(err) {
  // cloudinary SDK commonly returns: { error: { message, http_code, name } }
  const e = err?.error || err;

  return {
    name: e?.name || err?.name,
    message: e?.message || err?.message,
    http_code: e?.http_code,
    code: err?.code
  };
}

module.exports = { extractCloudinaryError };


