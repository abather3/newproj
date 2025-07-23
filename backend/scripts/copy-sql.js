const fs = require('fs');
const path = require('path');

// Ensure dist/database directory exists
const distDbPath = path.join(__dirname, '..', 'dist', 'database');
if (!fs.existsSync(distDbPath)) {
  fs.mkdirSync(distDbPath, { recursive: true });
}

// Copy SQL files from src/database to dist/database
const srcDbPath = path.join(__dirname, '..', 'src', 'database');
const files = fs.readdirSync(srcDbPath);

files.forEach(file => {
  if (file.endsWith('.sql')) {
    const srcPath = path.join(srcDbPath, file);
    const destPath = path.join(distDbPath, file);
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file} to dist/database/`);
  }
});

console.log('SQL files copied successfully');
