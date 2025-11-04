# Deployment Guide for Synapse

This guide covers how to deploy and publish the Synapse load testing tool to NPM.

## Prerequisites

1. **NPM Account** - Create account at [npmjs.com](https://www.npmjs.com)
2. **Node.js** (v16 or higher)
3. **Git** repository set up
4. **K6** installed for testing

## Pre-deployment Checklist

### 1. Code Quality
- [ ] All tests pass: `npm test`
- [ ] TypeScript compiles: `npm run build`
- [ ] No linting errors
- [ ] Documentation is complete

### 2. Package Configuration
- [ ] Update `package.json` version
- [ ] Set correct repository URLs
- [ ] Update author information
- [ ] Verify keywords and description

### 3. Testing
- [ ] Test CLI commands locally
- [ ] Test with different Node.js versions
- [ ] Verify examples work
- [ ] Test installation process

## Publishing to NPM

### 1. Login to NPM
```bash
npm login
```

### 2. Verify Package
```bash
# Check what will be published
npm pack --dry-run

# Verify package contents
npm publish --dry-run
```

### 3. Publish
```bash
# For first release
npm publish

# For beta releases
npm publish --tag beta

# For specific access
npm publish --access public
```

### 4. Verify Installation
```bash
# Test global installation
npm install -g synapse-load-tester

# Test CLI
synapse --help
```

## Version Management

### Semantic Versioning
- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backward compatible
- **Patch** (0.0.1): Bug fixes, backward compatible

### Update Version
```bash
# Patch version
npm version patch

# Minor version
npm version minor

# Major version
npm version major

# Specific version
npm version 1.2.3
```

## GitHub Actions CI/CD

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to NPM

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        registry-url: 'https://registry.npmjs.org'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build
    
    - name: Publish to NPM
      run: npm publish
      env:
        NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Documentation Deployment

### GitHub Pages
1. Enable GitHub Pages in repository settings
2. Set source to `docs/` folder
3. Access at `https://username.github.io/synapse`

### Docsify Deployment
```bash
# Serve locally
npm run docs:serve

# Deploy to GitHub Pages
# Push docs/ folder to gh-pages branch
```

## Distribution Checklist

### Before Publishing
- [ ] Update CHANGELOG.md
- [ ] Update version in package.json
- [ ] Tag release in Git
- [ ] Test installation from NPM
- [ ] Update documentation

### After Publishing
- [ ] Verify package on NPM
- [ ] Test global installation
- [ ] Update GitHub release notes
- [ ] Announce on social media/forums
- [ ] Monitor for issues

## K6 Installation Note

Since K6 cannot be bundled as an NPM dependency, users need to install it separately:

### Installation Instructions for Users

**macOS:**
```bash
brew install k6
```

**Ubuntu/Debian:**
```bash
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```bash
choco install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

## Monitoring and Maintenance

### NPM Statistics
- Monitor download statistics
- Track usage patterns
- Monitor issues and feedback

### Version Support
- Maintain LTS versions
- Provide migration guides
- Deprecate old versions gracefully

### Community
- Respond to GitHub issues
- Review pull requests
- Update documentation based on feedback

## Troubleshooting

### Common Publishing Issues

1. **Authentication Error**
   ```bash
   npm whoami  # Check if logged in
   npm login   # Re-authenticate
   ```

2. **Version Already Exists**
   ```bash
   npm version patch  # Increment version
   ```

3. **Package Name Taken**
   - Choose different name
   - Use scoped package: `@username/synapse`

4. **Build Failures**
   ```bash
   npm run clean
   npm install
   npm run build
   ```

### Testing Installation Issues

```bash
# Test in clean environment
docker run -it node:18 bash
npm install -g synapse-load-tester
synapse --help
```

## Release Process

1. **Development**
   - Feature development
   - Bug fixes
   - Testing

2. **Pre-release**
   - Version bump
   - Update changelog
   - Final testing

3. **Release**
   - Git tag
   - NPM publish
   - GitHub release

4. **Post-release**
   - Monitor for issues
   - Update documentation
   - Plan next release

## Security Considerations

- Use NPM 2FA
- Regularly update dependencies
- Scan for vulnerabilities: `npm audit`
- Use `.npmignore` to exclude sensitive files
