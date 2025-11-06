// Layout Storage Diagnostics
// Run in browser console: copy and paste this code

console.log('🔍 === LAYOUT STORAGE DIAGNOSTICS ===');

// Check if localStorage is available
try {
  const testKey = '__test__';
  localStorage.setItem(testKey, 'test');
  localStorage.removeItem(testKey);
  console.log('✅ localStorage is available');
} catch (e) {
  console.error('❌ localStorage is NOT available:', e);
}

// Check current layouts
const raw = localStorage.getItem('IFM_LAYOUTS');
console.log('\n📦 Raw storage data:', raw);

if (raw) {
  try {
    const layouts = JSON.parse(raw);
    console.log(`\n✅ Found ${layouts.length} saved layouts:`);
    layouts.forEach((layout, idx) => {
      console.log(`  ${idx + 1}. ${layout.name} (saved: ${new Date(layout.savedAt).toLocaleString()})`);
      console.log(`     Objects: ${layout.json?.objects?.length || 0}`);
    });
  } catch (e) {
    console.error('❌ Error parsing layouts:', e);
  }
} else {
  console.log('\n⚠️ No layouts found in storage');
}

// Check storage quota
if (navigator.storage && navigator.storage.estimate) {
  navigator.storage.estimate().then(estimate => {
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = ((used / quota) * 100).toFixed(2);
    console.log('\n💾 Storage usage:');
    console.log(`  Used: ${(used / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Quota: ${(quota / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Percent: ${percentUsed}%`);
  });
}

// Test save/load cycle
console.log('\n🧪 Testing save/load cycle...');
const testLayout = {
  id: Date.now(),
  name: 'Diagnostic Test Layout',
  json: {
    version: '5.3.0',
    objects: [
      {
        type: 'rect',
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        fill: 'red'
      }
    ]
  },
  savedAt: Date.now()
};

try {
  // Save test layout
  const existing = localStorage.getItem('IFM_LAYOUTS');
  const list = existing ? JSON.parse(existing) : [];
  list.unshift(testLayout);
  localStorage.setItem('IFM_LAYOUTS', JSON.stringify(list));
  console.log('✅ Test layout saved successfully');
  
  // Read it back
  const readBack = localStorage.getItem('IFM_LAYOUTS');
  const readList = JSON.parse(readBack);
  const found = readList.find(l => l.name === 'Diagnostic Test Layout');
  
  if (found) {
    console.log('✅ Test layout retrieved successfully');
    console.log('✅ ALL TESTS PASSED - Layout save/load should work!');
  } else {
    console.error('❌ Test layout NOT found after save');
  }
} catch (e) {
  console.error('❌ Test failed:', e);
}

console.log('\n=== END DIAGNOSTICS ===');
