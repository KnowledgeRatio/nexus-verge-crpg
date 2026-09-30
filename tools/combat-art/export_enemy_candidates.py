"""Export the unmodified CC0 creature rigs for offline motion inspection.

Run with Blender --background --factory-startup --python this_file.
Candidate exports are not registered as runtime combat assets.
"""
import base64
import argparse
import json
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--pack', default='quaternius-easy-enemies')
parser.add_argument('--models', nargs='+', default=['Rat', 'Spider'])
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
SOURCE = ROOT / 'tools/combat-art/sources' / args.pack

for name in args.models:
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE / (name + '.blend')),
                           load_ui=False, use_scripts=False)
    # Older Blender materials predate glTF's node-based PBR export.
    for material in bpy.data.materials:
        color = tuple(material.diffuse_color)
        material.use_nodes = True
        shader = material.node_tree.nodes.get('Principled BSDF')
        if shader is None:
            shader = material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
            output = next((node for node in material.node_tree.nodes if node.type == 'OUTPUT_MATERIAL'), None)
            if output is None:
                output = material.node_tree.nodes.new('ShaderNodeOutputMaterial')
            material.node_tree.links.new(shader.outputs['BSDF'], output.inputs['Surface'])
        shader.inputs['Base Color'].default_value = color
        shader.inputs['Roughness'].default_value = .85
    target = SOURCE / (name + '-candidate.gltf')
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLTF_SEPARATE',
                             export_animations=True, export_animation_mode='ACTIONS',
                             export_force_sampling=True, export_yup=True)
    data = json.loads(target.read_text())
    for buffer in data.get('buffers', []):
        binary = SOURCE / buffer['uri']
        buffer['uri'] = 'data:application/octet-stream;base64,' + base64.b64encode(binary.read_bytes()).decode()
        binary.unlink()
    target.write_text(json.dumps(data, separators=(',', ':')))
    print('EXPORTED', name, [clip['name'] for clip in data.get('animations', [])])
