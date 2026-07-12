const https = require('https');
const p = encodeURIComponent('professional studio headshot of a beautiful young white caucasian woman, friendly smile, soft natural lighting, plain light background, photorealistic');
const url = `https://image.pollinations.ai/prompt/${p}?width=800&height=1000&seed=3&nologo=true&model=flux`;
console.log('URL:', url);
https.get(url, { followRedirect: true }, (r) => {
  console.log('status', r.statusCode, 'type', r.headers['content-type']);
  let n = 0;
  r.on('data', (d) => { n += d.length; });
  r.on('end', () => console.log('bytes', n));
}).on('error', (e) => console.log('ERR', e.message));
