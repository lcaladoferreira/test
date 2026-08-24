import handler from './index';

async function run() {
  const bad = new Request('http://localhost/youtube-transcript', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: 'not-a-youtube-url' }),
  });

  const response = await handler(bad);
  if (response.status !== 400) throw new Error(`Expected 400, got ${response.status}`);
  const body = await response.json();
  if (!body.error) throw new Error('Expected validation error');

  console.log('validation test passed');
}

run();
