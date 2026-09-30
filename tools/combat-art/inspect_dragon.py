"""Inspect the retained source without running embedded scripts or saving changes."""
import json
from pathlib import Path
import bpy

root = Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(root / 'tools/combat-art/sources/cethiel-dragon/dragon-2_80.blend'),
                         load_ui=False, use_scripts=False)
print('DRAGON_INSPECTION', json.dumps({
    'objects': [{'name': o.name, 'type': o.type, 'dimensions': list(o.dimensions),
                 'bones': [b.name for b in o.data.bones] if o.type == 'ARMATURE' else [],
                 'materials': [s.material.name if s.material else None for s in o.material_slots]}
                for o in bpy.data.objects],
    'actions': [{'name': a.name, 'range': list(a.frame_range)} for a in bpy.data.actions],
    'images': [{'name': i.name, 'path': i.filepath, 'packed': bool(i.packed_file)} for i in bpy.data.images],
    'fps': bpy.context.scene.render.fps,
}, indent=2))
