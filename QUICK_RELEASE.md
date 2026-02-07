# Quick Release Reference
## 🚀 Release in 4 Steps
### 1️⃣ Prepare
```bash
git checkout develop && git pull
npm test && npm run build
```
### 2️⃣ Version & Tag
```bash
npm version [patch|minor|major]  # Updates package.json & creates tag
# Update CHANGELOG.md with changes
git add CHANGELOG.md && git commit -m "docs: update changelog"
```
### 3️⃣ Push Release Tag
```bash
git push origin v$(node -p "require('./package.json').version")
```
### 4️⃣ Merge to master
```bash
git checkout master && git pull origin master
git merge develop -m "release: merge to master"
git push origin master
```
**That's it!** GitHub Actions will:
- Run tests ✅
- Build TypeScript ✅
- Publish to npm (via Trusted Publishing) ✅
- Create GitHub Release ✅
---
## 📦 Version Types
| Type | Command | Use Case | Example |
|------|---------|----------|---------|
| **Patch** | `npm version patch` | Bug fixes only | 1.0.0 → 1.0.1 |
| **Minor** | `npm version minor` | New features | 1.0.0 → 1.1.0 |
| **Major** | `npm version major` | Breaking changes | 1.0.0 → 2.0.0 |
---
## ⚠️ Pre-Release Checklist
- [ ] All features merged to `develop`
- [ ] Tests pass: `npm test`
- [ ] Build works: `npm run build`
- [ ] CHANGELOG.md updated
- [ ] No uncommitted changes
- [ ] On `develop` branch
---
## 🔍 Verify Release
```bash
# Check npm
npm view tech-debt-mcp
# Test install
npm install -g tech-debt-mcp@latest
# Verify version
tech-debt-mcp --version
```
---
## 🆘 Emergency Rollback
**Within 72 hours:**
```bash
npm unpublish tech-debt-mcp@X.Y.Z
```
**After 72 hours:**
```bash
npm version patch  # Fix issue and release new version
```
---
## 📚 Full Documentation
- **Detailed Release Guide:** [RELEASE.md](RELEASE.md)
- **npm Setup (first time):** [NPM_SETUP.md](NPM_SETUP.md)
- **Development Roadmap:** [ROADMAP.md](ROADMAP.md)
---
## 🔐 Required Setup (First Time Only)
**Trusted Publishing on npm.com:**
- Configure GitHub Actions integration on npm ✅
- See **NPM_SETUP.md** for step-by-step instructions
- No secrets or tokens needed!
---
## 🎯 GitHub Actions URLs
- **Workflows:** https://github.com/PierreJanineh/TechDebtMCP/actions
- **Releases:** https://github.com/PierreJanineh/TechDebtMCP/releases
- **Settings:** https://github.com/PierreJanineh/TechDebtMCP/settings
---
## 💡 Pro Tips
1. **Always test locally first:** `npm test && npm run build`
2. **Update CHANGELOG before pushing:** Keep it detailed
3. **Watch GitHub Actions:** Monitor for any failures
4. **Verify npm publication:** Check npmjs.com after release
5. **Test installation:** Install in fresh directory
6. **Merge to master:** Keep master in sync with develop
---
**Last Updated:** 2026-02-07
