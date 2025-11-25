#!/bin/bash
# Heroku Post-build Script

echo "🔧 Running post-build tasks..."

# Run Prisma migrations
echo "🗄️ Running Prisma migrations..."
npx prisma migrate deploy

# Generate Prisma Client (just in case)
echo "📦 Regenerating Prisma Client..."
npx prisma generate

echo "✅ Post-build completed!"
