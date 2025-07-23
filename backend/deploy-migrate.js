#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting deployment migration process...');

// Ensure dist directory structure exists
const distDbPath = path.join(__dirname, 'dist', 'database');
const distMigrationsPath = path.join(distDbPath, 'migrations');

if (!fs.existsSync(distDbPath)) {
  fs.mkdirSync(distDbPath, { recursive: true });
}

if (!fs.existsSync(distMigrationsPath)) {
  fs.mkdirSync(distMigrationsPath, { recursive: true });
}

// Copy SQL migration files to dist directory
console.log('📁 Copying migration files...');

// Copy root database SQL files
const srcDbPath = path.join(__dirname, 'src', 'database');
if (fs.existsSync(srcDbPath)) {
  const files = fs.readdirSync(srcDbPath).filter(file => file.endsWith('.sql'));
  files.forEach(file => {
    const srcFile = path.join(srcDbPath, file);
    const destFile = path.join(distDbPath, file);
    fs.copyFileSync(srcFile, destFile);
    console.log(`  ✓ Copied: ${file}`);
  });
}

// Copy migration SQL files
const srcMigrationsPath = path.join(__dirname, 'src', 'database', 'migrations');
if (fs.existsSync(srcMigrationsPath)) {
  const files = fs.readdirSync(srcMigrationsPath).filter(file => file.endsWith('.sql'));
  files.forEach(file => {
    const srcFile = path.join(srcMigrationsPath, file);
    const destFile = path.join(distMigrationsPath, file);
    fs.copyFileSync(srcFile, destFile);
    console.log(`  ✓ Copied: ${file}`);
  });
}

// Copy main database schema if it exists
const mainSchemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
if (fs.existsSync(mainSchemaPath)) {
  const destSchemaPath = path.join(__dirname, 'dist', '..', 'database', 'schema.sql');
  const destDir = path.dirname(destSchemaPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(mainSchemaPath, destSchemaPath);
  console.log('  ✓ Copied: main schema.sql');
}

console.log('🔄 Running migrations...');

// Run the appropriate migration based on environment
try {
  if (process.env.DATABASE_URL) {
    console.log('🚄 Running Railway migration...');
    execSync('node migrate-railway.js', { stdio: 'inherit' });
  } else {
    console.log('🛠️  Running built migration...');
    execSync('node dist/migrate.js', { stdio: 'inherit' });
  }
  
  console.log('✅ Migration deployment completed successfully!');
} catch (error) {
  console.error('❌ Migration deployment failed:', error.message);
  process.exit(1);
}
