#!/usr/bin/env node
/**
 * Database Validation Script
 * Tests connection to PostgreSQL/Supabase and verifies all tables exist
 * 
 * Usage:
 *   node db/validate-database.js
 * 
 * Prerequisites:
 *   - DATABASE_URL environment variable must be set
 *   - npm install pg (PostgreSQL client)
 */

require('dotenv').config();
const { Pool } = require('pg');

const REQUIRED_TABLES = [
    'users',
    'balances',
    'transactions',
    'tips',
    'trust_badges',
    'wallet_registrations',
    'registration_nonces',
    'verifications',
    'tickets'
];

const REQUIRED_INDEXES = [
    'idx_users_user_id',
    'idx_tips_created_at',
    'idx_trust_badges_discord_id',
    'idx_wallet_reg_discord_user'
];

async function validateDatabase() {
    console.log('🔍 JustTheTip Database Validation\n');

    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL environment variable is not set');
        console.log('\n📝 Please set DATABASE_URL in your .env file:');
        console.log('   DATABASE_URL=postgresql://user:password@host:port/database\n');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        // Test connection
        console.log('🔌 Testing database connection...');
        const result = await pool.query('SELECT NOW() as now, version() as version');
        console.log(`✅ Connected to database`);
        console.log(`   Server time: ${result.rows[0].now}`);
        console.log(`   PostgreSQL version: ${result.rows[0].version.split(' ')[1]}\n`);

        // Check tables
        console.log('📊 Checking tables...');
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `;
        const tablesResult = await pool.query(tablesQuery);
        const existingTables = tablesResult.rows.map(row => row.table_name);

        let allTablesExist = true;
        for (const table of REQUIRED_TABLES) {
            if (existingTables.includes(table)) {
                console.log(`   ✅ ${table}`);
            } else {
                console.log(`   ❌ ${table} - MISSING`);
                allTablesExist = false;
            }
        }

        if (!allTablesExist) {
            console.log('\n❌ Some tables are missing. Please run the schema:');
            console.log('   1. Open Supabase SQL Editor');
            console.log('   2. Copy contents of db/schema.sql');
            console.log('   3. Run the SQL query\n');
            process.exit(1);
        }

        // Check indexes
        console.log('\n🔎 Checking indexes...');
        const indexesQuery = `
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public'
            ORDER BY indexname;
        `;
        const indexesResult = await pool.query(indexesQuery);
        const existingIndexes = indexesResult.rows.map(row => row.indexname);

        const allIndexesExist = true;
        for (const index of REQUIRED_INDEXES) {
            if (existingIndexes.includes(index)) {
                console.log(`   ✅ ${index}`);
            } else {
                console.log(`   ⚠️  ${index} - MISSING (optional but recommended)`);
            }
        }

        // Check functions
        console.log('\n⚙️  Checking functions...');
        const functionsQuery = `
            SELECT proname 
            FROM pg_proc 
            WHERE pronamespace = 'public'::regnamespace
            ORDER BY proname;
        `;
        const functionsResult = await pool.query(functionsQuery);
        const existingFunctions = functionsResult.rows.map(row => row.proname);

        const requiredFunctions = ['update_updated_at_column', 'cleanup_expired_nonces'];
        for (const func of requiredFunctions) {
            if (existingFunctions.includes(func)) {
                console.log(`   ✅ ${func}()`);
            } else {
                console.log(`   ⚠️  ${func}() - MISSING (optional)`);
            }
        }

        // Check triggers
        console.log('\n🔔 Checking triggers...');
        const triggersQuery = `
            SELECT trigger_name 
            FROM information_schema.triggers 
            WHERE trigger_schema = 'public'
            ORDER BY trigger_name;
        `;
        const triggersResult = await pool.query(triggersQuery);
        const existingTriggers = triggersResult.rows.map(row => row.trigger_name);

        if (existingTriggers.length > 0) {
            console.log(`   ✅ Found ${existingTriggers.length} trigger(s)`);
        } else {
            console.log(`   ⚠️  No triggers found (optional)`);
        }

        // Test insert/select/delete
        console.log('\n🧪 Testing database operations...');
        const testUserId = `test_${Date.now()}`;
        
        // Insert test user
        await pool.query(
            'INSERT INTO users (user_id) VALUES ($1)',
            [testUserId]
        );
        console.log('   ✅ INSERT operation successful');

        // Select test user
        const selectResult = await pool.query(
            'SELECT * FROM users WHERE user_id = $1',
            [testUserId]
        );
        if (selectResult.rows.length === 1) {
            console.log('   ✅ SELECT operation successful');
        }

        // Delete test user
        await pool.query(
            'DELETE FROM users WHERE user_id = $1',
            [testUserId]
        );
        console.log('   ✅ DELETE operation successful');

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('✅ Database validation completed successfully!');
        console.log('='.repeat(50));
        console.log('\n📝 Next steps:');
        console.log('   1. Start your bot: npm run start:bot');
        console.log('   2. Monitor Supabase logs for any issues');
        console.log('   3. Test Discord commands\n');

    } catch (error) {
        console.error('\n❌ Database validation failed:');
        console.error(`   Error: ${error.message}`);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Connection refused. Check:');
            console.log('   - Is DATABASE_URL correct?');
            console.log('   - Is your IP whitelisted in Supabase?');
            console.log('   - Is the database running?');
        } else if (error.code === '28P01') {
            console.log('\n💡 Authentication failed. Check:');
            console.log('   - Is the password in DATABASE_URL correct?');
            console.log('   - Did you replace [YOUR-PASSWORD] placeholder?');
        } else if (error.code === '42P01') {
            console.log('\n💡 Table does not exist. Run the schema:');
            console.log('   1. Open Supabase SQL Editor');
            console.log('   2. Copy contents of db/schema.sql');
            console.log('   3. Run the SQL query');
        }
        
        console.log('');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run validation
validateDatabase().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
