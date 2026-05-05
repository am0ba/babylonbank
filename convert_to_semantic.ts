import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (filepath: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const replacements = [
  { from: /bg-slate-50/g, to: 'bg-background' },
  { from: /text-slate-900/g, to: 'text-foreground' },
  { from: /text-black/g, to: 'text-black dark:text-white' }, // Keep this logic or semantic
  { from: /border-slate-200/g, to: 'border-border' },
  { from: /bg-white shadow-sm/g, to: 'bg-card text-card-foreground shadow-sm' },
  { from: /bg-white/g, to: 'bg-card text-card-foreground' },
  { from: /text-slate-500/g, to: 'text-muted-foreground' },
  { from: /text-slate-400/g, to: 'text-muted-foreground' },
  { from: /text-slate-700/g, to: 'text-muted-foreground' },
  { from: /border-slate-300/g, to: 'border-border' },
  { from: /bg-slate-100/g, to: 'bg-muted' },
  { from: /border-slate-100/g, to: 'border-border' },
  { from: /hover:bg-slate-100/g, to: 'hover:bg-muted' },
  { from: /hover:bg-slate-200/g, to: 'hover:bg-muted' },
  { from: /rounded-3xl/g, to: 'rounded-2xl' }, // Less aggressive rounding
];

walkDir('./app', (filepath) => {
  if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;
    replacements.forEach(r => {
      content = content.replace(r.from, r.to);
    });
    if (content !== original) {
      fs.writeFileSync(filepath, content);
    }
  }
});
walkDir('./components', (filepath) => {
  if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;
    replacements.forEach(r => {
      content = content.replace(r.from, r.to);
    });
    if (content !== original) {
      fs.writeFileSync(filepath, content);
    }
  }
});
console.log('Conversion to semantic done');
