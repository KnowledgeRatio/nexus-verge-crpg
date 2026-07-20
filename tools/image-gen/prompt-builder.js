export function buildPrompt(styleGuide, assetType, asset) {
  const sections = parseStyleGuide(styleGuide);
  const baseStyle = sections['Art Style'] || '';
  const terrainStyle = sections['Terrain Art Style'] || '';
  const negativeClause = sections['Negative Prompts']
    ? `MUST NOT INCLUDE: ${sections['Negative Prompts'].replace(/\n/g, ', ')}.`
    : '';

  switch (assetType) {
    case 'terrain': {
      const guideName = asset.visual?.mode === 'continuousAtlas' ? 'Terrain Atlases' : 'Terrain Tiles';
      return terrainPrompt(asset, terrainStyle, sections[guideName] || '', negativeClause);
    }
    case 'monsters':  return monsterPrompt(asset, baseStyle, sections['Monster Art'] || '', negativeClause);
    case 'items':     return itemPrompt(asset, baseStyle, sections['Item Icons'] || '', negativeClause);
    case 'portraits': return portraitPrompt(asset, baseStyle, sections['Character Portraits'] || '', negativeClause);
    default:          throw new Error(`Unknown asset type: ${assetType}`);
  }
}

export function buildNegativePrompt(styleGuide, assetType) {
  const sections = parseStyleGuide(styleGuide);
  const base = sections['Negative Prompts']
    ? sections['Negative Prompts'].replace(/\n/g, ', ')
    : '';
  if (assetType === 'terrain') {
    return `${TERRAIN_HARD_NEGATIVE}, ${base}`;
  }
  return base;
}

const TERRAIN_HARD_OPEN = 'BORDERLESS CONTINUOUS TERRAIN ART. Fills the entire canvas edge-to-edge. No border, margin, padding, vignette, or fade. Texture continues to every pixel of every edge. Right edge continues into left. Top continues into bottom.';
const TERRAIN_HARD_NEGATIVE = 'border, bezel, frame, vignette, margin, padding, dark edge, light edge, edge fade, white edge, black edge, scene, landscape, horizon, focal point, subject, character, creature, sky';

function terrainPrompt(terrain, baseStyle, typeGuide, negativeClause) {
  const tilesPerSide = terrain.visual?.atlasTilesPerSide;
  const motifRange = terrain.visual?.motifsPerTile;
  const atlasScale = tilesPerSide
    ? `This square atlas represents ${tilesPerSide} by ${tilesPerSide} world tiles. Every notional world-tile region must read as a continuation of its neighbours.`
    : '';
  const motifScale = motifRange?.min != null && motifRange?.max != null
    ? `Use ${motifRange.min} to ${motifRange.max} broad terrain motifs per notional world tile. Avoid dense micro-detail that disappears when reduced to 16 pixels.`
    : '';
  const parts = [
    TERRAIN_HARD_OPEN,
    baseStyle,
    `${terrain.name} terrain.`,
    terrain.imageDescription || terrain.description,
    atlasScale,
    motifScale,
    typeGuide,
    `DO NOT INCLUDE: ${TERRAIN_HARD_NEGATIVE}.`,
  ];
  return parts.filter(Boolean).join(' ').trim();
}

const SAFE_TYPE = {
  beast:       'creature',
  undead:      'spectral creature',
  fiend:       'otherworldly creature',
  aberration:  'alien creature',
  monstrosity: 'monstrous creature',
};

function monsterPrompt(monster, baseStyle, typeGuide, negativeClause) {
  const safeType = SAFE_TYPE[monster.type] || monster.type;
  const sizeType = [monster.size, safeType].filter(Boolean).join(' ');
  const voidbornNote = monster.type === 'voidborn'
    ? 'Render as absence given shape: geometry that should not cohere, dissolving into the background, no readable face, no expression, no intent.'
    : '';
  const parts = [
    baseStyle,
    `Fantasy game illustration of a ${monster.imagePromptName || monster.name}${sizeType ? `, a ${sizeType}` : ''}.`,
    monster.imageDescription || monster.description,
    voidbornNote,
    typeGuide,
  ];
  return parts.filter(Boolean).join(' ').trim();
}

function itemPrompt(item, baseStyle, typeGuide, negativeClause) {
  const category = [item.category, item.weaponType || item.type].filter(Boolean).join(' ');
  const rarityNote = item.rarity ? `Rarity: ${item.rarity}. ${rarityVisual(item.rarity)}` : '';
  const damageNote = item.damageType ? `Damage type: ${item.damageType}.` : '';
  const propsNote = item.properties?.length ? `Properties: ${item.properties.join(', ')}.` : '';
  const parts = [
    baseStyle,
    `Game item icon: ${item.name}${category ? ` (${category})` : ''}.`,
    item.description,
    rarityNote,
    damageNote,
    propsNote,
    typeGuide,
  ];
  return parts.filter(Boolean).join(' ').trim();
}

function rarityVisual(rarity) {
  const map = {
    common:    'Raw iron and worn leather tones. No glow.',
    uncommon:  'Faint blue-silver edge sheen.',
    rare:      'Cold violet edge-light.',
    veryRare:  'Deep violet aura, subtle distortion.',
    legendary: 'Deep amber aura with visible heat distortion.',
  };
  return map[rarity] || '';
}

function portraitPrompt(race, baseStyle, typeGuide, negativeClause) {
  const etymologyNote = race.etymology ? `Cultural identity: ${race.etymology}.` : '';
  const traitNote = race.traits?.[0] ? `Defining racial trait: ${race.traits[0].name}.` : '';
  const parts = [
    baseStyle,
    `Character portrait of a ${race.name} adventurer.`,
    race.description,
    etymologyNote,
    traitNote,
    typeGuide,
  ];
  return parts.filter(Boolean).join(' ').trim();
}

function parseStyleGuide(md) {
  const sections = {};
  let current = null;
  const lines = [];

  for (const line of md.split('\n')) {
    const match = line.match(/^## (.+)/);
    if (match) {
      if (current !== null) sections[current] = lines.splice(0).join('\n').trim();
      current = match[1];
    } else if (current !== null) {
      lines.push(line);
    }
  }
  if (current !== null) sections[current] = lines.join('\n').trim();
  return sections;
}
