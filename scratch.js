const https = require('https');
https.get('https://blogsite-mini25.vercel.app/', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const match = body.match(/href="\/posts\/([^"]+)"/);
    if (match) {
      console.log('Found post ID:', match[1]);
      https.get('https://blogsite-mini25.vercel.app/posts/' + match[1], (res2) => {
        console.log('Status code:', res2.statusCode);
        let body2 = '';
        res2.on('data', c => body2 += c);
        res2.on('end', () => console.log('Response body:', body2.substring(0, 1000)));
      });
    } else {
      console.log('No posts found');
    }
  });
});
