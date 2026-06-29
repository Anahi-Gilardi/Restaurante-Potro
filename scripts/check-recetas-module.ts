import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const file = resolve(root, 'src/components/RecetasModule.tsx');
const source = readFileSync(file, 'utf8');

const checks: Array<[string, boolean]> = [
  [
    'RecetasModule keeps the production-safe heading JSX',
    source.includes('<h3 className="text-xs font-black text-stone-500 dark:text-stone-300 uppercase tracking-wider">Recetarios Habilitados</h3>'),
  ],
  ['No spaced opening JSX tag fragments remain', !/<\s+[A-Za-z]/.test(source)],
  ['No spaced closing JSX tag fragments remain', !/<\s*\/\s+[A-Za-z]/.test(source)],
  ['No corrupted React className token remains', !/\bclass\s+Name\b/.test(source)],
  ['No typo from failed deploy remains', !/Recatrices\s+Habilitados/.test(source)],
  ['ToastContainer keeps the expected dismiss prop', /<ToastContainer\s+toasts=\{toasts\}\s+onDismiss=\{removeToast\}\s*\/>/.test(source)],
];

const failures = checks.filter(([, passed]) => !passed);

if (failures.length > 0) {
  console.error('RecetasModule guard checks failed:');
  for (const [name] of failures) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}

console.log('RecetasModule guard checks passed.');
