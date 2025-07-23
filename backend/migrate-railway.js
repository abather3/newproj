#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

console.log('🚀 Starting Railway database migration...');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    console.log('📋 Creating migration tracking table...');
    
    // Create migrations table to track applied migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Check if main schema already exists
    const schemaCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!schemaCheck.rows[0].exists) {
      console.log('🏗️  Creating main database schema...');
      
      // Read and execute main schema
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      
      // Mark base schema as applied
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
        ['001_base_schema']
      );
      
      console.log('✅ Base schema created successfully');
    } else {
      console.log('📊 Base schema already exists, checking for updates...');
    }
    
    // Apply additional migrations in order
    const migrations = [
      {
        version: '002_customer_notifications',
        file: '../database/migrations/009_create_customer_notifications.sql',
        description: 'Customer notifications table'
      },
      {
        version: '003_performance_indexes',
        file: '../database/migrations/011_add_performance_indexes_customer_notifications.sql',
        description: 'Performance indexes for customer notifications'
      },
      {
        version: '004_served_at_column',
        file: '../database/migrations/012_add_served_at_to_customers.sql',
        description: 'Add served_at column to customers'
      },
      {
        version: '005_doctor_assigned',
        file: '../database/migrations/add_doctor_assigned.sql',
        description: 'Add doctor_assigned column'
      }
    ];
    
    for (const migration of migrations) {
      const applied = await client.query(
        'SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)',
        [migration.version]
      );
      
      if (!applied.rows[0].exists) {
        console.log(`🔄 Applying migration: ${migration.description}...`);
        
        try {
          const migrationPath = path.join(__dirname, migration.file);
          if (fs.existsSync(migrationPath)) {
            const migrationSql = fs.readFileSync(migrationPath, 'utf8');
            await client.query(migrationSql);
            
            // Mark migration as applied
            await client.query(
              'INSERT INTO schema_migrations (version) VALUES ($1)',
              [migration.version]
            );
            
            console.log(`✅ Applied: ${migration.description}`);
          } else {
            console.log(`⚠️  Migration file not found: ${migration.file}`);
          }
        } catch (error) {
          console.log(`⚠️  Migration ${migration.version} failed (may already exist):`, error.message);
        }
      } else {
        console.log(`⏭️  Skipping already applied: ${migration.description}`);
      }
    }
    
    // Create essential tables that might be missing
    console.log('🔧 Ensuring essential tables exist...');
    
    const essentialTables = [
      {
        name: 'jwt_keys',
        sql: `
          CREATE TABLE IF NOT EXISTS jwt_keys (
            id SERIAL PRIMARY KEY,
            key_id VARCHAR(255) UNIQUE NOT NULL,
            algorithm VARCHAR(50) NOT NULL,
            public_key TEXT NOT NULL,
            private_key TEXT NOT NULL,
            is_active BOOLEAN DEFAULT false,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `
      },
      {
        name: 'revoked_tokens',
        sql: `
          CREATE TABLE IF NOT EXISTS revoked_tokens (
            id SERIAL PRIMARY KEY,
            jti VARCHAR(255) UNIQUE NOT NULL,
            revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `
      },
      {
        name: 'system_settings',
        sql: `
          CREATE TABLE IF NOT EXISTS system_settings (
            id SERIAL PRIMARY KEY,
            key VARCHAR(255) UNIQUE NOT NULL,
            value TEXT,
            description TEXT,
            category VARCHAR(100) DEFAULT 'general',
            is_public BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `
      }
    ];
    
    for (const table of essentialTables) {
      await client.query(table.sql);
      console.log(`✅ Ensured table exists: ${table.name}`);
    }
    
    // Initialize default settings
    console.log('⚙️  Initializing default settings...');
    
    const defaultSettings = [
      ['shop_name', 'EscaShop Optical', 'Shop name displayed in the application', 'general', true],
      ['default_service_time', '15', 'Default service time in minutes', 'queue', false],
      ['sms_enabled', 'true', 'Enable SMS notifications', 'notifications', false],
      ['email_enabled', 'true', 'Enable email notifications', 'notifications', false],
      ['queue_auto_reset', 'true', 'Automatically reset queue daily', 'queue', false],
      ['max_queue_size', '100', 'Maximum queue size per day', 'queue', false]
    ];
    
    for (const [key, value, description, category, isPublic] of defaultSettings) {
      await client.query(`
        INSERT INTO system_settings (key, value, description, category, is_public)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (key) DO NOTHING
      `, [key, value, description, category, isPublic]);
    }
    
    // Verify critical tables
    console.log('🔍 Verifying database structure...');
    
    const criticalTables = ['users', 'customers', 'transactions', 'counters', 'daily_reports'];
    for (const table of criticalTables) {
      const exists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (exists.rows[0].exists) {
        console.log(`✅ Table verified: ${table}`);
      } else {
        console.log(`❌ Missing critical table: ${table}`);
        throw new Error(`Critical table ${table} is missing`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('🎉 Railway database migration completed successfully!');
    
    // Show migration status
    const appliedMigrations = await client.query(
      'SELECT version, applied_at FROM schema_migrations ORDER BY applied_at'
    );
    
    console.log('\n📊 Applied migrations:');
    appliedMigrations.rows.forEach(row => {
      console.log(`  ✓ ${row.version} (${row.applied_at})`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('✅ Database migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  });
