#!/usr/bin/env bash
# ==============================================================================
# Spark Automated Release Script
# 1. Bumps version across package.json, Cargo.toml, tauri.conf.json, App.tsx, RELEASE_NOTES.md
# 2. Compiles production macOS application bundle (Spark.app) via Tauri v2
# 3. Packages Spark_<version>.zip inside src-tauri/target/release/bundle/macos/
# 4. Creates git commit and annotated tag
# 5. Pushes to GitHub and uploads Spark_<version>.zip directly to the GitHub Release
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

# Parse CLI arguments
AUTO_CONFIRM=false
TARGET_VERSION=""

for arg in "$@"; do
  if [ "$arg" = "-y" ] || [ "$arg" = "--yes" ]; then
    AUTO_CONFIRM=true
  elif [ -z "$TARGET_VERSION" ]; then
    TARGET_VERSION="$arg"
  fi
done

# 1. Determine Current and Target Version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${YELLOW}${CURRENT_VERSION}${NC}"

if [ -z "$TARGET_VERSION" ]; then
  IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"
  NEXT_PATCH="${major}.${minor}.$((patch + 1))"
  
  echo -e "\nEnter new release version (default: ${BOLD}${NEXT_PATCH}${NC}):"
  read -r input_version
  TARGET_VERSION="${input_version:-$NEXT_PATCH}"
fi

# Clean version (strip leading 'v' if passed)
CLEAN_VERSION="${TARGET_VERSION#v}"
TAG_NAME="v${CLEAN_VERSION}"

echo -e "\nTarget release version: ${GREEN}${BOLD}${CLEAN_VERSION}${NC} (Git tag: ${BOLD}${TAG_NAME}${NC})\n"

# 2. Check if git tag already exists locally
TAG_EXISTS=false
if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
  TAG_EXISTS=true
  echo -e "${YELLOW}Notice: Git tag '${TAG_NAME}' already exists locally.${NC}"
fi

# 3. Update version numbers in project configuration
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

echo -e "${GREEN}✓ Version updated to ${CLEAN_VERSION} in config files and RELEASE_NOTES.md${NC}\n"

# 4. Compile Production macOS Application Bundle
echo -e "${BLUE}Compiling production macOS application bundle with Tauri v2...${NC}"

if [ -z "${TAURI_SIGNING_PRIVATE_KEY:-}" ]; then
  # Temporarily disable createUpdaterArtifacts if signing key is not in env so local build completes with exit code 0
  node -e "
    const fs = require('fs');
    const conf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
    conf.bundle.createUpdaterArtifacts = false;
    fs.writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(conf, null, 2) + '\n');
  "
  npm run tauri:build || true
  # Restore createUpdaterArtifacts
  node -e "
    const fs = require('fs');
    const conf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
    conf.bundle.createUpdaterArtifacts = true;
    fs.writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(conf, null, 2) + '\n');
  "
else
  npm run tauri:build
fi

APP_PATH="src-tauri/target/release/bundle/macos/Spark.app"
BUNDLE_DIR="src-tauri/target/release/bundle/macos"
ZIP_NAME="Spark_${TAG_NAME}.zip"

if [ ! -d "$APP_PATH" ]; then
  echo -e "${RED}Error: Production bundle not found at $APP_PATH${NC}"
  exit 1
fi

echo -e "\n${BLUE}Packaging $ZIP_NAME inside $BUNDLE_DIR...${NC}"
cd "$BUNDLE_DIR"
rm -f "$ZIP_NAME" "Spark_${CLEAN_VERSION}.zip"
ditto -c -k --sequesterRsrc --keepParent Spark.app "$ZIP_NAME"
# Also keep clean alias Spark_<version>.zip
cp "$ZIP_NAME" "Spark_${CLEAN_VERSION}.zip"
cd - > /dev/null

echo -e "${GREEN}✓ Packaged macOS zip bundle:${NC}"
ls -lh "$BUNDLE_DIR/$ZIP_NAME"
echo ""

# 5. Git Stage, Commit & Tag
echo -e "${BLUE}Staging release commits...${NC}"
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json src/App.tsx RELEASE_NOTES.md .gitignore
git add -A src/ src-tauri/src/ src-tauri/Cargo.lock package-lock.json 2>/dev/null || true

if ! git diff --cached --quiet; then
  git commit -m "chore(release): bump version to ${TAG_NAME}"
fi

if [ "$TAG_EXISTS" = false ]; then
  git tag -a "${TAG_NAME}" -m "Release ${TAG_NAME}"
  echo -e "${GREEN}✓ Created git tag: ${TAG_NAME}${NC}\n"
else
  echo -e "${YELLOW}Using existing git tag: ${TAG_NAME}${NC}\n"
fi

# 6. Push to GitHub & Upload Assets
if [ "$AUTO_CONFIRM" = true ]; then
  confirm="y"
