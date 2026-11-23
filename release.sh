#!/usr/bin/env bash
# ==============================================================================
# Spark Automated Release Script
# Bumps version, runs validation builds, updates release notes, commits,
# tags, and pushes to GitHub to trigger the automated CI/CD release workflow.
# ==============================================================================

set -euo pipefail

cd "$(dirname "$0")"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}⚡ Spark Release Automation${NC}\n"

# 1. Determine Current and Target Version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${YELLOW}${CURRENT_VERSION}${NC}"

TARGET_VERSION="${1:-}"

if [ -z "$TARGET_VERSION" ]; then
  # Suggest next patch version
  IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"
  NEXT_PATCH="${major}.${minor}.$((patch + 1))"
  
  echo -e "\nEnter new release version (default: ${BOLD}${NEXT_PATCH}${NC}):"
  read -r input_version
  TARGET_VERSION="${input_version:-$NEXT_PATCH}"
fi

# Clean version (strip leading 'v' if user passed v0.2.1)
CLEAN_VERSION="${TARGET_VERSION#v}"
TAG_NAME="v${CLEAN_VERSION}"

echo -e "\nTarget release version: ${GREEN}${BOLD}${CLEAN_VERSION}${NC} (Git tag: ${BOLD}${TAG_NAME}${NC})\n"

# 2. Check if git tag already exists
if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
  echo -e "${RED}Error: Git tag '${TAG_NAME}' already exists locally.${NC}"
  echo -e "If you wish to overwrite it, run: git tag -d ${TAG_NAME} && git push origin :refs/tags/${TAG_NAME}"
  exit 1
fi

# 3. Update version in files
echo -e "${BLUE}Updating version numbers in project configuration...${NC}"

# package.json
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '${CLEAN_VERSION}';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# src-tauri/Cargo.toml
sed -i '' "s/^version = \"${CURRENT_VERSION}\"/version = \"${CLEAN_VERSION}\"/" src-tauri/Cargo.toml

# src-tauri/tauri.conf.json
node -e "
  const fs = require('fs');
  const conf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
  conf.version = '${CLEAN_VERSION}';
  fs.writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(conf, null, 2) + '\n');
"

# src/App.tsx initial fallback state
sed -i '' "s/useState<string>('${CURRENT_VERSION}')/useState<string>('${CLEAN_VERSION}')/" src/App.tsx

# RELEASE_NOTES.md title and tag
sed -i '' "s/v[0-9]*\.[0-9]*\.[0-9]*/v${CLEAN_VERSION}/g" RELEASE_NOTES.md

echo -e "${GREEN}✓ Version updated to ${CLEAN_VERSION} across package.json, Cargo.toml, tauri.conf.json, App.tsx, and RELEASE_NOTES.md${NC}\n"

# 4. Verify Build and Compilation
echo -e "${BLUE}Running TypeScript build and Rust check...${NC}"
npm run build
cargo check --manifest-path src-tauri/Cargo.toml

echo -e "${GREEN}✓ Build and type checks passed successfully!${NC}\n"

# 5. Git Stage, Commit & Tag
echo -e "${BLUE}Creating git commit and tag ${TAG_NAME}...${NC}"

git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src/App.tsx RELEASE_NOTES.md
# Also add Cargo.lock or package-lock if updated
git add -A src/ src-tauri/src/ src-tauri/Cargo.lock package-lock.json 2>/dev/null || true

git commit -m "chore(release): bump version to ${TAG_NAME}" || true
git tag -a "${TAG_NAME}" -m "Release ${TAG_NAME}"

echo -e "${GREEN}✓ Created git tag: ${TAG_NAME}${NC}\n"

# 6. Push to GitHub
echo -e "${YELLOW}Ready to push ${TAG_NAME} and main branch to GitHub? (y/n)${NC}"
read -r -p "> " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
  echo -e "\n${BLUE}Pushing to GitHub...${NC}"
  git push origin main
  git push origin "${TAG_NAME}"
  
  echo -e "\n${GREEN}${BOLD}🎉 Release ${TAG_NAME} pushed successfully!${NC}"
  echo -e "GitHub Actions is now compiling the release and building updater artifacts:"
  echo -e "${BLUE}https://github.com/followruhulamin/Spark/actions${NC}"
  echo -e "\nOnce the build finishes, it will be published to:"
  echo -e "${BLUE}https://github.com/followruhulamin/Spark/releases/tag/${TAG_NAME}${NC}"
  echo -e "Your installed Spark application will detect and prompt for this update automatically.\n"
else
  echo -e "\n${YELLOW}Push skipped. You can push manually when ready with:${NC}"
  echo -e "  git push origin main && git push origin ${TAG_NAME}\n"
fi
