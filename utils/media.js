const isFrontendAsset = (url) =>
  url.startsWith('/default-avatar') ||
  url.startsWith('/file.svg') ||
  url.startsWith('/next.svg') ||
  url.startsWith('/vercel.svg') ||
  url.startsWith('/globe.svg') ||
  url.startsWith('/window.svg');

const mediaOrigin = (req) => {
  if (process.env.MEDIA_ORIGIN) return process.env.MEDIA_ORIGIN.replace(/\/+$/, '');

  const forwardedProto = req?.headers?.['x-forwarded-proto'];
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || req?.protocol || 'https';
  const host = req?.headers?.['x-forwarded-host'] || req?.get?.('host');

  if (!host) return '';

  return `${String(proto).split(',')[0].trim()}://${host}`;
};

const fixPhotoUrl = (url, req) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (isFrontendAsset(url)) return url;

  const origin = mediaOrigin(req);
  const file = url.replace(/^\/cache\/profiles\//, '').replace(/^\/images\//, '');

  return origin ? `${origin}/images/${file}` : `/images/${file}`;
};

module.exports = { mediaOrigin, fixPhotoUrl };
