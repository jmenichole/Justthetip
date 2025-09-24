const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb+srv://jchapman7:b6lJKtXh4aG7BaZj@justhetip.0z3jtr.mongodb.net/justthetip';

async function testConnection() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✅ Direct MongoDB connection successful');
    const db = client.db('justthetip');
    await db.admin().ping();
    console.log('✅ Database ping successful');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  } finally {
    await client.close();
  }
}

testConnection().then(success => {
  console.log('MongoDB status:', success ? 'WORKING' : 'FAILED');
  process.exit(success ? 0 : 1);
});
