import dotenv from 'dotenv';
dotenv.config({ path: '.env.devnet' });
console.log('CLIENT_ID:', JSON.stringify(process.env.CLIENT_ID));
console.log('Length:', process.env.CLIENT_ID ? process.env.CLIENT_ID.length : 'undefined');
console.log('Truthy:', !!process.env.CLIENT_ID);
console.log('BOT_TOKEN exists:', !!process.env.BOT_TOKEN);
