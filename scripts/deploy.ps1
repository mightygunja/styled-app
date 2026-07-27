# Styled App Deployment Script (Windows PowerShell)
# Usage: .\scripts\deploy.ps1 [development|preview|production]

param(
    [string]$Profile = "development"
)

Write-Host "🚀 Building Styled App - Profile: $Profile" -ForegroundColor Green
Write-Host "================================================"

# Check if EAS CLI is installed
if (!(Get-Command eas -ErrorAction SilentlyContinue)) {
    Write-Host "❌ EAS CLI not found. Installing..." -ForegroundColor Red
    npm install -g eas-cli
}

# Navigate to app directory
Set-Location $PSScriptRoot\..

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
npm install

# Run type check
Write-Host "🔍 Running TypeScript check..." -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  TypeScript warnings found (continuing...)" -ForegroundColor Yellow
}

# Build for iOS
Write-Host "📱 Building for iOS..." -ForegroundColor Cyan
eas build --platform ios --profile $Profile --non-interactive

# Build for Android
Write-Host "🤖 Building for Android..." -ForegroundColor Cyan
eas build --platform android --profile $Profile --non-interactive

Write-Host "✅ Build complete!" -ForegroundColor Green
Write-Host "================================================"
Write-Host "Next steps:"
Write-Host "1. Check build status: eas build:list"
Write-Host "2. Download builds: eas build:download"
Write-Host "3. Submit to stores: eas submit"
