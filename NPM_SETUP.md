# NPM Publish Setup Guide

This guide walks you through the one-time setup needed to enable automated npm publishing for Tech Debt MCP using **Trusted Publishing** (no tokens required).

## What is Trusted Publishing?

**Trusted Publishing** uses OpenID Connect (OIDC) to verify GitHub Actions' identity directly with npm. This eliminates the need for long-lived access tokens.

**Benefits:**
- ✅ **No token expiration** - No 90-day rotation needed
- ✅ **No secrets to manage** - No `NPM_TOKEN` required
- ✅ **More secure** - npm verifies GitHub Actions directly
- ✅ **Zero maintenance** - Set up once, works forever

## Prerequisites

- GitHub repository admin access
- npm account (create at https://www.npmjs.com if you don't have one)
- Package must be claimed on npm or have publishing rights

## Step 1: Verify npm Package Name

```bash
# Check if package name is available
npm search tech-debt-mcp

# If you see your package, you're good
# If not available, you may need to publish manually once first
```

## Step 2: Enable Trusted Publishing on npm

**This is the key step that replaces token management.**

1. **Log in to npm:**
   - Go to https://www.npmjs.com
   - Sign in with your account

2. **Navigate to Package Settings:**
   - Go to your package: https://www.npmjs.com/package/tech-debt-mcp
   - Click the **"Settings"** tab
   - Or go directly to: https://www.npmjs.com/package/tech-debt-mcp/access

3. **Configure Trusted Publishing:**
   - Scroll to **"Publishing access"** section
   - Click **"Require two-factor authentication or automation"**
   - Under **"Automation"**, click **"Add GitHub Actions"**
   
4. **Fill in GitHub Actions Details:**
   - **Repository:** `PierreJanineh/TechDebtMCP` (your repo in format `owner/repo`)
   - **Workflow:** `publish.yml` (the workflow file name)
   - **Environment:** Leave blank (or use `production` if you want extra approval step)
   
5. **Save Configuration:**
   - Click **"Add"** or **"Save"**
   - You should see the GitHub Actions integration listed

**Note:** If the package doesn't exist yet, you'll need to publish v0.0.1 manually first (see Step 5 below), then configure Trusted Publishing for future releases.

## Step 3: Verify GitHub Actions Permissions


1. **Check Workflow Permissions:**
   - Go to https://github.com/PierreJanineh/TechDebtMCP/settings/actions
   - Under "Workflow permissions":
     - Select **"Read and write permissions"**
     - Check **"Allow GitHub Actions to create and approve pull requests"**
   - Click "Save"

2. **Verify OIDC Permissions in Workflow:**
   - The workflow file `.github/workflows/publish.yml` must have:
   ```yaml
   permissions:
     contents: write  # For creating GitHub releases
     id-token: write  # For Trusted Publishing (OIDC)
   ```
   - This is already configured ✅

## Step 4: Test the Setup (Dry Run)

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

# Test local publish (dry run)
npm publish --dry-run
```

**Note:** For the first publish, you may need to do it manually with `npm login` + `npm publish`, then configure Trusted Publishing for subsequent automated releases.

## Step 5: Make First Manual Publish (If Package Doesn't Exist)

If this is the very first release and the package doesn't exist on npm yet:

```bash
# Ensure you're at version 1.0.0
npm version 1.0.0 --no-git-tag-version

# Login to npm manually
npm login

# Publish first version manually
npm publish --access public

# Now the package exists and you can configure Trusted Publishing
# Go back to Step 2 and configure npm.com settings
```

After the first manual publish, all future releases will be automated via GitHub Actions.

## Step 6: Test Automated Release (Optional)

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

### "npm ERR! 403 Forbidden" or "OIDC token verification failed"

**Problem:** Trusted Publishing not configured correctly

**Solution:**
1. Verify Trusted Publishing is set up on npm.com (Step 2)
2. Check repository name matches exactly: `PierreJanineh/TechDebtMCP`
3. Check workflow file name matches: `publish.yml`
4. Verify `id-token: write` permission is in workflow
5. Make sure you're publishing from the correct repository

### "npm ERR! 404 Not Found"

**Problem:** Package doesn't exist yet

**Solution:**
1. Do first publish manually (Step 5)
2. Then configure Trusted Publishing
3. Future releases will be automated

### "npm ERR! 403 Forbidden"

**Problem:** You don't have publish permissions for the package

**Solution:**
1. Verify you own the package on npm
2. Check you're logged in to the correct npm account
3. If package doesn't exist, publish manually once (Step 5)

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
     id-token: write  # Required for Trusted Publishing
   ```

## Security Best Practices

1. **Enable 2FA on npm:**
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/profile
   - Enable two-factor authentication
   - Protects against unauthorized publishing

2. **Use Trusted Publishing:**
   - Already configured ✅
   - No tokens to leak or expire
   - npm verifies GitHub Actions directly

3. **Review Publishing History:**
   - Check npm package page regularly
   - Verify all publishes are from GitHub Actions
   - Look for the provenance badge

4. **Monitor GitHub Actions:**
   - Review workflow runs: https://github.com/PierreJanineh/TechDebtMCP/actions
   - Check for unauthorized tag pushes
   - Enable branch protection on `main`

5. **Use Provenance:**
   - Already configured in workflow: `npm publish --provenance`
   - Provides cryptographic proof of origin
   - Increases supply chain security

## Verification Checklist

Before first release, verify:

- [ ] npm account exists and verified
- [ ] 2FA enabled on npm account
- [ ] Trusted Publishing configured on npm.com
- [ ] GitHub Actions permissions set to "Read and write"
- [ ] Workflow file exists: `.github/workflows/publish.yml`
- [ ] Tests pass locally: `npm test`
- [ ] Build succeeds locally: `npm run build`
- [ ] Package name is available on npm (or first manual publish done)
- [ ] CHANGELOG.md is ready for v1.0.0
- [ ] README.md is complete

Once all checked, you're ready to release! 🚀

---

**Need Help?**

- See [RELEASE.md](RELEASE.md) for detailed release process
- See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
- npm Trusted Publishing docs: https://docs.npmjs.com/generating-provenance-statements

**Last Updated:** 2026-02-07

