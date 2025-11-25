#!/bin/bash
# Heroku Post-build Script

echo "🔧 Running post-build tasks..."

# Run Prisma DB push for MongoDB
echo "🗄️ Running Prisma DB push..."
npx prisma db push

# Generate Prisma Client (just in case)
echo "📦 Regenerating Prisma Client..."
npx prisma generate

echo "✅ Post-build completed!"
