"""Export only the CC0 dragon body/rig, with its original colour texture and actions."""
from pathlib import Path
import bpy

root = Path(__file__).resolve().parents[2]
source = root / 'tools/combat-art/sources/cethiel-dragon'
bpy.ops.wm.open_mainfile(filepath=str(source / 'dragon-2_80.blend'), load_ui=False, use_scripts=False)
for obj in list(bpy.data.objects):
    if obj.name not in {'dragon', 'Armature'}:
        bpy.data.objects.remove(obj, do_unlink=True)
body = bpy.data.objects['dragon']
material = body.material_slots[0].material
material.name = 'Dragon original painted scales'
material.use_nodes = True
material.node_tree.nodes.clear()
shader = material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
shader.inputs['Roughness'].default_value = .85
shader.inputs['Metallic'].default_value = 0
texture = material.node_tree.nodes.new('ShaderNodeTexImage')
texture.image = bpy.data.images.load(str(source / 'dragon.png'), check_existing=True)
output = material.node_tree.nodes.new('ShaderNodeOutputMaterial')
material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
material.node_tree.links.new(shader.outputs['BSDF'], output.inputs['Surface'])
bpy.context.scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=str(root / 'tools/combat-art/dragon-source.glb'),
                         export_format='GLB', export_animations=True, export_animation_mode='ACTIONS',
                         export_force_sampling=True, export_yup=True)
print('EXPORTED_DRAGON', [action.name for action in bpy.data.actions])
