# K6 Auto-Installation

Synapse automatically attempts to install K6 when it's not found on your system.

## How It Works

### 1. Post-Install Check (npm install)
When you install Synapse via npm, it checks if K6 is installed:

```bash
npm install -g synapse
# ✅ K6 is already installed
# OR
# 📦 K6 not found. Installing K6...
```

### 2. Runtime Auto-Install
When you run a test and K6 is missing, Synapse attempts to install it:

```bash
synapse run --config test.yml
# ❌ K6 is not installed
# 🔧 Attempting to install K6...
# ✅ K6 installed successfully!
```

## Platform Support

### macOS
**Auto-install via Homebrew:**
```bash
brew install k6
```

**Requirements:** Homebrew must be installed

### Linux
**Auto-install via snap:**
```bash
sudo snap install k6
```

**Alternative (manual):**
```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Windows
**Auto-install via Chocolatey:**
```bash
choco install k6
```

**Alternative (winget):**
```bash
winget install k6
```

## Manual Installation

If auto-installation fails, install K6 manually:

### macOS
```bash
brew install k6
```

### Linux
```bash
sudo snap install k6
```

### Windows
```bash
choco install k6
# OR
winget install k6
```

### Docker
```bash
docker pull grafana/k6
```

## Verification

Check if K6 is installed:

```bash
k6 version
# k6 v0.48.0
```

## Troubleshooting

### Auto-Install Failed

**Error:**
```
❌ Auto-installation failed
💡 Please install K6 manually
```

**Solutions:**

1. **Install package manager first:**
   - macOS: Install Homebrew from https://brew.sh
   - Linux: Install snap: `sudo apt install snapd`
   - Windows: Install Chocolatey from https://chocolatey.org

2. **Manual installation:**
   - Download from: https://k6.io/docs/getting-started/installation/
   - Extract and add to PATH

3. **Docker alternative:**
   ```bash
   docker pull grafana/k6
   alias k6='docker run --rm -v $(pwd):/scripts grafana/k6'
   ```

### Permission Denied

**Error:**
```
Permission denied
```

**Solution:**
- Linux/macOS: Run with sudo or use snap
- Windows: Run terminal as Administrator

### K6 Not in PATH

**Error:**
```
k6: command not found
```

**Solution:**
Add K6 to PATH:

```bash
# macOS/Linux
export PATH=$PATH:/usr/local/bin

# Windows
setx PATH "%PATH%;C:\Program Files\k6"
```

## Disable Auto-Install

If you prefer manual installation only, you can skip the post-install script:

```bash
npm install synapse --ignore-scripts
```

Then install K6 manually before using Synapse.

## CI/CD Integration

For CI/CD pipelines, pre-install K6 in your build environment:

### GitHub Actions
```yaml
- name: Install K6
  run: |
    sudo gpg -k
    sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
    echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
    sudo apt-get update
    sudo apt-get install k6
```

### GitLab CI
```yaml
before_script:
  - apt-get update
  - apt-get install -y snapd
  - snap install k6
```

### Docker
```dockerfile
FROM node:18
RUN apt-get update && \
    apt-get install -y snapd && \
    snap install k6
```

## K6 Browser Module

For screenshot comparison features, ensure K6 includes the browser module (v0.43.0+):

```bash
k6 version
# k6 v0.48.0 (includes browser module)
```

The browser module is included by default in K6 v0.43.0 and later.

## Support

If you encounter issues with K6 installation:

1. Check K6 documentation: https://k6.io/docs/getting-started/installation/
2. Open an issue: https://github.com/sthpratik/synapse/issues
3. Include your OS and error message
