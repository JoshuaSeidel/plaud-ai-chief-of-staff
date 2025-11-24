#!/usr/bin/env node

/**
 * Version bump script
 * Increments the patch version in both backend and frontend package.json files
 */

const fs = require('fs');
const path = require('path');

function bumpVersion(version) {
  const parts = version.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${version}`);
  }
  
  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);
  const patch = parseInt(parts[2], 10);
  
  // Increment patch version
  return `${major}.${minor}.${patch + 1}`;
}

function updatePackageJson(filePath, newVersion) {
  const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const oldVersion = packageJson.version;
  packageJson.version = newVersion;
  
  fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`Updated ${path.basename(filePath)}: ${oldVersion} -> ${newVersion}`);
  
  return oldVersion;
}

// Main execution
try {
  const rootDir = path.join(__dirname, '..');
  const backendPackagePath = path.join(rootDir, 'backend', 'package.json');
  const frontendPackagePath = path.join(rootDir, 'frontend', 'package.json');
  
  // Read current version from backend package.json
  const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
  const currentVersion = backendPackage.version;
  
  // Bump version
  const newVersion = bumpVersion(currentVersion);
  
  // Update both package.json files
  updatePackageJson(backendPackagePath, newVersion);
  updatePackageJson(frontendPackagePath, newVersion);
  
  console.log(`\n✅ Version bumped: ${currentVersion} -> ${newVersion}`);
  console.log(`\nNew version will be used in the next build.`);
  
  // Exit with success
  process.exit(0);
} catch (error) {
  console.error('❌ Error bumping version:', error.message);
  process.exit(1);
}

