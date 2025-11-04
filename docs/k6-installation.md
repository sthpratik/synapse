# K6 Installation Guide

Synapse requires K6 to be installed on your system to run load tests. Here's how to install K6 on different platforms.

## macOS

### Using Homebrew (Recommended)
```bash
brew install k6
```

### Using MacPorts
```bash
sudo port install k6
```

## Linux

### Ubuntu/Debian
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### CentOS/RHEL/Fedora
```bash
sudo dnf install https://dl.k6.io/rpm/repo.rpm
sudo dnf install k6
```

### Arch Linux
```bash
yay -S k6-bin
```

## Windows

### Using Chocolatey
```bash
choco install k6
```

### Using Winget
```bash
winget install k6
```

### Manual Installation
1. Download the latest release from [GitHub](https://github.com/grafana/k6/releases)
2. Extract the archive
3. Add k6.exe to your PATH

## Docker

### Run K6 with Docker
```bash
docker pull grafana/k6:latest

# Run a test
docker run --rm -i grafana/k6:latest run - <script.js
```

### Using Docker Compose
```yaml
version: '3.8'
services:
  k6:
    image: grafana/k6:latest
    volumes:
      - ./scripts:/scripts
    command: run /scripts/test.js
```

## Verify Installation

After installation, verify K6 is working:

```bash
k6 version
```

You should see output similar to:
```
k6 v0.47.0 (2023-10-04T13:22:12+0000/v0.47.0-0-gd8c42dd9, go1.21.1, linux/amd64)
```

## Using with Synapse

Once K6 is installed, you can use Synapse normally:

```bash
# Install Synapse
npm install -g synapse

# Run a load test
synapse run --config synapse.yml
```

## Troubleshooting

### Command Not Found
If you get "k6: command not found":
- Make sure K6 is in your PATH
- Restart your terminal
- Try the full path to k6

### Permission Issues (Linux/macOS)
```bash
sudo chown -R $(whoami) /usr/local/bin/k6
```

### Docker Issues
Make sure Docker is running and you have proper permissions:
```bash
docker run --rm grafana/k6:latest version
```
