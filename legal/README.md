# Legal Information Directory

This directory contains all legal and licensing information for **Nexus Verge**.

---

## 📋 Directory Contents

### Core Legal Documents

| File | Description |
|------|-------------|
| [SRD_ATTRIBUTION.md](SRD_ATTRIBUTION.md) | D&D 5e System Reference Document attribution and CC BY 4.0 license compliance |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Consolidated third-party software licenses (dependencies) |
| [ASSET_ATTRIBUTIONS.md](ASSET_ATTRIBUTIONS.md) | Third-party asset attributions (sound effects, fonts, graphics) |

### SBOM (Software Bill of Materials)

| File | Description |
|------|-------------|
| [sbom/npm-dependencies.json](sbom/npm-dependencies.json) | Full dependency tree (all transitive dependencies) - npm format |
| [sbom/npm-production.json](sbom/npm-production.json) | Production dependencies only (currently none - vanilla JS) - npm format |
| [sbom/cyclonedx.json](sbom/cyclonedx.json) | **CycloneDX 1.6 JSON format** - for Dependency-Track, OWASP tools, security scanning |
| [sbom/cyclonedx.xml](sbom/cyclonedx.xml) | **CycloneDX 1.6 XML format** - alternative format for some security tools |

---

## 🔍 Quick Reference

### What Legal Requirements Does This Game Have?

1. **SRD Attribution** - Must credit Wizards of the Coast and link to CC BY 4.0 license
2. **Third-Party Licenses** - Must preserve MIT/Apache/BSD license notices for dependencies
3. **Asset Attribution** - Must credit Kenney for sound effects (CC0 requires no attribution but we provide it)

### Where is Legal Information Displayed?

1. **In-Game:** Legal modal accessible via footer link on all screens
2. **Website:** Footer link on every page points to legal modal
3. **Repository:** This `/legal/` directory with full documentation
4. **README:** Legal section with quick links to all documents

---

## 🛠️ Maintenance

### Regenerating Legal Artifacts

When dependencies change:
```bash
npm run legal:generate
```

This regenerates:
- SBOM files (`sbom/*.json`)
- Validates all required files exist
- Checks for outdated dependencies

### Verifying Compliance

To check all legal requirements are met:
```bash
npm run legal:verify
```

This checks:
- All required files exist
- SRD attribution contains required content
- Asset attributions are present
- SBOM is up-to-date
- Website integration is correct

### Automated Checks (CI)

GitHub Actions workflow [`.github/workflows/legal-compliance.yml`](../.github/workflows/legal-compliance.yml) runs on every push/PR to verify:
- ✅ All legal files exist
- ✅ SRD attribution is complete
- ✅ Asset attributions are present
- ✅ SBOM is current
- ✅ Website legal modal is integrated

---

## 📄 License Summary

### Project Code (Original Work)
- **License:** MIT License
- **Location:** [../LICENSE](../LICENSE)
- **Applies to:** All original source code, UI, algorithms

### D&D 5e Content (SRD 5.2.1)
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Source:** Wizards of the Coast LLC
- **Attribution:** [SRD_ATTRIBUTION.md](SRD_ATTRIBUTION.md)
- **Applies to:** Game rules, monsters, spells, items from SRD

### Development Dependencies
- **ESLint:** MIT License
- **67 Transitive Dependencies:** All under permissive licenses (MIT, Apache-2.0, ISC, BSD)
- **Full List:** [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

### Runtime Dependencies
- **None!** The game uses zero runtime dependencies (100% vanilla JavaScript)

### Sound Assets
- **Source:** Kenney.nl
- **License:** CC0 1.0 Universal (Public Domain Dedication)
- **Attribution:** [ASSET_ATTRIBUTIONS.md](ASSET_ATTRIBUTIONS.md)
- **Note:** CC0 requires no attribution, but we provide it as courtesy

---

## 🎯 Compliance Checklist

When making changes, ensure:

- [ ] SRD attribution remains intact and visible
- [ ] New dependencies are documented in THIRD_PARTY_NOTICES.md
- [ ] New assets have proper attribution in ASSET_ATTRIBUTIONS.md
- [ ] SBOM is regenerated after dependency changes
- [ ] Legal modal remains accessible in-game
- [ ] Footer link to legal info present on all pages
- [ ] LICENSE file unchanged (or updated with approval)
- [ ] CI legal compliance checks pass

---

## 📞 Contact

For legal questions or to report compliance issues:

- **GitHub Issues:** [Report an issue](https://github.com/yourusername/nexus-verge-crpg-5e/issues)
- **Email:** legal@nexusverge.com (if applicable)

---

## 🔗 External Resources

### SRD 5.2.1
- **Official PDF:** https://www.dndbeyond.com/attachments/39j2li89/SRD_CC_v5.2.pdf
- **CC BY 4.0 License:** https://creativecommons.org/licenses/by/4.0/legalcode

### Kenney.nl Assets
- **Website:** https://www.kenney.nl/
- **Asset Library:** https://kenney.nl/assets
- **CC0 License:** https://creativecommons.org/publicdomain/zero/1.0/

### License References
- **MIT License:** https://opensource.org/licenses/MIT
- **Apache 2.0:** https://www.apache.org/licenses/LICENSE-2.0
- **ISC License:** https://opensource.org/licenses/ISC
- **BSD Licenses:** https://opensource.org/licenses/BSD-2-Clause

---

**Last Updated:** 2026-01-14
**Maintained by:** Nexus Verge Contributors
