#!/usr/bin/env node

/**
 * Generate a secure JWT secret for production use
 *
 * Usage: node generate-jwt-secret.js
 */

const crypto = require('crypto');

console.log('\n🔐 Generating secure JWT secret...\n');

const secret = crypto.randomBytes(32).toString('hex');

console.log('Your secure JWT_SECRET:');
console.log('━'.repeat(80));
console.log(secret);
console.log('━'.repeat(80));
console.log('\n✅ Copy this value and set it as JWT_SECRET in Railway environment variables\n');
console.log('⚠️  IMPORTANT: Never commit this secret to version control!\n');