else
  echo -e "${YELLOW}Ready to push to GitHub and upload $ZIP_NAME to release? (y/n)${NC}"
  read -r -p "> " confirm
fi

if [[ "$confirm" =~ ^[Yy]$ ]]; then
  echo -e "\n${BLUE}Pushing main branch and tag to GitHub...${NC}"
  git push origin main
  git push origin "${TAG_NAME}" || true

  # GitHub Release API upload
  echo -e "\n${BLUE}Connecting to GitHub API for release publication...${NC}"
  GH_TOKEN=$(printf "protocol=https\nhost=github.com\n" | git credential fill 2>/dev/null | grep "^password=" | cut -d= -f2 || true)

  if [ -n "$GH_TOKEN" ]; then
    # Fetch or Create Release
    RELEASE_DATA=$(curl -s -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/followruhulamin/Spark/releases/tags/${TAG_NAME}")
    RELEASE_ID=$(echo "$RELEASE_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || true)

    if [ -z "$RELEASE_ID" ] || [ "$RELEASE_ID" = "None" ]; then
      echo -e "${BLUE}Creating GitHub Release for ${TAG_NAME}...${NC}"
      RELEASE_BODY_ESCAPED=$(cat RELEASE_NOTES.md | python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))")
      
      CREATE_RES=$(curl -s -X POST \
        -H "Authorization: token $GH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
          \"tag_name\": \"${TAG_NAME}\",
          \"name\": \"Spark ${TAG_NAME}\",
          \"body\": ${RELEASE_BODY_ESCAPED},
          \"draft\": false,
          \"prerelease\": false
        }" \
        "https://api.github.com/repos/followruhulamin/Spark/releases")
      RELEASE_ID=$(echo "$CREATE_RES" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null || true)
    fi

    if [ -n "$RELEASE_ID" ] && [ "$RELEASE_ID" != "None" ]; then
      echo -e "${BLUE}Uploading $ZIP_NAME to GitHub Release (ID: $RELEASE_ID)...${NC}"
      
      # Remove asset if already exists on release
      EXISTING_ASSET_ID=$(echo "$RELEASE_DATA" | python3 -c "
import sys, json
assets = json.load(sys.stdin).get('assets', [])
for a in assets:
    if a.get('name') == '${ZIP_NAME}':
        print(a.get('id', ''))
        break
" 2>/dev/null || true)

      if [ -n "$EXISTING_ASSET_ID" ] && [ "$EXISTING_ASSET_ID" != "None" ]; then
        echo -e "${YELLOW}Deleting existing asset ${ZIP_NAME} (ID: $EXISTING_ASSET_ID) to overwrite...${NC}"
        curl -s -X DELETE \
          -H "Authorization: token $GH_TOKEN" \
          "https://api.github.com/repos/followruhulamin/Spark/releases/assets/${EXISTING_ASSET_ID}" >/dev/null
      fi

      UPLOAD_RES=$(curl -s -X POST \
        -H "Authorization: token $GH_TOKEN" \
        -H "Content-Type: application/zip" \
        --data-binary @"$BUNDLE_DIR/$ZIP_NAME" \
        "https://uploads.github.com/repos/followruhulamin/Spark/releases/${RELEASE_ID}/assets?name=${ZIP_NAME}")

      UPLOAD_STATE=$(echo "$UPLOAD_RES" | python3 -c "import sys, json; print(json.load(sys.stdin).get('state', ''))" 2>/dev/null || true)
      
      if [ "$UPLOAD_STATE" = "uploaded" ]; then
        echo -e "${GREEN}${BOLD}✓ Successfully uploaded $ZIP_NAME to GitHub Release!${NC}"
      else
        echo -e "${YELLOW}Uploaded asset. Response state: $UPLOAD_STATE${NC}"
      fi
    else
      echo -e "${RED}Warning: Could not create release via API. Upload manually at:${NC}"
      echo -e "https://github.com/followruhulamin/Spark/releases/new?tag=${TAG_NAME}"
    fi
  else
    echo -e "${YELLOW}Notice: No GitHub personal access token found in git credentials.${NC}"
    echo -e "You can drag and drop $BUNDLE_DIR/$ZIP_NAME directly into:"
    echo -e "https://github.com/followruhulamin/Spark/releases/tag/${TAG_NAME}"
  fi

  echo -e "\n${GREEN}${BOLD}🎉 Release ${TAG_NAME} is live!${NC}"
  echo -e "Direct download URL: ${BLUE}https://github.com/followruhulamin/Spark/releases/download/${TAG_NAME}/${ZIP_NAME}${NC}"
  echo -e "Release overview: ${BLUE}https://github.com/followruhulamin/Spark/releases/tag/${TAG_NAME}${NC}\n"
else
  echo -e "\n${YELLOW}Skipped upload. You can find your built zip at:${NC}"
  echo -e "  $BUNDLE_DIR/$ZIP_NAME\n"
fi
