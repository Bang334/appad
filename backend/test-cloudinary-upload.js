require('dotenv').config();
const cloudinary = require('./src/config/cloudinary').cloudinary;

async function testCloudinary() {
  console.log('🔧 Testing Cloudinary connection...');
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
  
  try {
    // Test connection
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connected:', result);
    
    console.log('\n📁 Your Cloudinary info:');
    console.log('  Cloud Name: dnd4apm6t');
    console.log('  Dashboard: https://console.cloudinary.com/');
    console.log('  Upload URL format: https://res.cloudinary.com/dnd4apm6t/...');
    
    console.log('\n🎵 To upload MP3:');
    console.log('  1. Go to https://console.cloudinary.com/');
    console.log('  2. Media Library → Upload');
    console.log('  3. Upload your MP3 files');
    console.log('  4. Copy the URL');
    console.log('  5. Update database with the URL');
    
    console.log('\n✅ Setup successful!');
    
  } catch (error) {
    console.error('❌ Cloudinary error:', error.message);
  }
}

testCloudinary();

