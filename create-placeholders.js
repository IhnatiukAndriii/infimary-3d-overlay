// Simple Node.js script to create placeholder images
// Run with: node create-placeholders.js

const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'public', 'images');

// Create images directory if it doesn't exist
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log('✅ Created images directory');
}

// Create simple SVG placeholders that will be saved as files
const placeholders = [
  {
    name: 'mini-fridge.png',
    svg: `<svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="500" fill="#7A8A99"/>
      <rect x="20" y="20" width="360" height="200" fill="#5C6B7A"/>
      <rect x="20" y="240" width="360" height="240" fill="#8A9AA9"/>
      <circle cx="200" cy="470" r="15" fill="#333"/>
      <text x="200" y="260" font-size="20" fill="white" text-anchor="middle" font-family="Arial">Mini Fridge</text>
    </svg>`,
  },
  {
    name: 'air-purifier.png',
    svg: `<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="600" fill="#E8E8E8"/>
      <rect x="40" y="40" width="320" height="150" rx="10" fill="#2C3E50"/>
      <rect x="60" y="60" width="280" height="110" fill="#3498DB"/>
      <circle cx="200" cy="500" r="40" fill="#34495E"/>
      <text x="200" y="115" font-size="18" fill="white" text-anchor="middle" font-family="Arial">Air Purifier</text>
      <text x="200" y="335" font-size="14" fill="#333" text-anchor="middle" font-family="Arial">MAOXYA5</text>
    </svg>`,
  },
  {
    name: 'hospital-bed-1.png',
    svg: `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect x="50" y="150" width="500" height="150" fill="#A8C5E0"/>
      <rect x="40" y="120" width="80" height="100" rx="10" fill="#D0D0D0"/>
      <rect x="480" y="120" width="80" height="100" rx="10" fill="#D0D0D0"/>
      <rect x="80" y="180" width="440" height="80" fill="#4A90E2"/>
      <circle cx="80" cy="320" r="20" fill="#555"/>
      <circle cx="180" cy="320" r="20" fill="#555"/>
      <circle cx="420" cy="320" r="20" fill="#555"/>
      <circle cx="520" cy="320" r="20" fill="#555"/>
      <text x="300" y="230" font-size="20" fill="white" text-anchor="middle" font-family="Arial">Hospital Bed</text>
    </svg>`,
  },
  {
    name: 'hospital-bed-2.png',
    svg: `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect x="50" y="150" width="500" height="150" fill="#E0E0E0"/>
      <rect x="40" y="100" width="80" height="120" rx="10" fill="#C8D8E8"/>
      <rect x="480" y="100" width="80" height="120" rx="10" fill="#C8D8E8"/>
      <rect x="80" y="180" width="440" height="80" fill="#5A9AE2"/>
      <rect x="200" y="260" width="200" height="10" fill="#888"/>
      <circle cx="80" cy="320" r="20" fill="#444"/>
      <circle cx="180" cy="320" r="20" fill="#444"/>
      <circle cx="420" cy="320" r="20" fill="#444"/>
      <circle cx="520" cy="320" r="20" fill="#444"/>
      <text x="300" y="230" font-size="20" fill="white" text-anchor="middle" font-family="Arial">Medical Bed</text>
    </svg>`,
  },
  {
    name: 'oxygen-cylinder.png',
    svg: `<svg width="300" height="600" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="150" cy="100" rx="50" ry="30" fill="#888"/>
      <rect x="100" y="95" width="100" height="400" rx="15" fill="#A0A0A0"/>
      <rect x="110" y="105" width="80" height="380" rx="10" fill="#C0C0C0"/>
      <circle cx="150" cy="60" r="25" fill="#555"/>
      <rect x="135" y="30" width="30" height="40" fill="#666"/>
      <rect x="125" y="20" width="15" height="20" fill="#2ECC71"/>
      <circle cx="150" cy="520" r="40" fill="#666"/>
      <circle cx="150" cy="520" r="30" fill="#333"/>
      <text x="150" y="310" font-size="16" fill="#333" text-anchor="middle" font-family="Arial">O₂</text>
      <text x="150" y="550" font-size="12" fill="white" text-anchor="middle" font-family="Arial">Oxygen</text>
    </svg>`,
  },
];

console.log('📝 Note: These are SVG placeholders.');
console.log('📝 For best results, replace them with actual PNG images of medical equipment.');
console.log('📝 See SETUP_IMAGES.md for instructions.\n');

// Save SVG files with .svg extension (they can be used directly)
placeholders.forEach((placeholder) => {
  const svgPath = path.join(imagesDir, placeholder.name.replace('.png', '.svg'));
  const pngPath = path.join(imagesDir, placeholder.name);
  
  fs.writeFileSync(svgPath, placeholder.svg);
  console.log(`✅ Created: ${placeholder.name.replace('.png', '.svg')}`);
  
  // Also create a note file
  fs.writeFileSync(
    pngPath.replace('.png', '.txt'),
    `Replace this with actual ${placeholder.name}\nSee SETUP_IMAGES.md for instructions.`
  );
});

console.log('\n✨ Placeholder SVG files created successfully!');
console.log('💡 To use PNG images instead, follow instructions in SETUP_IMAGES.md');
