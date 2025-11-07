// Download and setup hospital bed PNG images
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

const imagesDir = path.join(__dirname, 'public', 'images');

// Example URLs for hospital bed images (you can replace with actual URLs)
const imageUrls = {
  'hospital-bed-1.png': null, // Add URL here if available
  'hospital-bed-2.png': null, // Add URL here if available
};

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    client.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(filepath);
        });
      } else {
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function setupImages() {
  console.log('🏥 === Setting up Hospital Bed Images ===\n');
  
  // Ensure images directory exists
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  for (const [filename, url] of Object.entries(imageUrls)) {
    const filepath = path.join(imagesDir, filename);
    
    if (url) {
      try {
        console.log(`📥 Downloading ${filename}...`);
        await downloadImage(url, filepath);
        console.log(`✅ Downloaded: ${filename}`);
      } catch (error) {
        console.error(`❌ Failed to download ${filename}:`, error.message);
      }
    } else {
      console.log(`⚠️  No URL provided for ${filename}`);
      console.log(`   Please manually copy the PNG file to: ${filepath}`);
    }
  }
  
  console.log('\n📋 Manual Setup Instructions:');
  console.log('1. Save your hospital bed PNG images as:');
  console.log('   - hospital-bed-1.png');
  console.log('   - hospital-bed-2.png');
  console.log(`2. Copy them to: ${imagesDir}`);
  console.log('3. Restart the development server: npm start');
  console.log('\n✨ The images will then be available in the app!\n');
}

setupImages();
