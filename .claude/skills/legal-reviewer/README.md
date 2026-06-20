# Legal Reviewer Skill & Subagent

## What It Does

The Legal Reviewer is your IP compliance expert for open-sourcing Nexus Verge. It ensures:
- ✅ SRD 5.2 compliance (D&D rules usage)
- ✅ No trademark violations (D&D, WotC)
- ✅ Proper open-source licensing (MIT, CC BY 4.0)
- ✅ Asset attribution (audio, graphics, code)
- ✅ Commercial use readiness

## How to Use

### As a Skill (In-Conversation)

Load the legal-reviewer persona into your current conversation:

```
/legal-reviewer

[Then ask questions like:]
- "Can I use the term 'Beholder' in my game?"
- "Is this monster name SRD-compliant?"
- "Review my README for trademark violations"
- "Check if my audio attribution is correct"
```

**When to use:** Quick questions, interactive review, educational guidance

### As a Subagent (Autonomous Worker)

Spawn an independent legal audit agent:

```
Use the legal-reviewer subagent to perform a complete compliance audit before open-sourcing
```

The agent will autonomously:
1. Read all legal documentation
2. Audit monsters/spells/classes for SRD compliance
3. Search codebase for D&D trademarks
4. Verify attribution requirements
5. Check asset licenses
6. Generate comprehensive compliance report

**When to use:** Pre-launch audits, comprehensive reviews, batch compliance checks

## What It Knows

### D&D IP Law
- **SRD 5.2 (CC BY 4.0):** Rules, mechanics, SRD monsters/spells ✅
- **Product Identity:** D&D trademark, campaign settings, non-SRD monsters ❌
- **Trademarks:** "Dungeons & Dragons", "D&D", "Wizards of the Coast" ❌

### Open Source Licensing
- **Permissive:** MIT, Apache 2.0, BSD ✅
- **Copyleft:** GPL, AGPL (avoid) ⚠️
- **Creative Commons:** CC BY, CC BY-SA, CC BY-NC variants
- **Asset Licenses:** Audio, graphics, fonts, game mechanics

### Critical Knowledge
- SRD monster/spell lists
- Product Identity vs Open Content
- License compatibility (MIT + GPL = problem)
- Commercial use restrictions
- Attribution requirements

## Example Workflows

### Pre-Launch Audit
```bash
# Spawn autonomous compliance audit
> Use the legal-reviewer subagent to audit the entire codebase for IP compliance before open-sourcing

# Agent will:
# 1. Check all monsters against SRD
# 2. Search for trademark violations
# 3. Verify attributions
# 4. Generate launch checklist
```

### Monster Compliance Check
```bash
# As skill (interactive)
> /legal-reviewer
> I want to add "Mind Flayer" to my monsters.json. Is this SRD-compliant?

# Response: ❌ NO. Mind Flayer is Product Identity. Use "Aboleth" (SRD) or create "Brain Eater" (original).
```

### Asset License Review
```bash
> Use legal-reviewer to verify all audio files have proper attribution
```

## Files It Reviews

The legal-reviewer automatically checks:
- `legal/SRD_ATTRIBUTION.md` - SRD compliance
- `legal/ASSET_ATTRIBUTIONS.md` - Third-party assets
- `legal/THIRD_PARTY_NOTICES.md` - Code libraries
- `legal/sbom/npm-dependencies.json` - Dependencies
- `data/monsters.json` - Monster names
- `data/spells.json` - Spell names
- `data/classes.json` - Class names
- `data/races.json` - Race names
- `README.md` - Public branding
- `.gitignore` - Secret protection
- `LICENSE` - Project license

## Common Questions

**Q: Can I use "D&D 5e" in my README?**
A: ⚠️ Carefully. Say "inspired by D&D 5e SRD" or "uses D&D 5e SRD rules (CC BY 4.0)" - make it clear you're using the SRD, not claiming to be D&D.

**Q: Can I sell this commercially?**
A: ✅ Yes, if all assets allow commercial use. SRD 5.2 allows it with attribution.

**Q: Are game mechanics copyrightable?**
A: ❌ No. You can use proficiency bonus, advantage/disadvantage, etc. freely.

**Q: What about "Beholder", "Mind Flayer", "Displacer Beast"?**
A: ❌ Product Identity. Use SRD alternatives or create original monsters.

## Red Flags

The legal-reviewer immediately flags:
- ❌ "D&D" or "Dungeons & Dragons" in user-facing text
- ❌ Product Identity monsters (Beholder, Mind Flayer, etc.)
- ❌ Campaign setting references (Forgotten Realms, etc.)
- ❌ Missing SRD attribution (violates CC BY 4.0)
- ❌ GPL/AGPL code (contaminates MIT project)
- ❌ CC BY-NC assets (blocks commercial use)
- ❌ Exact text from PHB/DMG/MM

## Output Format

Compliance reports include:
- **Status:** ✅ CLEAR / ⚠️ MINOR / ❌ BLOCKER
- **Issues:** File, line, risk level, fix required
- **Required Actions:** Checklist of fixes
- **Legal Opinion:** Launch readiness assessment

## Resources

Built-in knowledge includes:
- [SRD 5.2 PDF](https://www.dndbeyond.com/attachments/39j2li89/SRD_CC_v5.2.pdf)
- [CC BY 4.0 License](https://creativecommons.org/licenses/by/4.0/legalcode)
- [WotC Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy)
- Game mechanics copyright law
- MIT License requirements

## Sync with Global Skills

If you want this available across all Claude Code projects:

```bash
# Copy to global skills directory
cp -r .claude/skills/legal-reviewer ~/.claude/skills/
cp .claude/agents/legal-reviewer.md ~/.claude/agents/
```

Then restart Claude Code to load globally.
