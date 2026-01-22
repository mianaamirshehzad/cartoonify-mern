const crypto = require('crypto');

function requestContext(req, res, next) {
  req.id = req.id || crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
}

module.exports = { requestContext };


