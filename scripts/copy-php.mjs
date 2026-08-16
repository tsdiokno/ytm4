import fs from 'fs';
import path from 'path';

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const distDir = path.resolve('dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy api directory
copyDirRecursive(path.resolve('api'), path.join(distDir, 'api'));

// Copy data directory (with templates)
copyDirRecursive(path.resolve('data'), path.join(distDir, 'data'));

// Copy root .htaccess
const htaccessPath = path.resolve('.htaccess');
if (fs.existsSync(htaccessPath)) {
  fs.copyFileSync(htaccessPath, path.join(distDir, '.htaccess'));
}

console.log('✅ PHP API scripts, data directory, and .htaccess copied to dist/ successfully.');
