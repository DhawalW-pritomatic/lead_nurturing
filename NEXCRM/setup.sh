#!/bin/bash

# NexCRM - Quick Setup Script
# Run this after pulling the latest changes

echo "🚀 NexCRM - Installing New Dependencies..."
echo ""

# Navigate to backend
cd backend

echo "📦 Installing backend dependencies..."
npm install

echo ""
echo "✅ Dependencies installed!"
echo ""
echo "📚 Next steps:"
echo "1. Copy .env.example to .env: cp .env.example .env"
echo "2. Edit .env with your actual credentials"
echo "3. Start the server: npm run dev"
echo "4. Access Swagger docs: http://localhost:5000/api-docs"
echo ""
echo "⚠️  SECURITY WARNING:"
echo "   - Never commit .env files"
echo "   - Rotate SMTP credentials if .env was previously committed"
echo "   - Check git history: git log --all --full-history -- '.env'"
echo ""
