const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔧 THIẾT LẬP FILE .ENV CHO BACKEND\n');
console.log('='.repeat(50));

const envPath = path.join(__dirname, '.env');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('\n⚠️  File .env đã tồn tại!');
  rl.question('\nBạn có muốn ghi đè? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      createEnvFile();
    } else {
      console.log('\n❌ Hủy bỏ. File .env không thay đổi.\n');
      rl.close();
    }
  });
} else {
  createEnvFile();
}

function createEnvFile() {
  console.log('\n📝 Nhập thông tin Cloudinary:');
  console.log('   (Lấy từ: https://console.cloudinary.com/)\n');

  rl.question('Cloud Name [dnd4apm6t]: ', (cloudName) => {
    cloudName = cloudName.trim() || 'dnd4apm6t';

    rl.question('API Key [736711585279733]: ', (apiKey) => {
      apiKey = apiKey.trim() || '736711585279733';

      rl.question('API Secret (bắt buộc): ', (apiSecret) => {
        apiSecret = apiSecret.trim();

        if (!apiSecret) {
          console.log('\n❌ API Secret là bắt buộc!');
          console.log('   Vào https://console.cloudinary.com/ để lấy API Secret\n');
          rl.close();
          return;
        }

        // Create .env content
        const envContent = `# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3307
DB_USER=root
DB_PASSWORD=123456
DB_NAME=music_app_db

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=${cloudName}
CLOUDINARY_API_KEY=${apiKey}
CLOUDINARY_API_SECRET=${apiSecret}
`;

        // Write to file
        try {
          fs.writeFileSync(envPath, envContent);
          console.log('\n✅ File .env đã được tạo thành công!');
          console.log('\n📝 Các bước tiếp theo:');
          console.log('   1. Kiểm tra: node check-cloudinary.js');
          console.log('   2. Restart backend: npm start');
          console.log('   3. Test upload file\n');
        } catch (error) {
          console.error('\n❌ Lỗi khi tạo file .env:', error.message);
          console.log('\n💡 Hãy tạo file .env thủ công trong thư mục backend với nội dung:');
          console.log(envContent);
        }

        rl.close();
      });
    });
  });
}

