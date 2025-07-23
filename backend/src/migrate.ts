import { pool, connectDatabase } from './config/database';
import fs from 'fs';
import path from 'path';
import { runSystemSettingsMigration } from './database/migrations/system_settings';

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    // Ensure database connection is established
    await connectDatabase();
    
    // First, check if database is initialized by checking if users table exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
      ) as table_exists;
    `;
    
    const result = await pool.query(checkQuery);
    const isInitialized = result.rows[0].table_exists;
    
    if (!isInitialized) {
      console.log('Database not initialized. Running complete migration...');
      const completeMigrationPath = path.join(__dirname, 'database', 'complete-migration.sql');
      try {
        const sql = fs.readFileSync(completeMigrationPath, { encoding: 'utf-8' });
        await pool.query(sql);
        console.log('✓ Completed: complete-migration.sql');
      } catch (error) {
        console.error('✗ Failed to run complete migration:', error);
        throw error;
      }
    } else {
      console.log('Database already initialized, skipping complete migration');
    }
    
    // Then run any additional SQL migrations from root database directory
    const databasePath = path.join(__dirname, 'database');
    let rootFiles: string[] = [];
    
    try {
      rootFiles = fs.readdirSync(databasePath).filter(file => file.endsWith('.sql') && file.startsWith('migrate-'));
    } catch (error) {
      console.log('No root database directory found or no migrate-*.sql files');
    }
    
    for (const file of rootFiles.sort()) {
      const filePath = path.join(databasePath, file);
      console.log(`Running root SQL migration: ${file}`);
      try {
        const sql = fs.readFileSync(filePath, { encoding: 'utf-8' });
        await pool.query(sql);
        console.log(`✓ Completed: ${file}`);
      } catch (error) {
        console.error(`✗ Failed to run migration ${file}:`, error);
        throw error;
      }
    }
    
    // Then run migrations from migrations directory
    const migrationsPath = path.join(__dirname, 'database', 'migrations');
    let files: string[] = [];
    
    try {
      files = fs.readdirSync(migrationsPath).sort();
    } catch (error) {
      console.log('No migrations directory found');
    }

    for (const file of files) {
      const filePath = path.join(migrationsPath, file);
      
      if (file.endsWith('.sql')) {
        console.log(`Running SQL migration: ${file}`);
        try {
          const sql = fs.readFileSync(filePath, { encoding: 'utf-8' });
          await pool.query(sql);
          console.log(`✓ Completed: ${file}`);
        } catch (error) {
          console.error(`✗ Failed to run migration ${file}:`, error);
          throw error;
        }
      } else if (file.endsWith('.ts') && file !== 'system_settings.ts') {
        console.log(`Skipping TypeScript migration: ${file} (handled separately)`);
      }
    }

    // Run TypeScript migrations
    try {
      await runSystemSettingsMigration();
      console.log('✓ Completed: system_settings.ts');
    } catch (error) {
      console.error('✗ Failed to run system settings migration:', error);
      throw error;
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close database connection
    if (pool && pool.end) {
      await pool.end();
    }
  }
}

runMigrations()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });
