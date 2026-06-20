# Linting Quick Start

## ✅ Setup Complete!

ESLint is now configured for the Nexus Verge project with rules tailored for D&D 5e game development.

## 🚀 Quick Commands

### Run linting (see all issues)
```bash
npm run lint
```

### Auto-fix most issues
```bash
npm run lint:fix
```

This will automatically fix:
- ✅ Indentation (4 spaces)
- ✅ Quote style (single quotes)
- ✅ Semicolons
- ✅ Spacing around operators
- ✅ Trailing whitespace
- ✅ Empty lines at end of file
- ✅ And many more...

### Check entire project
```bash
npm run lint:all
```

### Generate report file
```bash
npm run lint:report
```

## 📊 Current Status

After running `npm run lint`, you'll see:
- **Total issues:** ~3,168 problems
- **Auto-fixable:** ~2,841 errors + 7 warnings
- **Manual fixes needed:** ~327 issues

## 🔧 What Gets Auto-Fixed?

Running `npm run lint:fix` will automatically correct:

1. **Code Style** (2,800+ fixes)
   - Double quotes → single quotes
   - Inconsistent spacing
   - Missing semicolons
   - Trailing whitespace

2. **Code Quality** (40+ fixes)
   - `var` → `const` or `let`
   - String concatenation → template literals

## ⚠️ What Needs Manual Attention?

About 327 issues require manual review:

1. **Missing curly braces** (~50 issues)
   ```javascript
   // ❌ Before
   if (condition) return;

   // ✅ After
   if (condition) {
       return;
   }
   ```

2. **Magic numbers** (~250 warnings)
   ```javascript
   // ❌ Before
   if (distance > 42) { }

   // ✅ After
   const MAX_DISTANCE = 42;
   if (distance > MAX_DISTANCE) { }
   ```

3. **Unused variables** (~20 warnings)
   ```javascript
   // Option 1: Remove if truly unused
   // Option 2: Prefix with _ if intentionally unused
   function foo(_unusedParam) { }
   ```

## 🎯 Recommended Workflow

### Step 1: Auto-fix everything
```bash
npm run lint:fix
```

### Step 2: Check remaining issues
```bash
npm run lint > linting-report.txt
```

### Step 3: Review and fix manually
- Open `linting-report.txt`
- Address curly brace requirements
- Extract constants for magic numbers
- Remove or prefix unused variables

## 🔍 VSCode Integration

If you have the ESLint extension installed:
- ✅ **Real-time error highlighting** in the editor
- ✅ **Auto-fix on save** (configured)
- ✅ **Quick fixes** via lightbulb menu (Ctrl+.)

### Install VSCode Extension
```
ext install dbaeumer.vscode-eslint
```

## 📝 Project-Specific Rules

### Allowed Magic Numbers
These numbers don't trigger warnings:
- `0, 1, -1` (common defaults)
- `2, 10, 100` (common multipliers)
- Array indexes (always allowed)

### Disabled Rules for Special Files
- **simplexNoise.js** - Magic numbers allowed (math algorithm)
- **rng.js** - Magic numbers allowed (PRNG constants)
- **SaveManager.js** - Magic numbers allowed (timestamps)

### Global Variables
These are recognized and won't trigger "undefined" errors:
- `game`, `gameState`, `questManager`, `audioManager`
- `window`, `document`, `console`, `localStorage`
- `performance`, `process` (Node.js compatibility)

## 🎨 Code Style Summary

- **Indentation:** 4 spaces
- **Quotes:** Single quotes
- **Semicolons:** Required
- **Max line length:** 120 characters (warning)
- **Brace style:** 1TBS (one true brace style)

## 📚 Full Documentation

See [LINTING.md](./LINTING.md) for complete documentation.

## ⚡ Next Steps

1. Run `npm run lint:fix` to auto-fix 90% of issues
2. Commit the auto-fixed changes
3. Create a plan for remaining ~327 manual fixes
4. Consider running linting before each commit (husky + lint-staged)
