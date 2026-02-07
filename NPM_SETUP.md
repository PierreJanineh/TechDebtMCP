# NPM Publish Setup Guide

This guide walks you through the one-time setup needed to enable automated npm publishing for Tech Debt MCP.

## Prerequisites

- GitHub repository admin access
- npm account (create at https://www.npmjs.com if you don't have one)
- Package must be claimed on npm or have publishing rights

## Step 1: Verify npm Package Name

```bash
# Check if package name is available
npm search tech-debt-mcp

# If you see your package, you're good
# If not available, you may need to claim it first
```

## Step 2: Create npm Access Token

1. **Log in to npm:**
   - Go to https://www.npmjs.com
   - Sign in with your account

2. **Navigate to Access Tokens:**
   - Click your profile picture (top right)
   - Select "Access Tokens"
   - OR go directly to: https://www.npmjs.com/settings/YOUR_USERNAME/tokens

3. **Generate New Token:**
   - Click "Generate New Token"
   - Select **"Automation"** (not "Publish" or "Read-only")
   - This type allows GitHub Actions to publish

4. **Copy the Token:**
   - ⚠️ **IMPORTANT:** Copy the token immediately
   - You won't be able to see it again
   - It looks like: `npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 3: Add Token to GitHub Secrets

1. **Go to Repository Settings:**
   - https://github.com/PierreJanineh/TechDebtMCP/settings

2. **Navigate to Secrets:**
   - Click "Secrets and variables" in the left sidebar
   - Click "Actions"
   - OR go directly to: https://github.com/PierreJanineh/TechDebtMCP/settings/secrets/actions

3. **Create New Secret:**
   - Click "New repository secret"
   - **Name:** `NPM_TOKEN` (must be exactly this)
   - **Value:** Paste your npm token
   - Click "Add secret"

4. **Verify Secret Added:**
   - You should see `NPM_TOKEN` in the list
   - The value will be hidden (shows `***`)

## Step 4: Verify GitHub Actions Permissions

1. **Check Workflow Permissions:**
   - Go to https://github.com/PierreJanineh/TechDebtMCP/settings/actions
   - Under "Workflow permissions":
     - Select "Read and write permissions"
     - Check "Allow GitHub Actions to create and approve pull requests"
   - Click "Save"

2. **Verify GITHUB_TOKEN Permissions:**
   - This is automatically provided by GitHub
   - No additional setup needed

## Step 5: Test the Setup (Dry Run)

Before making a real release, test that everything works:

```bash
# Clone repository
git clone https://github.com/PierreJanineh/TechDebtMCP.git
cd TechDebtMCP

# Checkout main branch
git checkout main
git pull origin main

# Install dependencies
npm ci

# Run tests locally
npm test

# Build locally
npm run build

# Check if dist/ was created
ls -la dist/

# Verify npm authentication (optional)
# This checks if you can publish manually
npm login
npm publish --dry-run
```

## Step 6: Make a Test Release (Optional)

If you want to test the full workflow before v1.0.0:

```bash
# Create a test version (0.0.1)
npm version 0.0.1 --no-git-tag-version

# Edit package.json to add:
# "private": true

# This prevents actual publishing
# Commit and push
git add package.json
git commit -m "chore: test release setup"
git tag v0.0.1
git push origin v0.0.1
git push origin main

# Watch GitHub Actions
# Go to: https://github.com/PierreJanineh/TechDebtMCP/actions

# The workflow will run but skip publishing (because private: true)

# After verifying workflow runs successfully:
# Remove "private": true from package.json
# Update to real version (1.0.0)
```

## Step 7: Ready for First Release

Once setup is complete, you can release v1.0.0:

```bash
# Ensure you're on main, up to date
git checkout main
git pull origin main

# Run tests
npm test

# Build
npm run build

# Set version to 1.0.0
npm version 1.0.0

# Update CHANGELOG.md with v1.0.0 details
# (See RELEASE.md for full process)

# Push tag (this triggers the workflow)
git push origin v1.0.0
git push origin main

# Monitor GitHub Actions
# https://github.com/PierreJanineh/TechDebtMCP/actions
```

## Troubleshooting

### "npm ERR! need auth"

**Problem:** npm token is invalid or not set correctly

**Solution:**
1. Verify `NPM_TOKEN` secret exists in GitHub
2. Check token hasn't expired (regenerate if needed)
3. Ensure token type is "Automation"

### "npm ERR! 403 Forbidden"

**Problem:** You don't have publish permissions for the package

**Solution:**
1. Verify you own the package on npm
2. Check you're logged in to the correct npm account
3. If package doesn't exist, publish manually once:
   ```bash
   npm login
   npm publish --access public
   ```

### "npm ERR! Package already exists"

**Problem:** Package name is taken by someone else

**Solution:**
1. Use a scoped package: `@your-username/tech-debt-mcp`
2. Choose a different name
3. Contact npm support if you believe you own the name

### Workflow Doesn't Trigger

**Problem:** Pushing tag doesn't start GitHub Actions

**Solution:**
1. Check workflow file exists: `.github/workflows/publish.yml`
2. Verify workflow syntax is valid
3. Check GitHub Actions is enabled for repository
4. Tag must match pattern `v*.*.*` (e.g., v1.0.0, not 1.0.0)

### "Permission denied" in GitHub Actions

**Problem:** Workflow can't create release or publish

**Solution:**
1. Check workflow permissions in repository settings
2. Verify `permissions:` section in workflow file:
   ```yaml
   permissions:
     contents: write
     id-token: write
   ```

## Security Best Practices

1. **Never Commit npm Token:**
   - Don't add token to code or `.env` files
   - Always use GitHub Secrets

2. **Use Automation Tokens:**
   - Don't use "Publish" tokens (too much access)
   - Use "Automation" tokens (scoped access)

3. **Rotate Tokens Regularly:**
   - Regenerate tokens every 6-12 months
   - Update GitHub Secret when rotating

4. **Enable 2FA on npm:**
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/profile
   - Enable two-factor authentication
   - Protects against unauthorized publishing

5. **Use Provenance:**
   - Already configured in workflow: `npm publish --provenance`
   - Provides cryptographic proof of origin
   - Increases supply chain security

## Verification Checklist

Before first release, verify:

- [ ] npm account exists and verified
- [ ] npm automation token created
- [ ] `NPM_TOKEN` secret added to GitHub
- [ ] GitHub Actions permissions set to "Read and write"
- [ ] Workflow file exists: `.github/workflows/publish.yml`
- [ ] Tests pass locally: `npm test`
- [ ] Build succeeds locally: `npm run build`
- [ ] Package name is available on npm
- [ ] CHANGELOG.md is ready for v1.0.0
- [ ] README.md is complete

Once all checked, you're ready to release! 🚀

---

**Need Help?**

- See [RELEASE.md](RELEASE.md) for detailed release process
- See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
- Open an issue for setup problems

**Last Updated:** 2026-02-07

