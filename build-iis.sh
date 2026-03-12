#!/bin/bash
# Build script for Windows IIS deployment
# Run this on your Mac/dev machine, then copy dist-iis/ to the Windows server

set -e

DIST_DIR="dist-iis"

echo "==> Cleaning previous build..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

echo "==> Building React frontend..."
cd web-client
npm install
npm run build
cd ..

echo "==> Copying frontend build output..."
cp -r web-client/dist/. "$DIST_DIR/"

echo "==> Copying backend server files..."
mkdir -p "$DIST_DIR/server"
cp server/index.js "$DIST_DIR/server/"
cp server/db.js "$DIST_DIR/server/"
cp server/pdfGenerator.js "$DIST_DIR/server/"
cp server/package.json "$DIST_DIR/server/"

echo "==> Copying IIS web.config..."
cp web.config "$DIST_DIR/web.config"

echo ""
echo "===================================================="
echo "Build complete! Output folder: $DIST_DIR/"
echo ""
echo "Next steps on Windows Server:"
echo "  1. Install prerequisites (see IIS_DEPLOY_STEPS.txt)"
echo "  2. Copy dist-iis contents to C:/inetpub/wwwroot/billing/"
echo "  3. Run: cd server && npm install --omit=dev"
echo "  4. Update server/db.js with your PostgreSQL credentials"
echo "  5. Create IIS site pointing to C:/inetpub/wwwroot/billing/"
echo "===================================================="
