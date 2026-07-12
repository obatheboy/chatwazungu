const https = require('https');
const p = encodeURIComponent('professional studio headshot of a beautiful young white caucasian woman, friendly smile, soft natural lighting, plain light background, photorealistic');
function fetchOne(seed) {
  return new Promise((resolve) => {
    const url = `https://image.pollinations.ai/prompt/${p}?width=800&height=1000&seed=${seed}&nologo=true&model=flux`;
    const req = https.get(url, { followRedirect: true, timeout: 30000 }, (r) => {
      let n = 0;
      r.on('data', (d) => (n += d.length));
      r.on('end', () => resolve({ seed, status: r.statusCode, type: r.headers['content-type'], bytes: n }));
    });
    req.on('error', (e) => resolve({ seed, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ seed, error: 'timeout' }); });
  });
}
(async () => {
  const results = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(fetchOne));
  console.log(results);
})();
