require('dotenv').config();
const { cloudinary } = require('./src/config/cloudinary');

console.log('\n🧪 TEST CLOUDINARY UPLOAD\n');
console.log('='.repeat(50));

// Test với một file text nhỏ để xem Cloudinary có hoạt động không
async function testUpload() {
  try {
    console.log('\n📤 Testing Cloudinary connection...');
    console.log('Cloud Name:', cloudinary.config().cloud_name);
    console.log('API Key:', cloudinary.config().api_key);
    
    // Test với base64 string đơn giản
    const testData = 'data:text/plain;base64,SGVsbG8gV29ybGQ='; // "Hello World"
    
    console.log('\n🔄 Uploading test file...');
    const result = await cloudinary.uploader.upload(testData, {
      resource_type: 'raw',
      folder: 'music-app/test',
      public_id: 'test-' + Date.now()
    });
    
    console.log('\n✅ Upload thành công!');
    console.log('URL:', result.secure_url);
    console.log('Public ID:', result.public_id);
    
    // Xóa file test
    console.log('\n🗑️  Cleaning up test file...');
    await cloudinary.uploader.destroy(result.public_id, { resource_type: 'raw' });
    console.log('✅ Test file deleted');
    
    console.log('\n🎉 CLOUDINARY HOẠT ĐỘNG BÌNH THƯỜNG!\n');
    return true;
  } catch (error) {
    console.error('\n❌ LỖI:', error.message);
    if (error.http_code === 401) {
      console.log('\n💡 Lỗi xác thực - Kiểm tra lại:');
      console.log('   - CLOUDINARY_CLOUD_NAME');
      console.log('   - CLOUDINARY_API_KEY');
      console.log('   - CLOUDINARY_API_SECRET');
    }
    console.log('');
    return false;
  }
}

testUpload();

