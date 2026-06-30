import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Change working directory
process.chdir(__dirname);

// Import vite
import('./node_modules/vite/bin/vite.js');
