function redactValue(key, value) {
  const k = String(key || '').toLowerCase();
  if (k.includes('secret') || k.includes('password') || k.includes('api_key') || k.includes('apikey')) {
    return '[REDACTED]';
  }
  return value;
}

function safeSerialize(value) {
  try {
    return JSON.parse(
      JSON.stringify(value, (key, v) => {
        if (v instanceof Error) {
          return {
            name: v.name,
            message: v.message,
            stack: v.stack,
            code: v.code
          };
        }
        if (v && typeof v === 'object') return v;
        return redactValue(key, v);
      })
    );
  } catch (_) {
    return { note: 'non-serializable meta' };
  }
}

function log(level, message, meta) {
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...(meta ? safeSerialize(meta) : {})
  };

  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(JSON.stringify(entry));
}

const logger = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta)
};

module.exports = { logger };


