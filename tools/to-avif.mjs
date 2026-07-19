/**
 * JPG/PNG → AVIF（仅编码；项目内不保留 jpg/png fallback）
 *
 * 用法:
 *   node tools/to-avif.mjs <input.jpg|png> <output.avif>
 *
 * 依赖本机: avifenc（优先）或 ImageMagick `magick`
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const dst = process.argv[3];

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

if (!src || !dst) {
  die('usage: node tools/to-avif.mjs <input.jpg|png> <output.avif>', 2);
}

if (!fs.existsSync(src) || !fs.statSync(src).isFile()) {
  die(`error: input not found: ${src}`);
}

const ext = path.extname(src).toLowerCase();
if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
  die('error: input must be .jpg / .jpeg / .png');
}

fs.mkdirSync(path.dirname(path.resolve(dst)), { recursive: true });

function tryWhich(cmd) {
  const r = spawnSync(
    process.platform === 'win32' ? 'where' : 'command',
    process.platform === 'win32' ? [cmd] : ['-v', cmd],
    { encoding: 'utf8', shell: true },
  );
  return r.status === 0;
}

const before = fs.statSync(src).size;

if (tryWhich('avifenc')) {
  const r = spawnSync(
    'avifenc',
    ['-q', '65', '-s', '4', '-y', '420', '--sharpyuv', src, dst],
    { encoding: 'utf8' },
  );
  if (r.status === 0 && fs.existsSync(dst)) {
    const after = fs.statSync(dst).size;
    console.log(`ok avifenc: ${src} -> ${dst} (${before} -> ${after} bytes)`);
    process.exit(0);
  }
}

if (tryWhich('magick')) {
  const r = spawnSync(
    'magick',
    [
      src,
      '-strip',
      '-colorspace', 'sRGB',
      '-alpha', 'off',
      '-define', 'avif:speed=4',
      '-quality', '65',
      dst,
    ],
    { encoding: 'utf8' },
  );
  if (r.status === 0 && fs.existsSync(dst)) {
    const after = fs.statSync(dst).size;
    console.log(`ok magick: ${src} -> ${dst} (${before} -> ${after} bytes)`);
    process.exit(0);
  }
  if (r.stderr) console.error(r.stderr);
  die(`error: magick failed for ${src}`);
}

die('error: need avifenc or ImageMagick (magick) in PATH');
