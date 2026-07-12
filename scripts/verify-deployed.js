const https = require('https');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      method,
      hostname: 'chat-wazungu-e1ix.onrender.com',
      path: '/api' + path,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    const r = https.request(options, (res) => {
      let out = '';
      res.on('data', (d) => (out += d));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(out) }); }
        catch { resolve({ status: res.statusCode, body: out }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const phone = `verify${Date.now()}@chatwazungu.com`;
  const reg = await req('POST', '/auth/register', { fullName: 'Verify User', phoneNumber: phone });
  const token = reg.body.token;
  console.log('register status:', reg.status, 'hasToken:', !!token);
  const profiles = await req('GET', '/profiles', null, token);
  console.log('profiles status:', profiles.status);
  console.log('count:', profiles.body.count, 'profiles returned:', profiles.body.profiles?.length);
  const p = profiles.body.profiles?.[0];
  if (p) console.log('first:', p.fullName, '|', p.category, '|', p.profilePhoto.slice(0, 70));
})().catch((e) => console.log('ERR', e.message));
