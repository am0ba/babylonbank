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
  { from: /bg-black/g, to: 'bg-slate-50' },
  { from: /text-white/g, to: 'text-slate-900' },
  { from: /border-zinc-800/g, to: 'border-slate-200' },
  { from: /bg-zinc-900\/50/g, to: 'bg-white shadow-sm' },
  { from: /bg-zinc-900/g, to: 'bg-white shadow-sm' },
  { from: /bg-zinc-950/g, to: 'bg-slate-50' },
  { from: /text-zinc-500/g, to: 'text-slate-500' },
  { from: /text-zinc-400/g, to: 'text-slate-500' },
  { from: /text-zinc-300/g, to: 'text-slate-700' },
  { from: /text-zinc-600/g, to: 'text-slate-400' },
  { from: /border-zinc-700/g, to: 'border-slate-300' },
  { from: /bg-zinc-800/g, to: 'bg-slate-100' },
  { from: /bg-zinc-800\/50/g, to: 'bg-slate-100' },
  { from: /hover:bg-zinc-900\/50/g, to: 'hover:bg-slate-100' },
  { from: /hover:bg-zinc-800/g, to: 'hover:bg-slate-200' },
  { from: /font-mono/g, to: 'font-sans' }, // Let's remove monospace from descriptions for a more corporate look
  { from: /uppercase tracking-wider/g, to: 'font-medium' }, // Less aggressive text
  { from: /tracking-widest/g, to: '' },
  { from: /uppercase mb-6/g, to: 'mb-4' }, 
  { from: /text-yellow-400/g, to: 'text-slate-900' }, // For headings
  { from: /border-slate-200 hover:border-slate-900 text-slate-900/g, to: 'border-slate-200 hover:border-yellow-400 text-slate-900' },
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

console.log('Replacements done');
