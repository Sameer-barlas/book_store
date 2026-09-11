const http = require('http');
const body = JSON.stringify({ email: 'subscriber@digitalpublishing.com' });
const host = process.env.API_HOST || 'localhost';
const port = Number(process.env.PORT) || 5000;

const req = http.request({
  host,
  port,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log(data);
    process.exit(res.statusCode >= 200 && res.statusCode < 500 ? 0 : 1);
  });
});

req.on('error', (err) => {
  console.error('REQUEST_ERROR', err.message);
  process.exit(1);
});

req.end(body);
