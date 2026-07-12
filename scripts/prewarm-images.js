const https = require('https');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function hit(url) {
  return new Promise((res) => {
    const req = https.get(url, { timeout: 60000 }, (r) => {
      r.resume();
      r.on('end', () => res(r.statusCode));
    });
    req.on('error', () => res('err'));
    req.on('timeout', () => { req.destroy(); res('timeout'); });
  });
}

(async () => {
  const base = 'https://chat-wazungu-e1ix.onrender.com/images';
  for (let i = 1; i <= 60; i++) {
    const s = await hit(`${base}/woman_${i}.jpg`);
    console.log(`woman_${i}: ${s}`);
    await sleep(300);
  }
  for (let i = 1; i <= 40; i++) {
    const s = await hit(`${base}/man_${i}.jpg`);
    console.log(`man_${i}: ${s}`);
    await sleep(300);
  }
  console.log('PREWARM DONE — HD generation continues in background on the server');
})();
