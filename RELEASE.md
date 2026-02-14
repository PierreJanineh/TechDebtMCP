# Release Guide

This guide provides step-by-step instructions for releasing new versions of Tech Debt MCP.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Pre-Release Checklist](#pre-release-checklist)
- [Release Process](#release-process)
- [Post-Release Verification](#post-release-verification)
- [Troubleshooting](#troubleshooting)
- [Emergency Rollback](#emergency-rollback)

## Prerequisites

### Required Access

- ✅ Write access to GitHub repository
- ✅ npm account with publish permissions for `tech-debt-mcp`
- ✅ Trusted Publishing configured on npm.com (see NPM_SETUP.md)

### Setup Trusted Publishing (First Time Only)

**No tokens or secrets needed!** npm uses Trusted Publishing (OIDC) to verify GitHub Actions.

1. **Configure on npm.com:**
   - Go to https://www.npmjs.com/package/tech-debt-mcp/access
   - Add GitHub Actions integration
   - Repository: `PierreJanineh/TechDebtMCP`
   - Workflow: `publish.yml`

2. **Verify Setup:**
   - See [NPM_SETUP.md](NPM_SETUP.md) for detailed step-by-step instructions
   - No GitHub Secrets required (Trusted Publishing handles authentication)

**Benefits:** No token expiration, no secret rotation, more secure!

## Pre-Release Checklist

Before starting the release process, ensure:

- [ ] All planned features/fixes are merged to `develop` branch
- [ ] All tests pass locally: `npm test`
- [ ] Build succeeds locally: `npm run build`
- [ ] CHANGELOG.md is updated with new version details
- [ ] README.md reflects any new features or changes
- [ ] ARCHITECTURE.md is updated if architecture changed
- [ ] No uncommitted changes: `git status`
- [ ] You're on the `develop` branch: `git branch --show-current`
- [ ] Develop branch is up to date: `git pull origin develop`

## Release Process

### Step 1: Prepare the Release

```bash
# Ensure you're on develop and up to date
git checkout develop
git pull origin develop

# Run full test suite
npm test

# Verify build
npm run build

# Check for uncommitted changes
git status
```

### Step 2: Update Version

Choose the appropriate version bump based on changes:

**Patch Release (Bug Fixes Only):**
```bash
npm version patch  # 1.0.0 -> 1.0.1
```

**Minor Release (New Features, Backward Compatible):**
```bash
npm version minor  # 1.0.0 -> 1.1.0
```

**Major Release (Breaking Changes):**
```bash
npm version major  # 1.0.0 -> 2.0.0
```

This command will:
- Update version in `package.json`
- Create a git commit: "2.0.0"
- Create a git tag: "v2.0.0"

### Step 3: Update CHANGELOG.md

Edit CHANGELOG.md and add a new version section:

```markdown
## [2.0.0] - 2026-02-10

### Added
- New feature X
- New feature Y

### Changed
- Modified behavior Z

### Fixed
- Bug fix A
- Bug fix B

### Breaking Changes
- Breaking change description (for major releases)

[2.0.0]: https://github.com/PierreJanineh/TechDebtMCP/releases/tag/v2.0.0
```

Commit the changelog:
```bash
git add CHANGELOG.md
git commit -m "docs: update CHANGELOG for v2.0.0"
```

### Step 4: Push the Release

```bash
# Get the version that was created
VERSION=$(node -p "require('./package.json').version")
echo "Releasing version: v$VERSION"

# Push the tag (this triggers GitHub Actions)
git push origin "v$VERSION"

# Push the commit
git push origin develop
```

### Step 5: Monitor GitHub Actions

1. Go to https://github.com/PierreJanineh/TechDebtMCP/actions
2. Watch the "Publish to npm" workflow
3. Workflow steps:
   - ✅ Checkout code
   - ✅ Setup Node.js
   - ✅ Install dependencies
   - ✅ Run tests
   - ✅ Build TypeScript
   - ✅ Verify dist directory
   - ✅ Verify version matches tag
   - ✅ Publish to npm with provenance
   - ✅ Create GitHub Release

**Expected Duration:** 2-3 minutes

### Step 6: Merge develop to master

After the workflow completes successfully and the release is published, merge develop to master to keep the master branch in sync with the released version:

```bash
# Switch to master
git checkout master
git pull origin master

# Merge develop into master
git merge develop -m "release: merge v$VERSION to master"

# Push master
git push origin master
```

**Why this step?** According to the git workflow in copilot-instructions.md:
- `develop` branch is for integration of features
- `master` branch should always point to a released/stable version
- After tagging and publishing from develop, we merge it to master to keep master current

### Step 7: Workflow Success

Once the workflow completes successfully, you'll see:

```
✅ Successfully published tech-debt-mcp@2.0.0 to npm
📦 Package: https://www.npmjs.com/package/tech-debt-mcp
🎉 GitHub Release: https://github.com/PierreJanineh/TechDebtMCP/releases/tag/v2.0.0
```

## Post-Release Verification

### Verify npm Publication

```bash
# Check npm registry
npm view tech-debt-mcp

# Verify specific version
npm view tech-debt-mcp@2.0.0

# Test installation
npm install -g tech-debt-mcp@2.0.0

# Verify it works
tech-debt-mcp --version  # Should show 2.0.0
```

### Verify GitHub Release

1. Go to https://github.com/PierreJanineh/TechDebtMCP/releases
2. Verify the new release appears
3. Check that release notes are correct
4. Edit release notes if needed to add more details

### Verify Provenance

npm provenance provides supply chain security:

```bash
# View provenance information
npm view tech-debt-mcp@2.0.0 --json | jq .dist.attestations
```

This proves the package was built by GitHub Actions from the tagged commit.

### Test in a Fresh Environment

```bash
# Create a test directory
mkdir -p /tmp/test-tech-debt-mcp
cd /tmp/test-tech-debt-mcp

# Initialize a test project
npm init -y

# Install the new version
npm install tech-debt-mcp@2.0.0

# Test basic functionality
npx tech-debt-mcp
```

## Troubleshooting

### Workflow Fails: Tests Don't Pass

**Symptom:** GitHub Actions fails at "Run tests" step

**Solution:**
```bash
# Run tests locally to identify issues
npm test

# Fix failing tests
# Commit fixes
git add .
git commit -m "fix: resolve test failures"


# Delete the tag and recreate
git tag -d v2.0.0
git push origin :refs/tags/v2.0.0

# Recreate tag
git tag v2.0.0
git push origin v2.0.0
```

### Workflow Fails: Build Error

**Symptom:** GitHub Actions fails at "Build TypeScript" step

**Solution:**
```bash
# Run build locally
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Fix errors and follow tag deletion process above
```

### Workflow Fails: Version Mismatch

**Symptom:** "package.json version does not match tag version"

**Solution:**
```bash
# Ensure package.json version matches the tag
# If tag is v2.0.0, package.json should have "version": "2.0.0"

# Fix version in package.json
npm version 2.0.0 --no-git-tag-version

# Commit
git add package.json
git commit -m "chore: fix version number"

# Delete old tag
git tag -d v2.0.0
git push origin :refs/tags/v2.0.0

# Recreate tag
git tag v2.0.0
git push origin v2.0.0
```

### Workflow Fails: npm Authentication

**Symptom:** "npm ERR! 403 Forbidden" or "OIDC token verification failed"

**Solution:**
1. Verify Trusted Publishing is configured on npm.com
2. Check repository name in npm.com matches: `PierreJanineh/TechDebtMCP`
3. Check workflow file name matches: `publish.yml`
4. Verify `id-token: write` permission exists in workflow
5. See [NPM_SETUP.md](NPM_SETUP.md) for configuration details
6. Re-run the workflow (no need to recreate tag)

### npm Publish Fails: Package Already Published

**Symptom:** "npm ERR! 403 You cannot publish over the previously published versions"

**Solution:**
```bash
# You cannot republish the same version
# Bump to next patch version
npm version patch
git push origin "v$(node -p "require('./package.json').version")"

```

## Emergency Rollback

### If Bad Version is Published (Within 72 Hours)

```bash
# Unpublish the bad version (within 72 hours)
npm unpublish tech-debt-mcp@2.0.0

# Note: This is only possible within 72 hours of publishing
# After that, you must publish a patch release
```

### If More Than 72 Hours Have Passed

You cannot unpublish. Instead, publish a patch release:

```bash
# Checkout the problematic version
git checkout v2.0.0

# Create a fix branch
git checkout -b fix/urgent-patch

# Fix the issue
# ... make changes ...

# Test thoroughly
npm test
npm run build

# Merge to develop
git checkout develop
git merge fix/urgent-patch

# Create patch release
npm version patch  # Creates v2.0.1
git push origin v2.0.1

```

### Deprecate a Version

If the version should not be used but can't be unpublished:

```bash
# Deprecate the version
npm deprecate tech-debt-mcp@2.0.0 "Critical bug, please upgrade to v2.0.1"
```

Users will see a warning when installing the deprecated version.

## Release Checklist Template

Copy this for each release:

```
Release: v____.____.____
Date: ________

Pre-Release:
- [ ] All features merged to develop
- [ ] All tests pass: npm test
- [ ] Build succeeds: npm run build
- [ ] CHANGELOG.md updated
- [ ] README.md updated
- [ ] ARCHITECTURE.md updated (if needed)
- [ ] On develop branch, up to date

Release:
- [ ] Version bumped: npm version [patch|minor|major]
- [ ] CHANGELOG.md committed
- [ ] Tag pushed: git push origin v____.____.____
- [ ] Commits pushed: git push origin develop
- [ ] GitHub Actions workflow succeeded
- [ ] npm package published
- [ ] GitHub Release created

Post-Release:
- [ ] npm package verified: npm view tech-debt-mcp
- [ ] GitHub Release verified
- [ ] Test installation: npm install -g tech-debt-mcp@____.____.____
- [ ] Basic functionality tested
- [ ] Provenance verified (optional)
- [ ] Release announcement (optional)

Notes:
________________________________________________________________________________
________________________________________________________________________________
```

## Best Practices

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR (X.0.0):** Breaking changes
  - Changed API signatures
  - Removed features
  - Changed default behavior

- **MINOR (0.X.0):** New features, backward compatible
  - New MCP tools
  - New analysis capabilities
  - New language support

- **PATCH (0.0.X):** Bug fixes only
  - Fixed crashes
  - Fixed incorrect results
  - Performance improvements
  - Documentation updates

### Release Timing

- **Patch releases:** As needed, can be quick
- **Minor releases:** Every 2-4 weeks
- **Major releases:** Every 3-6 months, with beta period

### Communication

- Update CHANGELOG.md with clear descriptions
- Use GitHub Releases for detailed notes
- Consider blog post or announcement for major releases
- Tag relevant stakeholders in release discussions

---

**Last Updated:** 2026-02-07

For questions or issues, see [CONTRIBUTING.md](CONTRIBUTING.md) or open an issue.

## Releasing v2.0.0 (Phase 2 - Dependency Analysis)

Phase 2 (dependency analysis) introduces the `check_dependencies` MCP tool and a set of dependency parsers. Follow these additional steps when preparing a v2.0.0 release:

1. Ensure `docs/phase-2` branch includes README, ARCHITECTURE, CHANGELOG, and CONTRIBUTING updates.
2. Verify dependency parser unit tests: `npm test -- src/analyzers/dependencies`.
3. Run the `check_dependencies` tool locally against the repository to validate output:

```bash
# From project root
npx tech-debt-mcp # or npm run dev and call the tool via MCP client
# or run the server locally and call the tool from an MCP client
```

4. Add CHANGELOG entry for v2.0.0 describing new parsers and `check_dependencies` tool.
5. Follow standard release steps (version bump, tag, push) described above.

Note: v2.0.0 is a feature release (new functionality) and should be published as a major bump if the project intends to mark it breaking: `npm version major`.

