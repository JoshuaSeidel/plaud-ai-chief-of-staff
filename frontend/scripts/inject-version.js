const fs = require('fs');
const path = require('path');

// Get version from environment or package.json
const version = process.env.VERSION || process.env.npm_package_version || new Date().getTime().toString();
const commitHash = process.env.COMMIT_HASH || 'unknown';
const buildDate = process.env.BUILD_DATE || new Date().toISOString();

// Path to service worker
const swPath = path.join(__dirname, '..', 'public', 'service-worker.js');

if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf8');
  
  // Replace version placeholder
  swContent = swContent.replace(/{{APP_VERSION}}/g, `${version}-${commitHash.substring(0, 7)}-${Date.now()}`);
  
  fs.writeFileSync(swPath, swContent, 'utf8');
  console.log(`✓ Injected version ${version} into service-worker.js`);
} else {
  console.warn('⚠ service-worker.js not found at', swPath);
}

