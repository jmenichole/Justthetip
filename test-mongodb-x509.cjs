const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config();

async function testX509Connection() {
  try {
    console.log('🔍 Testing MongoDB X.509 connection...');
    
    // Check if certificate file exists
    const certPath = process.env.MONGODB_CERT_PATH || './certs/mongodb-cert.pem';
    if (!fs.existsSync(certPath)) {
      throw new Error(`Certificate file not found at: ${certPath}`);
    }
    
    console.log('✅ Certificate file found:', certPath);
    
    // Create MongoDB client with X.509 authentication
    const client = new MongoClient(process.env.MONGODB_URI_X509, {
      tls: true,
      tlsCertificateKeyFile: certPath,
      authMechanism: 'MONGODB-X509'
    });
    
    console.log('🔗 Connecting to MongoDB with X.509...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB with X.509!');
    
    // Test database operations
    await client.db().admin().ping();
    console.log('✅ Database ping successful');
    
    const db = client.db(process.env.MONGODB_DATABASE || 'justthetip');
    const collections = await db.listCollections().toArray();
    console.log('✅ Database accessible, found', collections.length, 'collections');
    
    if (collections.length > 0) {
      console.log('📋 Collections:', collections.map(c => c.name).join(', '));
    }
    
    await client.close();
    console.log('✅ X.509 connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ X.509 connection test failed:', error.message);
    
    if (error.message.includes('Authentication failed')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('- Ensure the certificate is properly downloaded from MongoDB Atlas');
      console.log('- Check that X.509 authentication is enabled in MongoDB Atlas');
      console.log('- Verify the certificate matches the cluster configuration');
    }
  }
}

testX509Connection();
