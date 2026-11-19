import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const remote = process.argv[2]?.replace(/\/$/, '');
const modules = ['Locket-Gold.module', 'LocketvfilterV1.module', 'Module/Locket-Gold.module'];
const cache = new Map();
const normalize = text => text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
async function get(url) {
  if (!cache.has(url)) cache.set(url, (async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
    assert.equal(response.status, 200, 'HTTP failure: ' + url);
    assert(!response.headers.get('content-type')?.includes('text/html'), 'HTML returned: ' + url);
    console.log('200 ' + url);
    return response;
  })());
  return (await cache.get(url)).clone();
}
for (const file of modules) {
  const expected = await readFile(path.join(root, remote?.includes('raw.githubusercontent.com') ? '' : 'dist', file), 'utf8');
  const body = remote ? await (await get(remote + '/' + file)).text() : expected;
  assert(normalize(body) === normalize(expected), 'Stale module: ' + file);
  assert(!/BTKhang/i.test(body), 'Old module branding: ' + file);
  const scripts = [...body.matchAll(/script-path=([^,\s]+)/g)];
  assert.equal(scripts.length, 7, 'Expected 7 script paths: ' + file);
  for (const [, url] of scripts) {
    const name = new URL(url).pathname.split('/').pop();
    const local = await readFile(path.join(root, 'js', name), 'utf8');
    const script = remote ? await (await get(url)).text() : local;
    assert(normalize(script) === normalize(local), 'Stale script: ' + url);
    new vm.Script(script, { filename: name });
    if (['revenuecat.js', 'locketfix.js'].includes(name)) assert(!/BTKhang/i.test(script), 'Old credit: ' + name);
  }
  const icon = body.match(/^#!icon=(.+)$/m)?.[1]?.trim();
  assert(icon, 'Missing icon');
  if (remote) { const response = await get(icon); assert(response.headers.get('content-type')?.startsWith('image/'), 'Icon is not an image'); }
}
for (const name of ['revenuecat.js', 'locketfix.js']) {
  const source = await readFile(path.join(root, 'js', name), 'utf8');
  let result;
  const notifications = [];
  const context = {
    $request: { headers: { 'User-Agent': 'Locket' } },
    $response: { body: JSON.stringify({ subscriber: {}, entries: {} }) },
    $done: value => { result = value; },
    $notification: { post: (...args) => notifications.push(args) },
    console,
  };
  vm.runInNewContext(source, context, { filename: name, timeout: 5000 });
  assert(result?.body, 'Script did not finish: ' + name);
  const output = JSON.parse(result.body);
  assert(output.Attention.includes('nguyenanlc9'), 'Missing updated credit: ' + name);
  assert(!/BTKhang/i.test(result.body), 'Old credit in script output: ' + name);
  if (name === 'revenuecat.js') assert(notifications.some(args => args.join(' ').includes('nguyenanlc9')), 'Notification credit not updated');
}
for (const name of ['locket_change_profile.js', 'locket_filter_resp.js']) {
  const source = await readFile(path.join(root, 'js', name), 'utf8');
  for (const fixture of [
    { url: 'https://api.locketcamera.com/changeProfileInfo', response: false },
    { url: 'https://api.locketcamera.com/other', response: false },
    { url: 'https://api.locketcamera.com/generateFilteredImage', response: true },
    { url: 'https://api.locketcamera.com/other', response: true },
  ]) {
    const results = [];
    const context = {
      $request: { url: fixture.url, headers: {} },
      $done: value => results.push(value),
      console,
    };
    if (fixture.response) context.$response = { body: '{}', status: 200, headers: {} };
    vm.runInNewContext(source, context, { filename: name, timeout: 5000 });
    assert.equal(results.length, 1, 'Expected exactly one $done: ' + name + ' ' + fixture.url);
  }
}
console.log('PASS: all modules, 7 script links per module, icons, credit output and 8 request/response fixtures.');
