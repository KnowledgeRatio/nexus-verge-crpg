const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/dungeonRooms.json', 'utf8'));
console.log('Total rooms:', data.rooms.length);
const withShape = data.rooms.filter(r => r.shape);
console.log('Rooms with shape:', withShape.length);
const withoutShape = data.rooms.filter(r => r.shape === undefined);
console.log('Rooms WITHOUT shape:', withoutShape.length);
if (withoutShape.length > 0) {
  console.log('Missing:', withoutShape.map(r => r.id));
}
const shapes = {};
withShape.forEach(r => { shapes[r.shape] = (shapes[r.shape] || 0) + 1; });
console.log('Shape distribution:', JSON.stringify(shapes, null, 2));

// Verify field order for a sample room
const sampleRoom = data.rooms[0];
const keys = Object.keys(sampleRoom);
const heightIdx = keys.indexOf('height');
const shapeIdx = keys.indexOf('shape');
const maxConnIdx = keys.indexOf('maxConnections');
console.log('\nField order check (first room):');
console.log('  height index:', heightIdx);
console.log('  shape index:', shapeIdx);
console.log('  maxConnections index:', maxConnIdx);
console.log('  shape is after height:', shapeIdx === heightIdx + 1);
console.log('  shape is before maxConnections:', shapeIdx === maxConnIdx - 1);
