# Using CycloneDX SBOM with Dependency-Track

This guide explains how to use the generated CycloneDX SBOMs for security scanning with Dependency-Track and other security tools.

---

## 🔐 What is Dependency-Track?

**Dependency-Track** is an intelligent **Component Analysis platform** that allows organizations to identify and reduce risk in their software supply chain.

- **Open Source:** Free, self-hosted security analysis tool
- **SBOM-Native:** Uses CycloneDX and SPDX standards
- **Vulnerability Scanning:** Integrates with NVD, OSS Index, Sonatype, GitHub Advisories, etc.
- **Policy Engine:** Define security policies and compliance rules
- **Continuous Monitoring:** Track vulnerabilities over time

**Website:** https://dependencytrack.org/

---

## 📋 Generated SBOM Files

This project generates **4 SBOM files** when you run `npm run legal:generate`:

| File | Format | Use Case |
|------|--------|----------|
| `sbom/cyclonedx.json` | **CycloneDX 1.6 JSON** | **Primary** - Use this for Dependency-Track |
| `sbom/cyclonedx.xml` | **CycloneDX 1.6 XML** | Alternative format for some tools |
| `sbom/npm-dependencies.json` | npm JSON | Legacy npm format (full tree) |
| `sbom/npm-production.json` | npm JSON | Legacy npm format (production only) |

**Recommendation:** Use `cyclonedx.json` for Dependency-Track and most security tools.

---

## 🚀 Quick Start: Using with Dependency-Track

### Option 1: Self-Hosted Dependency-Track (Recommended)

#### Step 1: Install Dependency-Track (Docker)
```bash
# Using Docker Compose (easiest method)
curl -LO https://dependencytrack.org/docker-compose.yml
docker-compose up -d

# Access at: http://localhost:8080
# Default credentials: admin / admin
```

#### Step 2: Create a Project
1. Log in to Dependency-Track
2. Click **"Projects"** → **"Create Project"**
3. Set project name: **"Nexus Verge"**
4. Set version: `1.0.0` (or your current version)
5. Click **"Create"**

#### Step 3: Upload SBOM
1. Open your project
2. Click **"Components"** tab → **"Upload BOM"**
3. Select `legal/sbom/cyclonedx.json`
4. Click **"Upload"**

#### Step 4: View Results
Dependency-Track will automatically:
- Parse all components (126 dependencies for this project)
- Query vulnerability databases (NVD, OSS Index, etc.)
- Display vulnerabilities with severity ratings (Critical, High, Medium, Low)
- Show license compliance issues
- Calculate risk score

### Option 2: Cloud-Hosted Dependency-Track

If you don't want to self-host, several vendors offer Dependency-Track as a service:
- **OWASP Foundation** (for OWASP projects)
- **Commercial vendors** (Sonatype, Snyk, JFrog Xray)

---

## 📊 What Dependency-Track Checks

### 1. **Known Vulnerabilities**
- CVEs (Common Vulnerabilities and Exposures)
- GitHub Security Advisories
- NPM advisories
- NVD (National Vulnerability Database)
- Sonatype OSS Index

### 2. **License Compliance**
- Identifies all licenses (MIT, Apache-2.0, ISC, BSD, etc.)
- Flags incompatible licenses
- Shows transitive license issues
- Policy violations

### 3. **Outdated Dependencies**
- Highlights old versions with known issues
- Suggests updates
- Shows end-of-life (EOL) packages

### 4. **Policy Violations**
- Custom policies (e.g., "No GPL licenses")
- Security policies (e.g., "No critical vulnerabilities")
- Operational policies (e.g., "No unmaintained packages")

---

## 🛠️ Automation & CI/CD Integration

### GitHub Actions Integration

Add this to `.github/workflows/security-scan.yml`:

```yaml
name: Security Scan with Dependency-Track

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly scan

jobs:
  sbom-upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate SBOM
        run: npm run legal:generate

      - name: Upload SBOM to Dependency-Track
        uses: DependencyTrack/gh-upload-sbom@v3
        with:
          serverhostname: 'https://your-dependency-track.example.com'
          apikey: ${{ secrets.DEPENDENCYTRACK_APIKEY }}
          project: 'nexus-verge-crpg-5e'
          bomfilename: 'legal/sbom/cyclonedx.json'
```

### Manual Upload via API

