export function buildPrompt(styleGuide, assetType, asset) {
  const sections = parseStyleGuide(styleGuide);
  const baseStyle = sections['Art Style'] || '';
  const terrainStyle = sections['Terrain Art Style'] || '';
  const negativeClause = sections['Negative Prompts']
    ? ` Avoid: ${sections['Negative Prompts'].replace(/\n/g, ', ')}`
    : '';

  switch (assetType) {
    case 'terrain':   return terrainPrompt(asset, terrainStyle, sections['Terrain Tiles'] || '', negativeClause);
    case 'monsters':  return monsterPrompt(asset, baseStyle, sections['Monster Art'] || '', negativeClause);
    case 'items':     return itemPrompt(asset, baseStyle, sections['Item Icons'] || '', negativeClause);
    case 'portraits': return portraitPrompt(asset, baseStyle, sections['Character Portraits'] || '', negativeClause);
    default:          throw new Error(`Unknown asset type: ${assetType}`);
  }
}

function terrainPrompt(terrain, baseStyle, typeGuide, negativeClause) {
  const parts = [
    baseStyle,
    `Top-down game tile: ${terrain.name} terrain.`,
    terrain.description,
    typeGuide,
    negativeClause,
  ];
  return parts.filter(Boolean).join(' ').trim();
}

function monsterPrompt(monster, baseStyle, typeGuide, negativeClause) {
  const sizeType = [monster.size, monster.type].filter(Boolean).join(' ');
  const voidbornNote = monster.type === 'voidborn'
    ? 'Render as absence given shape: geometry that should not cohere, dissolving into the background, no readable face, no expression, no intent.'
    : '';
  const parts = [
    baseStyle,
    `Fantasy game illustration of a ${monster.name}${sizeType ? `, a ${sizeType}` : ''}.`,
    monster.description,
    voidbornNote,
    typeGuide,
    negativeClause,
  ];
  return parts.filter(Boolean).join(' ').trim();
}

function itemPrompt(item, baseStyle, typeGuide, negativeClause) {
  const category = [item.category, item.type].filter(Boolean).join(' ');
  const parts = [
    baseStyle,
    `Game item icon: ${item.name}${category ? ` (${category})` : ''}.`,
    item.description,
    typeGuide,
    negativeClause,
  ];
  return parts.filter(Boolean).join(' ').trim();
}

function portraitPrompt(race, baseStyle, typeGuide, negativeClause) {
  const parts = [
    baseStyle,
    `Character portrait of a ${race.name} adventurer.`,
    race.description,
    typeGuide,
    negativeClause,
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
