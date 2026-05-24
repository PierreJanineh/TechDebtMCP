# Quick Release Reference

Two-trunk model: `develop` is the active integration trunk, `main` is the stable production trunk. Releases cut a dedicated `release/vX.X.X` branch from develop, tag on the release branch, then back-merge to both develop and main. This doc is the short-form checklist — see [RELEASE.md](RELEASE.md) for the full procedure and edge cases.

## 🚀 Release in 6 Steps

### 1️⃣ Prepare

```bash
git checkout develop && git pull
npm run lint && npm run typecheck && npm test && npm run build
```

### 2️⃣ Cut the release branch

```bash
VERSION=2.0.3          # or whatever the target is
git checkout -b release/v$VERSION develop
git push -u origin release/v$VERSION
```

### 3️⃣ Merge fix/doc PRs into the release branch

Open PRs targeting `release/v$VERSION` (not `develop` or `main`) for any security fixes, changelog updates, docs refreshes, etc. Merge them via squash as usual.

### 4️⃣ Bump version + update CHANGELOG on the release branch

```bash
git checkout release/v$VERSION && git pull
npm version $VERSION --no-git-tag-version   # Updates package.json only
# Update CHANGELOG.md: move Unreleased → [v$VERSION] block, add date
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: prepare v$VERSION release"
git push origin release/v$VERSION
```

### 4️⃣.5 Run manual test gates **before tagging**

Open tracker issues from `.github/ISSUE_TEMPLATE/`:

- `release-checklist.yml` — overarching release tracker
- `sanity-run.yml` — smoke pass on the shipped artifacts (every release)
- `regression-run.yml` — broad manual pass (minor/major only; skip on patches unless an analyzer changed)

Both run issues must be fully checked before pushing the tag in Step 5️⃣ — once tagged, npm publish fires via OIDC and is irreversible.

### 5️⃣ Tag on the release branch + push the tag

```bash
git tag v$VERSION
git push origin v$VERSION
```

GitHub Actions `publish.yml` then:

- Verifies `package.json` version matches the tag ✅
- Runs tests + builds TypeScript ✅
- Publishes to npm via Trusted Publishing / OIDC with `--provenance` ✅
- Creates a GitHub Release ✅

### 6️⃣ Back-merge the release branch into develop AND main

**Develop (direct merge, no ruleset gates your PierreJanineh account here):**

```bash
git checkout develop && git pull origin develop
git merge --no-ff release/v$VERSION -m "release: back-merge v$VERSION to develop"
git push origin develop
```

**Main (ruleset-gated — open a PR, do not `git push origin main`):**

```bash
git checkout -b release-backmerge-v$VERSION main
git pull origin main
git merge --no-ff release/v$VERSION -m "release: back-merge v$VERSION to main"
git push -u origin release-backmerge-v$VERSION

# Open the PR (bot token required per .claude/rules/git-workflow.md)
GH_TOKEN=$BOT_TOKEN gh pr create \
  --base main --head release-backmerge-v$VERSION \
  --title "release: back-merge v$VERSION to main" \
  --body "Advances main to the v$VERSION tagged state per the two-trunk model."
```

The `Main` ruleset requires squash merges, codeowner review, last-push approval, thread resolution, CodeQL clean, and code-quality warnings — same gates as develop, stricter than develop. Merge the PR via squash once the gates clear.

**Do not** run `git push origin main` directly — that bypasses the ruleset and will be rejected unless you use an admin token with explicit bypass.

---

## 📦 Version Types

| Type | Command | Use Case | Example |
|------|---------|----------|---------|
| **Patch** | `npm version patch --no-git-tag-version` | Bug fixes only | 1.0.0 → 1.0.1 |
| **Minor** | `npm version minor --no-git-tag-version` | New features | 1.0.0 → 1.1.0 |
| **Major** | `npm version major --no-git-tag-version` | Breaking changes | 1.0.0 → 2.0.0 |

Always pass `--no-git-tag-version` on the release branch — the tag goes on in Step 5, after the version bump and CHANGELOG edit are both committed.

---

## ⚠️ Pre-Release Checklist

- [ ] All features merged to `develop`
- [ ] Lint clean: `npm run lint`
- [ ] Typecheck clean: `npm run typecheck`
- [ ] Tests pass: `npm test`
- [ ] Build works: `npm run build`
- [ ] CHANGELOG.md `[Unreleased]` block captures every user-visible change
- [ ] No uncommitted changes on `develop`
- [ ] Release branch `release/v$VERSION` created from develop
- [ ] `package.json` version bump committed on the release branch
- [ ] TECH_DEBT_SCAN.md refreshed with the latest `tech-debt-mcp-local` scan (source of truth for README / ARCHITECTURE / CONTRIBUTING scan blocks)
- [ ] `mcpb/manifest.json` version matches `package.json` (build asserts equality)
- [ ] Sanity-run issue opened and fully checked
- [ ] Regression-run issue opened and fully checked (minor/major only)

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
# Cut a new release branch from develop, bump patch, fix the issue
git checkout -b release/vX.Y.(Z+1) develop
# ... fix, commit, tag, publish as per Steps 4-6 above
```

---

## 📚 Full Documentation

- **Detailed Release Guide:** [RELEASE.md](RELEASE.md)
- **Two-trunk model + branch conventions:** `.claude/rules/git-workflow.md` (local maintainer rules)
- **npm Setup (first time):** [NPM_SETUP.md](NPM_SETUP.md)
- **Development Roadmap:** [ROADMAP.md](ROADMAP.md)

---

## 🔐 Required Setup (First Time Only)

**Trusted Publishing on npm.com:**

- Configure GitHub Actions integration on npm ✅
- See **NPM_SETUP.md** for step-by-step instructions
- No secrets or tokens needed for npm publish — OIDC handles it

**Bot token for release-back-merge PRs:**

- The `main` back-merge PR must be opened with the bot token (`ghs_` prefix)
- See `.claude/rules/git-workflow.md` for the bot token workflow

---

## 🎯 GitHub Actions URLs

- **Workflows:** https://github.com/PierreJanineh/TechDebtMCP/actions
- **Releases:** https://github.com/PierreJanineh/TechDebtMCP/releases
- **Settings:** https://github.com/PierreJanineh/TechDebtMCP/settings

---

## 💡 Pro Tips

1. **Always test locally first:** `npm run lint && npm run typecheck && npm test && npm run build`
2. **Cut the release branch early.** Even if only one fix is going in, cutting `release/vX.X.X` from develop keeps the tag point separate from ongoing integration work.
3. **Update CHANGELOG before pushing the tag.** The `[v$VERSION]` entry must be committed on the release branch before Step 5, otherwise the tagged commit ships with a stale changelog.
4. **Watch GitHub Actions.** `publish.yml` is triggered by the tag push — monitor the `Actions` tab for any failures.
5. **Verify npm publication.** Check https://www.npmjs.com/package/tech-debt-mcp after the workflow completes.
6. **Test installation in a fresh directory.** `npm install -g tech-debt-mcp@X.Y.Z` then `tech-debt-mcp --version`.
7. **Back-merge to main via PR.** Direct `git push origin main` is blocked by the `Main` ruleset — always go through a PR (see Step 6).

---

**Last Updated:** 2026-04-11
