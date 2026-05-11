import fs from 'fs';
import path from 'path';

function replaceEscapes(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') replaceEscapes(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      if (content.includes('\`')) {
        content = content.replace(/\`/g, '`');
        changed = true;
      }
      if (content.includes('\$')) {
        content = content.replace(/\\$/g, '$');
        changed = true;
      }
      if (changed) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

replaceEscapes(process.cwd());
