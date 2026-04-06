# Using Tech Debt MCP with GitHub Packages

This guide explains how to install and use Tech Debt MCP from GitHub Packages.

## What is GitHub Packages?

GitHub Packages is a package hosting service that lets you host your code packages privately or publicly. Tech Debt MCP is primarily published to **npm** (the recommended install method). GitHub Packages is available as an alternative for corporate environments or private registry setups.

## Installation from GitHub Packages

### Option 1: Direct npm Install (Easiest)

The package is published to both npm and GitHub Packages. The easiest way is to install from npm:

```bash
npm install -g tech-debt-mcp
```

### Option 2: Install from GitHub Packages

If you prefer to use GitHub Packages, you need to authenticate first.

#### Step 1: Create a GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes:
   - ✅ `read:packages` - to download packages
   - ✅ `write:packages` - if you plan to publish
4. Generate and copy the token

#### Step 2: Configure npm

Create or update `~/.npmrc` in your home directory:

```bash
@PierreJanineh:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Replace `YOUR_GITHUB_TOKEN` with your actual token from Step 1.

**Important:** Never commit this file to version control! Add to `.gitignore` if needed.

#### Step 3: Install the Package

```bash
npm install -g @PierreJanineh/tech-debt-mcp
```

Or for local project installation:

```bash
npm install @PierreJanineh/tech-debt-mcp
```

## Using the Package

After installation, you can use the MCP server in two ways:

### 1. As a Global CLI Tool

```bash
tech-debt-mcp
```

This starts the MCP server on stdio, ready to communicate with GitHub Copilot or other MCP clients.

### 2. As an MCP Server in Your Project

Tech Debt MCP is an MCP server — it communicates over stdio with MCP-compatible clients (Claude Code, GitHub Copilot, etc.). It is not imported as a library.

## MCP Client Integration

To use Tech Debt MCP with an MCP-compatible client:

1. **Install the package** (using either method above)

2. **Configure in your MCP settings:**

Add to your MCP configuration file (usually `~/.config/cline/cline_mcp_settings.json` or similar):

```json
{
  "mcpServers": {
    "tech-debt": {
      "command": "tech-debt-mcp",
      "args": []
    }
  }
}
```

3. **Or if installed locally in your project:**

```json
{
  "mcpServers": {
    "tech-debt": {
      "command": "node",
      "args": ["./node_modules/.bin/tech-debt-mcp"]
    }
  }
}
```

## Troubleshooting

### "Not Found" Error

```
npm ERR! 404 Not Found - GET https://registry.npmjs.org/@PierreJanineh/tech-debt-mcp
```

This means you're trying to install from npm registry but the scoped package is on GitHub Packages. Either:
- Use the non-scoped version: `npm install -g tech-debt-mcp`
- Or configure npm for GitHub Packages (see Option 2 above)

### Authentication Failed

```
npm ERR! 401 Unauthorized
```

Your GitHub token might be:
- Expired or invalid
- Missing the `read:packages` scope
- Not properly configured in `.npmrc`

**Solution:** Generate a new token with proper scopes.

### Permission Denied on Global Install

If you get permission errors:

```bash
# Use a Node version manager (recommended)
nvm use 20
npm install -g tech-debt-mcp

# Or use sudo (not recommended)
sudo npm install -g tech-debt-mcp
```

## Updating the Package

To update to the latest version:

```bash
npm install -g tech-debt-mcp@latest
```

Or for a specific version:

```bash
npm install -g tech-debt-mcp@1.0.0
```

## Version History

All releases are available at:
- **npm Registry:** https://www.npmjs.com/package/tech-debt-mcp
- **GitHub Packages:** https://github.com/PierreJanineh/TechDebtMCP/packages

## Support & Issues

If you encounter issues:

1. **Check the logs:**
   ```bash
   tech-debt-mcp --version
   ```

2. **Report on GitHub:**
   https://github.com/PierreJanineh/TechDebtMCP/issues

3. **Check the documentation:**
   https://github.com/PierreJanineh/TechDebtMCP#readme

## For Developers

If you're developing Tech Debt MCP locally:

### Build from Source

```bash
git clone https://github.com/PierreJanineh/TechDebtMCP.git
cd TechDebtMCP
npm install
npm run build
npm link  # Makes `tech-debt-mcp` available globally
```

### Testing Locally

```bash
npm run dev  # Run with ts-node
npm test     # Run test suite
npm run watch # Watch mode
```

### Publishing a New Version

```bash
# Update version in package.json
npm version patch|minor|major

# Create a git tag
git tag v$(npm pkg get version | tr -d '"')

# Push to trigger GitHub Actions (from develop branch)
git push origin develop --tags
```

The CI/CD workflow will automatically:
1. Run tests
2. Build the project
3. Publish to both npm and GitHub Packages
4. Create a GitHub Release

## License

Tech Debt MCP is licensed under the MIT License. See [LICENSE](https://github.com/PierreJanineh/TechDebtMCP/blob/main/LICENSE) for details.

