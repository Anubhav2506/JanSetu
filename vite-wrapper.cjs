const path = require('path');
const { spawn } = require('child_process');

// Change working directory
process.chdir(__dirname);

// Spawn vite process
const vite = spawn('node', [path.join(__dirname, 'node_modules/vite/bin/vite.js'), ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: __dirname,
  shell: true
});

vite.on('close', (code) => {
  process.exit(code);
});
