#!/bin/bash
# Heroku Pre-build Script

echo "🔧 Running pre-build tasks..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

echo "✅ Pre-build completed!"
