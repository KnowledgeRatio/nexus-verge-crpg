"""Convert the CC BY-SA 3.0 Wildfire Games lion for motion inspection.

The converted asset remains CC BY-SA 3.0; see sources/0ad-lion/PROVENANCE.md.
Run Blender with --factory-startup --disable-autoexec --background --python.
"""
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'tools/combat-art/sources/0ad-lion'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 24
bpy.ops.wm.collada_import(filepath=str(SOURCE / 'animal_lion.dae'))
originals = list(bpy.context.scene.objects)
rig = next(obj for obj in originals if obj.type == 'ARMATURE')
rig.animation_data_create()
for path in sorted(SOURCE.glob('lion_*.dae')):
    before = set(bpy.data.objects)
    bpy.ops.wm.collada_import(filepath=str(path))
    imported = set(bpy.data.objects) - before
    animated = next(obj for obj in imported if obj.type == 'ARMATURE')
    action = animated.animation_data.action
    action.name = path.stem
    action.use_fake_user = True
    track = rig.animation_data.nla_tracks.new()
    track.name = path.stem
    strip = track.strips.new(path.stem, 0, action)
    if hasattr(strip, 'action_slot') and len(action.slots):
        strip.action_slot = action.slots[0]
    track.mute = True
    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
for obj in originals:
    if obj.type != 'MESH':
        continue
    for material in obj.data.materials:
        material.use_nodes = True
        shader = material.node_tree.nodes.get('Principled BSDF')
        image = material.node_tree.nodes.new('ShaderNodeTexImage')
        image.image = bpy.data.images.load(str(SOURCE / 'animal_lion.png'), check_existing=True)
        material.node_tree.links.new(image.outputs['Color'], shader.inputs['Base Color'])
        shader.inputs['Roughness'].default_value = .9
        shader.inputs['Alpha'].default_value = 1
parent = bpy.data.objects.new('LionInspectionScale', None)
bpy.context.collection.objects.link(parent)
parent.scale = (62, 62, 62)
for obj in originals:
    if obj.parent is None:
        obj.parent = parent
bpy.context.scene.frame_set(0)
bpy.ops.object.select_all(action='DESELECT')
for obj in originals + [parent]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'tools/combat-art/lion-candidate.glb'),
    export_format='GLB', use_selection=True, export_animations=True,
    export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_yup=True)
print('EXPORTED_LION', [(track.name, len(track.strips)) for track in rig.animation_data.nla_tracks], flush=True)
