import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const base = (process.env.PUBLIC_BASE_URL || 'https://locket-rev.nguyenanlc9.workers.dev').replace(/\/$/, '');
if (base && new URL(base).protocol !== 'https:') throw new Error('PUBLIC_BASE_URL must use HTTPS');
const files = [];
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && /\.(module|mobileconfig)$/.test(entry.name)) files.push(entry.name);
}
for (const dir of ['js', 'DNS', 'Module']) {
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    if (entry.isFile() && /\.(js|module|mobileconfig)$/.test(entry.name)) files.push(dir + '/' + entry.name);
  }
}
files.push('README.md');
for (const file of files) {
  let content = await readFile(path.join(root, file), 'utf8');
  if (base && file.endsWith('.module')) {
    content = content.replace(/https:\/\/raw\.githubusercontent\.com\/(?:BTKhang\/LocketGold|nguyenanlc9\/locket-rev)\/(?:refs\/heads\/)?main\//g, base + '/');
  }
  await mkdir(path.dirname(path.join(output, file)), { recursive: true });
  await writeFile(path.join(output, file), content);
}
await mkdir(path.join(output, 'web'), { recursive: true });
for (const entry of await readdir(path.join(root, 'web'), { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const destination = entry.name === 'index.html' ? path.join(output, 'index.html') : path.join(output, 'web', entry.name);
  await writeFile(destination, await readFile(path.join(root, 'web', entry.name)));
}
await writeFile(path.join(output, 'web', 'files.json'), JSON.stringify(files.sort()));
await writeFile(path.join(output, '_headers'), `/*.mobileconfig
  Content-Type: application/x-apple-aspen-config
/DNS/*.mobileconfig
  Content-Type: application/x-apple-aspen-config
/*.module
  Content-Type: text/plain; charset=utf-8
/Module/*.module
  Content-Type: text/plain; charset=utf-8
/*
  Cache-Control: no-cache
  X-Content-Type-Options: nosniff
`);
console.log('Built ' + files.length + ' public files' + (base ? ' for ' + base : ''));
