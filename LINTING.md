# JavaScript Linting Guide

This project uses ESLint to enforce code quality and consistency across all JavaScript files.

## Setup

ESLint is already configured! If you need to reinstall dependencies:

```bash
npm install
```

## Running Linting

### Lint all source files
```bash
npm run lint
```

### Lint and auto-fix issues
```bash
npm run lint:fix
```

### Lint entire project (including root files)
```bash
npm run lint:all
```

### Generate linting report
```bash
npm run lint:report
```

## VSCode Integration

The project includes VSCode settings (`.vscode/settings.json`) that:
- **Auto-format on save** using ESLint
- **Show inline errors** in the editor
- **Auto-fix** fixable issues when you save

### Required VSCode Extension
Install the ESLint extension: [dbaeumer.vscode-eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

## Linting Rules

### Code Style
- **Indentation:** 4 spaces
- **Quotes:** Single quotes (with escape exceptions)
- **Semicolons:** Required
- **Line endings:** Windows (CRLF)
- **Max line length:** 120 characters (warnings only)

### ES6+ Rules
- **No `var`:** Use `let` or `const`
- **Prefer `const`:** Use `const` for variables that don't change
- **Arrow functions:** Prefer arrow functions for callbacks
- **Template literals:** Prefer template strings over concatenation

### Code Quality
- **Equality:** Use `===` and `!==` (strict equality)
- **Curly braces:** Required for all control structures
- **Camelcase:** Enforce camelCase naming (properties exempt)
- **Magic numbers:** Warn about unexplained numbers (0, 1, 2, 10, 100 are allowed)
- **Unused variables:** Warn (prefix with `_` to ignore)

### Project-Specific
- **Global variables:** `game`, `gameState`, `questManager`, `audioManager` are allowed
- **Console:** `console.log()` is allowed (useful for debugging)
- **Debugger:** `debugger` statements show warnings

### File Overrides
- **simplexNoise.js:** Magic numbers allowed (mathematical algorithm)

## Common Issues & Fixes

### Unused Variables
If a parameter is intentionally unused, prefix with underscore:
```javascript
// ❌ Will warn
function foo(unusedParam) { }

// ✅ Won't warn
function foo(_unusedParam) { }
```

### Magic Numbers
Extract constants for unexplained numbers:
```javascript
// ❌ Will warn
if (value > 42) { }

// ✅ Won't warn
const MAX_VALUE = 42;
if (value > MAX_VALUE) { }
```

### Line Length
Break long lines into multiple lines:
```javascript
// ❌ Too long
const message = `This is a very long string that exceeds the maximum line length and should be broken into multiple lines`;

// ✅ Properly formatted
const message = `This is a very long string that exceeds ` +
  `the maximum line length and should be broken into multiple lines`;
```

## Disabling Rules (When Necessary)

### For a single line
```javascript
// eslint-disable-next-line no-console
console.log('This is allowed');
```

### For a block
```javascript
/* eslint-disable no-console */
console.log('Block 1');
console.log('Block 2');
/* eslint-enable no-console */
```

### For entire file
```javascript
/* eslint-disable no-magic-numbers */
// File content with magic numbers allowed
```

## Pre-Commit Hook (Future Enhancement)

Consider adding Husky + lint-staged to automatically lint files before committing:

```bash
npm install --save-dev husky lint-staged
```

Then add to `package.json`:
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.js": "eslint --fix"
  }
}
```

## Continuous Integration (Future Enhancement)

Add to CI pipeline (GitHub Actions, etc.):

```yaml
- name: Run ESLint
  run: npm run lint
```

## Configuration Files

- **`.eslintrc.json`** - Main ESLint configuration
- **`.eslintignore`** - Files/folders to ignore
- **`.vscode/settings.json`** - VSCode integration settings
- **`package.json`** - NPM scripts for linting

## Resources

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [ESLint Rules Reference](https://eslint.org/docs/latest/rules/)
- [VSCode ESLint Extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