```bash
# Get API key from Dependency-Track → Administration → Access Management → Teams

# Upload SBOM
curl -X POST "https://your-dependency-track.example.com/api/v1/bom" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "project=nexus-verge-crpg-5e" \
  -F "bom=@legal/sbom/cyclonedx.json"
```

---

## 🔍 Interpreting Results

### Current Project Status (as of 2026-01-14)

**Total Dependencies:** 126 (all dev dependencies, 0 runtime)

**Dependency Breakdown:**
- **Direct dev dependencies:** 2 (eslint, @cyclonedx/cyclonedx-npm)
- **Transitive dependencies:** 124

**Licenses:**
- MIT: ~90%
- Apache-2.0: ~5%
- ISC: ~3%
- BSD: ~2%

**Risk Profile:**
- **Runtime dependencies:** **0** (100% vanilla JavaScript - lowest risk!)
- **Dev dependencies:** Medium risk (ESLint + transitive)
- **Attack surface:** Minimal (dev-only, not shipped to production)

### What "Zero Runtime Dependencies" Means

✅ **No vulnerabilities in production code** - The game runs 100% vanilla JavaScript
✅ **No supply chain attacks** - Nothing to compromise in production bundle
✅ **No license conflicts** - Dev dependencies don't affect distribution
✅ **Smaller attack surface** - Only npm dev tools need security monitoring

**Security Posture:** This project has an **exceptionally low security risk** compared to typical web apps with 50-500 runtime dependencies.

---

## 🎯 Recommended Security Workflow

### Weekly Security Scan
```bash
# 1. Update dependencies
npm update

# 2. Regenerate SBOM
npm run legal:generate

# 3. Upload to Dependency-Track (manual or CI/CD)
# (Or just commit to repo and let CI handle it)

# 4. Review findings in Dependency-Track dashboard
```

### Before Release
```bash
# 1. Audit all dependencies
npm audit

# 2. Fix critical/high vulnerabilities
npm audit fix

# 3. Regenerate SBOM
npm run legal:generate

# 4. Upload to Dependency-Track
# 5. Verify zero critical/high vulnerabilities
# 6. Document any accepted risks
```

---

## 🔗 Additional Security Tools

The CycloneDX SBOM works with many security tools:

### Vulnerability Scanners
- **Dependency-Track** (recommended)
- **Grype** (Anchore)
- **Trivy** (Aqua Security)
- **OWASP Dependency-Check**
- **Snyk**
- **WhiteSource (Mend)**

### SBOM Validators
- **CycloneDX CLI** - Validate SBOM structure
- **SPDX Tools** - Convert between formats

### Supply Chain Security
- **Sigstore/Cosign** - Sign SBOMs
- **in-toto** - Supply chain attestation
- **SLSA** - Supply chain security framework

---

## 📚 Further Reading

- **CycloneDX Specification:** https://cyclonedx.org/
- **Dependency-Track Docs:** https://docs.dependencytrack.org/
- **OWASP SBOM Guide:** https://owasp.org/www-community/Component_Analysis
- **CISA SBOM Resources:** https://www.cisa.gov/sbom

---

## ❓ FAQ

**Q: Why generate both JSON and XML formats?**
A: Some tools prefer JSON (Dependency-Track), others prefer XML (older OWASP tools). We generate both for maximum compatibility.

**Q: Should I commit SBOM files to Git?**
A: **Yes!** SBOMs should be versioned alongside code to track dependencies over time. This enables security audits of past versions.

**Q: How often should I update the SBOM?**
A: Regenerate whenever:
- Dependencies change (`npm install`, `npm update`)
- Before releases
- Weekly (for continuous monitoring)

**Q: What if Dependency-Track finds vulnerabilities?**
A:
1. Check if it affects runtime (this project: likely no - zero runtime deps)
2. Check severity (Critical/High = fix ASAP, Medium/Low = plan fix)
3. Update vulnerable package: `npm update <package>`
4. If no fix available, document risk acceptance or find alternative

**Q: Can I use this SBOM for compliance (NTIA, EU Cyber Resilience Act)?**
A: **Yes!** CycloneDX 1.6 meets NTIA minimum elements for SBOM and is recognized by EU regulations.

---

**Last Updated:** 2026-01-14
**SBOM Format:** CycloneDX 1.6 (JSON + XML)
**Tool Version:** @cyclonedx/cyclonedx-npm 4.1.2
