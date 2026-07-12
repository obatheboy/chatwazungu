const https = require('https');
function get(url, follow = true) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, (r) => {
      if (follow && r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        return resolve(get(r.headers.location, false));
      }
      let out = '';
      r.on('data', (d) => (out += d));
      r.on('end', () => resolve({ status: r.statusCode, body: out, headers: r.headers }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}
(async () => {
  const results = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(async (i) => {
    try {
      const j = await get(`https://fakeface.rest/thumb/json?gender=female&minimum_age=21&maximum_age=35`);
      const data = JSON.parse(j.body);
      const img = await get(data.face, false);
      return { i, status: img.status, type: img.headers['content-type'], bytes: img.body.length, gender: data.gender };
    } catch (e) {
      return { i, error: e.message };
    }
  }));
  console.log(results);
})();
