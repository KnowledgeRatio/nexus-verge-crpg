# Third-Party Software Notices and Licenses

This document contains the required notices and licenses for third-party software components used in **Nexus Verge**.

---

## Overview

Nexus Verge uses the following categories of third-party software:
- **Development Dependencies:** Tools used for code quality (ESLint)
- **Runtime Dependencies:** None (game runs 100% client-side with vanilla JavaScript)
- **Third-Party Assets:** Sound effects (see [ASSET_ATTRIBUTIONS.md](ASSET_ATTRIBUTIONS.md))

---

## Development Dependencies

These dependencies are used only during development and are not distributed with the game:

### ESLint (v9.39.2)
- **License:** MIT License
- **Copyright:** OpenJS Foundation and other contributors
- **Repository:** https://github.com/eslint/eslint
- **Purpose:** JavaScript linting and code quality

**MIT License:**
```
Copyright OpenJS Foundation and other contributors, <www.openjsf.org>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

## ESLint Transitive Dependencies

ESLint includes numerous transitive dependencies, all under permissive open-source licenses:

| Package | Version | License | Copyright |
|---------|---------|---------|-----------|
| @eslint/config-array | 0.20.0 | Apache-2.0 | OpenJS Foundation |
| @eslint/core | 0.12.0 | Apache-2.0 | OpenJS Foundation |
| @eslint/eslintrc | 3.2.0 | MIT | OpenJS Foundation |
| @eslint/js | 9.39.2 | MIT | OpenJS Foundation |
| @eslint/object-schema | 2.1.6 | BSD-3-Clause | Nicholas C. Zakas |
| @eslint/plugin-kit | 0.2.6 | Apache-2.0 | OpenJS Foundation |
| @eslint-community/eslint-utils | 4.4.2 | MIT | Toru Nagashima |
| @eslint-community/regexpp | 4.12.1 | MIT | Toru Nagashima |
| @humanfs/core | 0.20.0 | Apache-2.0 | Nicholas C. Zakas |
| @humanfs/node | 0.20.0 | Apache-2.0 | Nicholas C. Zakas |
| @humanwhocodes/module-importer | 1.0.1 | Apache-2.0 | Nicholas C. Zakas |
| @humanwhocodes/retry | 0.4.2 | Apache-2.0 | Nicholas C. Zakas |
| @types/estree | 1.0.6 | MIT | Microsoft Corporation |
| @types/json-schema | 7.0.15 | MIT | Microsoft Corporation |
| acorn | 8.14.0 | MIT | Various authors |
| acorn-jsx | 5.3.2 | MIT | Various authors |
| ajv | 6.12.6 | MIT | Evgeny Poberezkin |
| ansi-styles | 4.3.0 | MIT | Sindre Sorhus |
| argparse | 2.0.1 | Python-2.0 | Various authors |
| balanced-match | 1.0.2 | MIT | Julian Gruber |
| brace-expansion | 1.1.11 | MIT | Julian Gruber |
| callsites | 3.1.0 | MIT | Sindre Sorhus |
| chalk | 4.1.2 | MIT | Sindre Sorhus |
| color-convert | 2.0.1 | MIT | Heather Arthur |
| color-name | 1.1.4 | MIT | DY |
| concat-map | 0.0.1 | MIT | James Halliday |
| cross-spawn | 7.0.6 | MIT | André Cruz |
| debug | 4.4.0 | MIT | Various authors |
| deep-is | 0.1.4 | MIT | Thorsten Lorenz |
| escape-string-regexp | 4.0.0 | MIT | Sindre Sorhus |
| eslint-scope | 8.2.0 | BSD-2-Clause | Yusuke Suzuki |
| eslint-visitor-keys | 4.2.0 | Apache-2.0 | Toru Nagashima |
| espree | 10.3.0 | BSD-2-Clause | Nicholas C. Zakas |
| esrecurse | 4.3.0 | BSD-2-Clause | Yusuke Suzuki |
| estraverse | 5.3.0 | BSD-2-Clause | Yusuke Suzuki |
| esutils | 2.0.3 | BSD-2-Clause | Yusuke Suzuki |
| fast-deep-equal | 3.1.3 | MIT | Evgeny Poberezkin |
| fast-json-stable-stringify | 2.1.0 | MIT | James Halliday |
| fast-levenshtein | 2.0.6 | MIT | Ramesh Nair |
| file-entry-cache | 8.0.0 | MIT | Roy Riojas |
| find-up | 5.0.0 | MIT | Sindre Sorhus |
| flat-cache | 4.0.1 | MIT | Roy Riojas |
| flatted | 3.3.2 | ISC | Andrea Giammarchi |
| glob-parent | 6.0.2 | ISC | Gulp Team |
| globals | 15.14.0 | MIT | Sindre Sorhus |
| has-flag | 4.0.0 | MIT | Sindre Sorhus |
| ignore | 5.3.2 | MIT | Kael Zhang |
| imurmurhash | 0.1.4 | MIT | Jens Taylor |
| import-fresh | 3.3.0 | MIT | Sindre Sorhus |
| is-extglob | 2.1.1 | MIT | Jon Schlinkert |
| is-glob | 4.0.3 | MIT | Jon Schlinkert |
| isexe | 2.0.0 | ISC | Isaac Z. Schlueter |
| js-yaml | 4.1.0 | MIT | Vladimir Zapparov |
| json-buffer | 3.0.1 | MIT | Dominic Tarr |
| json-schema-traverse | 0.4.1 | MIT | Evgeny Poberezkin |
| json-stable-stringify-without-jsonify | 1.0.1 | MIT | James Halliday |
| keyv | 4.5.4 | MIT | Luke Childs |
| levn | 0.4.1 | MIT | George Zahariev |
| locate-path | 6.0.0 | MIT | Sindre Sorhus |
| lodash.merge | 4.6.2 | MIT | John-David Dalton |
| minimatch | 3.1.2 | ISC | Isaac Z. Schlueter |
| ms | 2.1.3 | MIT | Guillermo Rauch |
| natural-compare | 1.4.0 | MIT | Lauri Rooden |
| optionator | 0.9.4 | MIT | George Zahariev |
| p-limit | 3.1.0 | MIT | Sindre Sorhus |
| p-locate | 5.0.0 | MIT | Sindre Sorhus |
| parent-module | 1.0.1 | MIT | Sindre Sorhus |
| path-exists | 4.0.0 | MIT | Sindre Sorhus |
| path-key | 3.1.1 | MIT | Sindre Sorhus |
| prelude-ls | 1.2.1 | MIT | George Zahariev |
| punycode | 2.3.1 | MIT | Mathias Bynens |
| resolve-from | 4.0.0 | MIT | Sindre Sorhus |
| shebang-command | 2.0.0 | MIT | Kevin Mårtensson |
| shebang-regex | 3.0.0 | MIT | Sindre Sorhus |
| strip-json-comments | 3.1.1 | MIT | Sindre Sorhus |
| supports-color | 7.2.0 | MIT | Sindre Sorhus |
| type-check | 0.4.0 | MIT | George Zahariev |
| uri-js | 4.4.1 | BSD-2-Clause | Gary Court |
| which | 2.0.2 | ISC | Isaac Z. Schlueter |
| word-wrap | 1.2.5 | MIT | Jon Schlinkert |
| yocto-queue | 0.1.0 | MIT | Sindre Sorhus |

---

## License Texts

### MIT License (Most Common)
The MIT License is used by the majority of dependencies. Full text:
```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Apache License 2.0
Full text: https://www.apache.org/licenses/LICENSE-2.0.txt

### BSD-2-Clause License
```
Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
```

### BSD-3-Clause License
Full text: https://opensource.org/licenses/BSD-3-Clause

### ISC License
```
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

---

## Runtime Dependencies

**Nexus Verge has ZERO runtime dependencies.** The game is built with:
- **Vanilla JavaScript (ES6 modules)** - No frameworks or libraries
- **HTML5 Canvas API** - Native browser API
- **LocalStorage API** - Native browser API
- **Web Audio API** - Native browser API

All game code is original or uses standard web APIs, resulting in:
- ✅ No bundling required
- ✅ No third-party runtime licenses to manage
- ✅ Maximum performance and minimal bundle size
- ✅ No supply chain security concerns

---

## Automated SBOM

A machine-readable Software Bill of Materials (SBOM) is available in:
- **Full dependency tree:** [sbom/npm-dependencies.json](sbom/npm-dependencies.json)
- **Production only:** [sbom/npm-production.json](sbom/npm-production.json)

---

## Updating This Document

This document is generated by `scripts/generate_legal_artifacts.js` and should be regenerated whenever dependencies change:

```bash
npm run legal:generate
```

---

**Last Updated:** 2026-01-14
**Generated From:** package-lock.json
