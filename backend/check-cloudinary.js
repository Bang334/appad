require('dotenv').config();
const { cloudinary } = require('./src/config/cloudinary');

console.log('\n🔍 KIỂM TRA CLOUDINARY CONFIGURATION\n');
console.log('='.repeat(50));

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log('  CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || '❌ Not set');
console.log('  CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY || '❌ Not set');
console.log('  CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set (hidden)' : '❌ Not set');

// Check Cloudinary config
console.log('\n⚙️  Cloudinary Config:');
const config = cloudinary.config();
console.log('  Cloud Name:', config.cloud_name);
console.log('  API Key:', config.api_key);
console.log('  API Secret:', config.api_secret ? '✅ Set (hidden)' : '❌ Not set');

// Validation
console.log('\n✅ Validation:');
let allGood = true;

if (!config.cloud_name || config.cloud_name === 'your_cloud_name') {
  console.log('  ❌ Cloud Name không hợp lệ');
  allGood = false;
} else {
  console.log('  ✅ Cloud Name OK');
}

if (!config.api_key || config.api_key === 'your_api_key') {
  console.log('  ❌ API Key không hợp lệ');
  allGood = false;
} else {
  console.log('  ✅ API Key OK');
}

if (!config.api_secret || config.api_secret === 'your_api_secret') {
  console.log('  ❌ API Secret không hợp lệ');
  console.log('  💡 Hãy lấy API Secret từ: https://console.cloudinary.com/');
  allGood = false;
} else {
  console.log('  ✅ API Secret OK');
}

console.log('\n' + '='.repeat(50));

if (allGood) {
  console.log('\n🎉 TẤT CẢ ĐỀU OK! Cloudinary đã được cấu hình đúng.\n');
  console.log('📝 Bước tiếp theo:');
  console.log('   1. Restart backend server');
  console.log('   2. Test upload file');
  console.log('   3. Kiểm tra URL trả về\n');
} else {
  console.log('\n⚠️  CÓ VẤN ĐỀ VỚI CẤU HÌNH!\n');
  console.log('📝 Hãy làm theo:');
  console.log('   1. Tạo file backend/.env');
  console.log('   2. Thêm CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  console.log('   3. Lấy thông tin từ: https://console.cloudinary.com/');
  console.log('   4. Chạy lại script này: node check-cloudinary.js\n');
}

