"""Original Blender-authored study assets. Run with Blender 4.5 --background --python this_file.

Authoring coordinates use metres, Y up, +Z forward; P converts to Blender Z up.
The humanoid uses an original weighted skeleton; motion is supplied by the runtime.
"""
import math
import json
import random
import sys
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'data/graphics/combat'
OUT.mkdir(parents=True, exist_ok=True)
random.seed(23923)
bpy.context.preferences.filepaths.save_version = 0


def P(p):
    return Vector((p[0], -p[2], p[1]))


def reset():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for datablocks in [bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.images]:
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material(name, color, roughness=0.85, metal=0, grain=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metal
    if grain:
        size = 256
        rng = np.random.default_rng(sum(map(ord, name)))
        yy, xx = np.mgrid[:size, :size]
        broad = np.sin(xx / 23) * np.cos(yy / 31) * 0.055
        weave = (np.sin(xx * math.pi / 2) + np.sin(yy * math.pi / 2)) * 0.018
        noise = broad + weave + rng.normal(0, 0.045, (size, size))
        pixels = np.ones((size, size, 4), dtype=np.float32)
        pixels[:, :, :3] = np.clip(np.array(color)[None, None, :] * (1 + noise[:, :, None]), 0, 1)
        image = bpy.data.images.new(name + '_surface', width=size, height=size)
        image.pixels.foreach_set(pixels.ravel())
        image.pack()
        node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = image
        mat.node_tree.links.new(node.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def attach(obj, parent):
    if parent:
        bpy.context.view_layer.update()
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj


def finish(obj, name, mat, parent=None, smooth=True):
    obj.name = name
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = smooth
    return attach(obj, parent)


def pivot(name, position, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = P(position)
    obj.empty_display_size = 0.08
    return attach(obj, parent)


def sphere(name, position, scale, mat, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=P(position))
    obj = bpy.context.object
    obj.scale = (scale[0], scale[2], scale[1])
    return finish(obj, name, mat, parent)


def box(name, position, scale, mat, parent=None, bevel=0.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=P(position))
    obj = bpy.context.object
    obj.scale = (scale[0], scale[2], scale[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Soft worn edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(obj, name, mat, parent, False)


def tube(name, points, radius, mat, parent=None):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    curve.resolution_u = 3
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for v, point in zip(spline.points, points):
        v.co = (*P(point), 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return finish(obj, name, mat, parent)


def loft(name, rings, mat, parent=None, start=0, end=math.tau, folds=0):
    # Ring: centre XYZ, half-width, half-depth. Open panels share the same authoring path.
    steps = 24
    vertices = []
    faces = []
    for level, (x, y, z, rx, rz) in enumerate(rings):
        for j in range(steps + 1):
            angle = start + (end - start) * j / steps
            fold = folds * math.sin(angle * 9 + level * 0.3)
            vertices.append(P((x + math.sin(angle) * (rx + fold), y,
                               z + math.cos(angle) * (rz + fold))))
    for level in range(len(rings) - 1):
        for j in range(steps):
            a = level * (steps + 1) + j
            faces.append((a, a + 1, a + steps + 2, a + steps + 1))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name='UVMap')
    for face in mesh.polygons:
        for index in face.loop_indices:
            vertex = mesh.loops[index].vertex_index
            uv.data[index].uv = (vertex % (steps + 1) / steps, vertex // (steps + 1) / (len(rings) - 1))
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mat.use_backface_culling = False
    return finish(obj, name, mat, parent)


def export(name):
    # Consolidate meshes within each articulated node and material, retaining pivots.
    groups = {}
    for obj in list(bpy.context.scene.objects):
        if obj.type == 'MESH' and obj.data.materials:
            groups.setdefault((obj.parent, obj.data.materials[0]), []).append(obj)
    for objects in groups.values():
        if len(objects) < 2:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / (name + '.blend')))
    bpy.ops.export_scene.gltf(filepath=str(OUT / (name + '.glb')), export_format='GLB',
                              export_yup=True, export_animations=False, export_extras=True)
    print('EXPORTED', name)


def static_box(name, position, scale, mat, parent, bevel=.015):
    # Build repeated environment pieces without an operator/depsgraph update per stone.
    mesh = bpy.data.meshes.new(name)
    geometry = bmesh.new()
    geometry.loops.layers.uv.new('UVMap')
    bmesh.ops.create_cube(geometry, size=1, calc_uvs=True)
    for vertex in geometry.verts:
        vertex.co.x *= scale[0]
        vertex.co.y *= scale[2]
        vertex.co.z *= scale[1]
    if bevel:
        bmesh.ops.bevel(geometry, geom=list(geometry.edges), offset=bevel,
                       segments=2, affect='EDGES', clamp_overlap=True)
    geometry.to_mesh(mesh)
    geometry.free()
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    # Authoring groups have identity rotation/scale. Store local translation
    # directly so this path never needs evaluated world matrices.
    origin = Vector((0, 0, 0))
    ancestor = parent
    while ancestor:
        origin += ancestor.location
        ancestor = ancestor.parent
    obj.parent = parent
    obj.location = P(position) - origin
    return obj


def masonry_arch(name, x, z, spring, radius, thickness, depth, mat, parent):
    group = pivot(name, (x, 0, z), parent)
    for side in [-1, 1]:
        for row in range(4):
            static_box(name + ' pier', (x + side * (radius + thickness / 2), spring * (row + .5) / 4, z),
                (thickness, spring / 4 - .018, depth), mat, group, .025)
    for index in range(13):
        angles = [(index + .025) * math.pi / 13, (index + .975) * math.pi / 13]
        vertices = [P((x + r * math.cos(a), spring + r * math.sin(a), z + d))
                    for d in [-depth / 2, depth / 2]
                    for r in [radius, radius + thickness] for a in angles]
        mesh = bpy.data.meshes.new(name + ' voussoir')
        mesh.from_pydata(vertices, [], [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1),
                                      (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)])
        mesh.update()
        obj = bpy.data.objects.new(name + ' voussoir', mesh)
        bpy.context.collection.objects.link(obj)
        finish(obj, obj.name, mat, group, False)
    return group


def build_dungeon():
    reset()
    random.seed(23924)
    variant = json.loads((ROOT / 'data/combatScene.json').read_text())['sceneVariants']['dungeon']
    rear = variant['composition']['rearZ']
    stone = material('Dungeon weathered slate', (.25, .28, .29), grain=True)
    repair = material('Dungeon pale repair stone', (.40, .39, .33), grain=True)
    dark = material('Dungeon deep joints', (.075, .085, .085))
    wood = material('Dungeon worn oak', (.20, .135, .08), grain=True)
    iron = material('Dungeon dull iron', (.15, .16, .16), .58, .55)
    root = pivot('Dungeon', (0, 0, 0))
    floor = pivot('Dungeon floor', (0, 0, 0), root)
    surface = next(prop for prop in variant['props'] if prop['material'] == 'flagstone')
    image_floor('Detailed dungeon paving', variant['materialTextures']['flagstone'], surface['size'], floor)
    masonry_arch('Passage arch', 0, rear - .5, 1.7, 1.65, .4, .9, repair, root)
    for side in [-1, 1]:
        wall = pivot('Left wall' if side < 0 else 'Right wall', (side * 4.8, 0, rear - .65), root)
        static_box('Recessed mortar', (side * 4.8, 1.8, rear - .72), (5.5, 3.6, .68), dark, wall, 0)
        for row in range(8):
            for col in range(6):
                x = side * (2.12 + (col + .5) * .87)
                # The repair patch is local and intentional, rather than random multicoloured stone.
                mat = repair if side > 0 and col > 3 and row < 3 else stone
                static_box('Wall course', (x, .22 + row * .45, rear - .6),
                    (.84, .426, .76 + random.uniform(-.025, .025)), mat, wall, .035)
        support = pivot('Left buttress' if side < 0 else 'Right buttress', (side * 5.65, 0, rear), root)
        for row in range(7):
            static_box('Buttress block', (side * 5.65, .235 + row * .47, rear - .15),
                (.67, .447, 1.15), repair, support, .03)
        static_box('Buttress cap', (side * 5.65, 3.38, rear - .15), (.9, .25, 1.32), repair, support, .035)
        passage = pivot('Left passage return' if side < 0 else 'Right passage return',
                        (side * 1.95, 0, rear - 1.8), root)
        static_box('Passage return', (side * 1.95, 1.6, rear - 1.8), (.45, 3.2, 2.4), stone, passage, .02)
    static_box('Passage shadow', (0, 1.7, rear - 3.1), (3.5, 3.4, .12), dark, root, 0)
    brace = pivot('Timber repair', (4.6, 0, rear), root)
    for x in [4.15, 5.0]:
        static_box('Repair upright', (x, 1.25, rear + .05), (.14, 2.5, .17), wood, brace, .012)
    static_box('Repair crosspiece', (4.58, 2.5, rear + .05), (1.2, .17, .22), wood, brace, .012)
    for height in [.4, 2.05]:
        for x in [4.15, 5.0]:
            static_box('Repair strap', (x, height, rear + .15), (.2, .06, .04), iron, brace, .005)
    rubble = pivot('Wall foot rubble', (0, 0, rear), root)
    for index in range(20):
        x = random.choice([-4.3, 6.3]) + random.uniform(-.65, .65)
        rock = static_box('Fallen masonry', (x, .07, rear + random.uniform(.15, .45)),
                   (random.uniform(.18, .4), .14, random.uniform(.18, .3)), stone, rubble, .03)
        rock.rotation_euler.z = random.uniform(-.9, .9)
    export('dungeon-v1')


def timber_frontage(name, x, rear, width, height, plaster, stone, wood, roof_mat, dark, parent):
    group = pivot(name, (x, 0, rear), parent)
    static_box('Plaster frontage', (x, height / 2, rear - .45), (width, height, .6), plaster, group, .035)
    for row in range(3):
        for col in range(7):
            static_box('Stone footing', (x + (col - 3) * width / 7, .17 + row * .33, rear - .1),
                       (width / 7 - .025, .31, .2), stone, group, .022)
    for offset in [-width / 2 + .08, 0, width / 2 - .08]:
        static_box('Timber upright', (x + offset, height / 2, rear - .06), (.16, height, .21), wood, group, .015)
    for y in [.98, height - .07]:
        static_box('Frontage beam', (x, y, rear - .04), (width + .12, .18, .25), wood, group, .015)
    brace = static_box('Diagonal brace', (x - width / 4, 2.2, rear - .015),
                       (.12, 2.3, .16), wood, group, .012)
    brace.rotation_euler.y = .72
    door_x = x + width / 4
    static_box('Door recess', (door_x, 1.02, rear + .04), (1.16, 2.04, .12), dark, group, .015)
    for col in range(6):
        static_box('Door plank', (door_x + (col - 2.5) * .155, 1, rear + .115),
                   (.145, 1.94, .065), wood, group, .009)
    for y in [.4, 1.6]:
        static_box('Door strap', (door_x, y, rear + .16), (.95, .06, .04), dark, group, .004)
    window_x = x - width / 4
    static_box('Window recess', (window_x, 2.1, rear + .08), (1.12, 1.05, .08), dark, group, .01)
    for offset in [-.6, .6]:
        static_box('Window shutter', (window_x + offset, 2.1, rear + .15), (.3, 1.08, .08), wood, group, .012)
    for offset in [-.51, 0, .51]:
        static_box('Window upright', (window_x + offset, 2.1, rear + .15), (.055, 1.04, .055), wood, group, .005)
    static_box('Window sill', (window_x, 1.56, rear + .12), (1.45, .13, .28), stone, group, .02)
    roof = pivot(name + ' roof', (x, height, rear - 1.05), parent)
    for col in range(16):
        plank = static_box('Overlapping roof board', (x + (col - 7.5) * (width + .5) / 16,
                           height + .18, rear - 1.08), ((width + .5) / 16 - .008, .1, 2.65), roof_mat, roof, .01)
        plank.rotation_euler.x = .15
    static_box('Eave fascia', (x, height - .04, rear + .25), (width + .65, .22, .13), wood, roof, .015)


def image_floor(name, texture_spec, surface_size, parent):
    mat = material(name + ' material', (1, 1, 1), .95)
    image = bpy.data.images.load(str(ROOT / texture_spec['url']), check_existing=True)
    image.pack()
    texture = mat.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    texture.extension = 'REPEAT'
    mat.node_tree.links.new(texture.outputs['Color'],
                            mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    floor = static_box(name, (0, -.045, 0), (64, .08, 64), mat, parent, 0)
    repeat = texture_spec.get('repeat', [1, 1])
    tile_size = (surface_size[0] / repeat[0], surface_size[2] / repeat[1])
    for face in floor.data.polygons:
        for index in face.loop_indices:
            position = floor.data.vertices[floor.data.loops[index].vertex_index].co
            floor.data.uv_layers.active.data[index].uv = (position.x / tile_size[0], -position.y / tile_size[1])
    return floor


def build_settlement():
    reset()
    random.seed(23925)
    variant = json.loads((ROOT / 'data/combatScene.json').read_text())['sceneVariants']['settlement']
    rear = variant['composition']['rearZ']
    stone = material('Settlement weathered limestone', (.37, .35, .29), grain=True)
    plaster = material('Settlement worn lime plaster', (.54, .48, .36), grain=True)
    patch = material('Settlement muted green plaster', (.31, .35, .28), grain=True)
    wood = material('Settlement worn timber', (.23, .14, .075), grain=True)
    roof_mat = material('Settlement dark roof boards', (.14, .16, .145), grain=True)
    dark = material('Settlement recesses and iron', (.07, .065, .05), .7)
    canvas = material('Settlement faded canvas', (.43, .36, .24), grain=True)
    root = pivot('Settlement', (0, 0, 0))
    floor = pivot('Street floor', (0, 0, 0), root)
    surface = next(prop for prop in variant['props'] if prop['material'] == 'flagstone')
    image_floor('Detailed street paving', variant['materialTextures']['flagstone'], surface['size'], floor)
    timber_frontage('Left frontage', -4.4, rear - .2, 5.3, 3.75, plaster, stone, wood, roof_mat, dark, root)
    timber_frontage('Right frontage', 4.5, rear - .2, 5.3, 3.45, patch, stone, wood, roof_mat, dark, root)
    alley = pivot('Alley lintel', (0, 0, rear - .3), root)
    for x in [-1.65, 1.65]:
        static_box('Alley post', (x, 1.5, rear - .2), (.2, 3, .28), wood, alley, .02)
    static_box('Alley crossbeam', (0, 3, rear - .2), (3.65, .25, .33), wood, alley, .02)
    static_box('Lantern hanger', (0, 2.73, rear - .2), (.035, .3, .035), dark, alley, .005)
    stall = pivot('Market stall', (3.2, 0, rear), root)
    for x in [2.5, 4.3]:
        static_box('Stall post', (x, 1.1, rear + .35), (.1, 2.2, .1), wood, stall, .012)
    canopy = static_box('Canvas canopy', (3.4, 2.28, rear - .12), (2.12, .06, 1.03), canvas, stall, .01)
    canopy.rotation_euler.x = .12
    for col in range(7):
        static_box('Counter board', (2.56 + col * .28, .82, rear + .2), (.265, .07, .73), wood, stall, .008)
    for x in [2.65, 4.12]:
        static_box('Counter leg', (x, .4, rear + .15), (.1, .8, .1), wood, stall, .01)
    storage = pivot('Stacked crates', (-6.3, 0, rear), root)
    for x, y, z in [(-6.3, .36, rear + .15), (-5.55, .28, rear + .13), (-6.3, .99, rear + .12)]:
        for col in range(5):
            static_box('Crate plank', (x + (col - 2) * .125, y, z), (.115, .54, .58), wood, storage, .009)
        for level in [y - .2, y + .2]:
            static_box('Crate binding', (x, level, z + .3), (.65, .045, .035), dark, storage, .004)
    export('settlement-v1')


def build_waystation():
    # Small, explicitly authored waystation section. The battle floor stays clear.
    reset()
    random.seed(23923)
    stone = material('Weathered local masonry', (.30,.29,.25), grain=True)
    pale = material('Pale repaired masonry', (.48,.46,.37), grain=True)
    earth = material('Compacted courtyard earth', (.20,.185,.14), grain=True)
    moss = material('Quiet moss', (.14,.18,.10), grain=True)
    wood = material('Aged timber', (.20,.13,.075), grain=True)
    iron = material('Waystation dull iron', (.15,.16,.16), .58, .55)
    root = pivot('Waystation', (0,0,0))
    rear_z = json.loads((ROOT / 'data/combatScene.json').read_text())['composition']['rearZ']
    config = json.loads((ROOT / 'data/combatScene.json').read_text())
    floor = pivot('Courtyard floor', (0,0,0), root)
    surface = next(prop for prop in config['props'] if prop['material'] == 'flagstone')
    image_floor('Detailed courtyard paving', config['materialTextures']['flagstone'], surface['size'], floor)
    for row in range(6):
        for col in range(19):
            x = -9+col*.88+(row%2)*.40
            if -.7 < x < 1.9 or (col<4 and row>2) or (col>14 and row>3):
                continue
            if row==5 and random.random()<.4:
                continue
            static_box('Masonry course', (x,.20+row*.40,rear_z+random.uniform(-.03,.03)),
                (.83,.375,.66), pale if col==13 and row<4 else stone, root, .035)
    for x in [-.85,1.95]:
        static_box('Gateway timber', (x,1.40,rear_z+.03), (.22,2.8,.28), wood, root)
    static_box('Gateway lintel', (.55,2.78,rear_z+.03), (3.3,.29,.40), wood, root, .025)
    for i in range(28):
        x = random.choice([-6.5,3.6])+random.uniform(-1.7,1.7)
        z = rear_z+.4+random.uniform(-.1,.35)
        rock = static_box('Fallen wall stone', (x,.035+random.random()*.12,z),
                   (random.uniform(.18,.52),random.uniform(.12,.28),random.uniform(.18,.42)), stone, root, .055)
        rock.rotation_euler.z = random.random()*math.tau
    for x in [2.8,5.4]:
        static_box('Shelter post', (x,1.20,rear_z+.8), (.14,2.4,.16), wood, root)
    for i in range(10):
        plank = static_box('Shelter roof plank', (2.8+i*.28,2.45,rear_z+.4), (.265,.07,1.9), wood, root, .012)
        plank.rotation_euler.x = -.13
    for x,z in [(3.4,rear_z+.5),(4.8,rear_z+.7)]:
        for i in range(5):
            static_box('Crate plank', (x+(i-2)*.15,.35,z), (.135,.65,.72), wood, root, .01)
        for height in [.1,.60]:
            static_box('Crate binding', (x,height,z+.37), (.79,.055,.035), iron, root, .008)
    for i in range(22):
        x=random.uniform(-8.7,8.7)
        z=random.uniform(rear_z+.35,rear_z+.8)
        if -.8<x<2: continue
        for k in range(3):
            tube('Wall grass', [(x,0,z),(x+random.uniform(-.08,.08),random.uniform(.15,.32),z+.06)], .009,moss,root)
    # Merge static surfaces by material to bound draw calls; the .blend retains named materials.
    for mat in [stone,pale,earth,moss,wood,iron]:
        bpy.ops.object.select_all(action='DESELECT')
        objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==mat]
        if objects:
            for obj in objects: obj.select_set(True)
            bpy.context.view_layer.objects.active=objects[0]
            bpy.ops.object.join()
            bpy.context.object.name=mat.name
    export('waystation-v1')


def build_terrain_surface(variant, spec):
    rng = np.random.default_rng(spec['seed'])
    size = 2048
    yy, xx = np.mgrid[:size, :size] / size * 32
    # World-planar UVs wrap around zero: keep the road continuous across the seam.
    x = (xx + 16) % 32 - 16
    z = (yy + 16) % 32 - 16
    noise = np.zeros((size, size))
    for scale, weight in [(1, .12), (4, .065), (17, .045), (63, .03), (211, .018)]:
        grid = rng.normal(0, 1, (scale, scale))
        gx, gy = xx * scale / 32, yy * scale / 32
        ix, iy = gx.astype(int), gy.astype(int)
        fx, fy = gx - ix, gy - iy
        fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
        a = grid[iy % scale, ix % scale] * (1 - fx) + grid[iy % scale, (ix + 1) % scale] * fx
        b = grid[(iy + 1) % scale, ix % scale] * (1 - fx) + grid[(iy + 1) % scale, (ix + 1) % scale] * fx
        noise += weight * (a * (1 - fy) + b * fy)
    noise += rng.normal(0, .035, (size, size))
    centre = spec.get('roadBend', 1.2) * np.sin(z / 7) + spec.get('roadOffset', 0)
    verge = np.clip((np.abs(x - centre) - spec.get('roadWidth', 4.5) + noise * 4) / 3, 0, 1)
    soil = np.array(spec.get('soil', [.32, .265, .18]))
    moss = np.array(spec.get('grass', [.20, .245, .125]))
    pixels = np.ones((size, size, 4), dtype=np.float32)
    pixels[:, :, :3] = soil + verge[:, :, None] * (moss - soil) + noise[:, :, None] * spec.get('surfaceNoise', .3)
    if spec.get('windRipples'):
        ripples = np.sin(x * 14 + np.sin(z * .9) * 2 + noise * 8) * spec['windRipples']
        pixels[:, :, :3] += ripples[:, :, None]
    ruts = np.exp(-((np.abs(x - centre) - 1.5) / .21) ** 2) * spec.get('rutDepth', .055)
    pixels[:, :, :3] -= ruts[:, :, None]
    colors = spec.get('litterColors', [[.43, .40, .31], [.23, .17, .09], [.38, .29, .13]])
    for _ in range(spec.get('litterCount', 18000)):
        u, v = rng.integers(4, size - 4, 2)
        radius = int(rng.integers(1, 4))
        color = rng.integers(len(colors))
        pixels[v:v + radius, u:u + radius * 2, :3] = np.array(colors[color]) * rng.uniform(.7, 1.2)
    wet = np.zeros((size, size))
    for cx, cz, rx, rz in spec.get('wetZones', []):
        distance = ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2
        wet = np.maximum(wet, np.clip((1 - distance + noise * .3) * 6, 0, 1))
    if spec.get('shore'):
        shore = spec['shore']
        distance = shore['z'] - z + np.sin(x * .35) * shore.get('bend', 1)
        wet = np.maximum(wet, np.clip(distance / 1.5, 0, 1))
    if np.any(wet):
        water = np.array(spec.get('waterColor', [.16, .29, .28]))
        waves = np.sin(z * 12 + np.sin(x * .8) * 2) * .015
        waves += np.maximum(0, np.sin(z * 24 + x * 1.3) - .94) * .4
        wet_color = water + waves[:, :, None] + noise[:, :, None] * .08
        pixels[:, :, :3] = pixels[:, :, :3] * (1 - wet[:, :, None]) + wet_color * wet[:, :, None]
        if spec.get('shore'):
            foam = np.exp(-((wet - .35) / .08) ** 2) * .12
            pixels[:, :, :3] += foam[:, :, None]
    for pattern in spec.get('surfacePatterns', []):
        left, back, right, front = pattern.get('bounds', [-16, -16, 16, 16])
        mask = (x >= left) & (x <= right) & (z >= back) & (z <= front)
        if pattern['type'] == 'planks':
            spacing = pattern.get('spacing', .48)
            board = np.floor(z / spacing)
            gap = (z / spacing) % 1 < .045
            grain = np.sin(x * 23 + np.sin(z * 6)) * .012 + noise * .10
            tone = np.sin(board * 17.7) * .035
            color = np.array(pattern['color']) + (grain + tone)[:, :, None]
            color[gap] *= .28
        elif pattern['type'] == 'furrows':
            ridges = np.sin(x * math.tau / pattern.get('spacing', .65)) * .035 + noise * .12
            color = np.array(pattern['color']) + ridges[:, :, None]
        else:
            raise ValueError('Unknown outdoor surface pattern: ' + pattern['type'])
        pixels[:, :, :3][mask] = color[mask]
    image = bpy.data.images.new('Woodland soil gravel and leaf litter', width=size, height=size)
    image.pixels.foreach_set(np.clip(pixels, 0, 1).ravel())
    image.filepath_raw = str(ROOT / variant['materialTextures']['earth']['url'])
    image.file_format = 'PNG'
    image.save()


def build_woodland(scene_id='woodland'):
    reset()
    variant = json.loads((ROOT / 'data/combatScene.json').read_text())['sceneVariants'][scene_id]
    spec = variant['authoring']
    random.seed(spec['seed'])
    if not spec.get('reuseSurface'):
        build_terrain_surface(variant, spec)
    root = pivot(variant['name'], (0, 0, 0))
    image_floor('Earth gravel and wheel ruts', variant['materialTextures']['earth'], (32, .08, 32), root)
    bark = material('Weathered pine bark', (.20, .155, .10), grain=True)
    needles = [material('Pine needles ' + str(i), color, grain=True) for i, color in enumerate(spec.get('needleColors', [
        (.12, .19, .10), (.17, .235, .12), (.21, .27, .145)]))]
    rock = material('Terrain rock', tuple(spec.get('rockColor', [.30, .32, .255])), grain=True)
    for index, facade in enumerate(spec.get('frontages', [])):
        plaster = material('Facade plaster ' + str(index), tuple(facade['color']), grain=True)
        roof = material('Facade roof ' + str(index), tuple(facade.get('roofColor', [.19, .21, .18])), grain=True)
        dark = material('Facade recess', (.07, .075, .065))
        timber_frontage('Building frontage ' + str(index), facade['position'][0], facade['position'][1],
                        facade['width'], facade['height'], plaster, rock, bark, roof, dark, root)
    for index, arch in enumerate(spec.get('arches', [])):
        masonry_arch('Masonry arch ' + str(index), arch['position'][0], arch['position'][1],
                     arch['spring'], arch['radius'], arch['thickness'], arch['depth'], rock, root)
    for index, arch in enumerate(spec.get('rockArches', [])):
        group = pivot('Natural rock arch ' + str(index), (0, 0, 0), root)
        for step in range(9):
            angle = math.pi * step / 8
            x = arch['position'][0] + math.cos(angle) * arch['radius']
            y = arch['spring'] + math.sin(angle) * arch['rise']
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,
                location=P((x, y, arch['position'][1] + random.uniform(-.15, .15))))
            obj = bpy.context.object
            obj.scale = (arch['thickness'] * random.uniform(.9, 1.2), arch['depth'], arch['thickness'])
            finish(obj, 'Weathered cave rock', rock, group, False)
    detail_materials = {}
    for part in spec.get('scenerySpheres', []) + spec.get('sceneryTubes', []):
        color = tuple(part['color'])
        if color not in detail_materials:
            detail_materials[color] = material('Scenery detail ' + str(len(detail_materials)), color, grain=True)
    for part in spec.get('scenerySpheres', []):
        mat = detail_materials[tuple(part['color'])]
        sphere(part['name'], part['position'], part['size'], mat, root)
    for part in spec.get('sceneryTubes', []):
        mat = detail_materials[tuple(part['color'])]
        tube(part['name'], part['points'], part['radius'], mat, root)
    for part in spec.get('sceneryBoxes', []):
        mat = material(part['name'] + ' surface', tuple(part['color']), grain=True)
        static_box(part['name'], part['position'], part['size'], mat, root, part.get('bevel', .02))
    for index, tent in enumerate(spec.get('tents', [])):
        tx, tz = tent['position']
        width, height, depth = tent['size']
        group = pivot('Canvas tent ' + str(index), (0, 0, 0), root)
        canvas = material('Weathered tent cloth ' + str(index), tuple(tent['color']), grain=True)
        vertices = [P((tx + dx, y, tz + dz)) for dz in [-depth / 2, depth / 2]
                    for dx, y in [(-width / 2, 0), (0, height), (width / 2, 0)]]
        mesh = bpy.data.meshes.new('Tent fly')
        mesh.from_pydata(vertices, [], [(0, 3, 4, 1), (1, 4, 5, 2), (3, 5, 4)])
        uv = mesh.uv_layers.new(name='UVMap')
        for loop in mesh.loops:
            vertex = mesh.vertices[loop.vertex_index].co
            uv.data[loop.index].uv = (vertex.x, vertex.y)
        obj = bpy.data.objects.new('Tent fly', mesh)
        bpy.context.collection.objects.link(obj)
        finish(obj, 'Tent fly', canvas, group, False)
        for dz in [-depth / 2, depth / 2]:
            tube('Tent pole', [(tx, 0, tz + dz), (tx, height + .1, tz + dz)], .045, bark, group)
    for index, crown in enumerate(spec.get('broadTrees', [])):
        tx, tz = crown['position']
        height, radius = crown['height'], crown['radius']
        tree = pivot('Broadleaf tree ' + str(index), (0, 0, 0), root)
        fork = height * .62
        tube('Forked trunk', [(tx, 0, tz), (tx + .18, fork, tz),
                             (tx - .12, height, tz)], crown.get('trunkRadius', .18), bark, tree)
        for branch in range(6):
            angle = branch * math.tau / 6 + index
            dx, dz = math.cos(angle), math.sin(angle)
            tip = (tx + dx * radius * .5, height + random.uniform(-.12, .12), tz + dz * radius * .5)
            tube('Crown limb', [(tx, fork, tz), (tip[0], height * .9, tip[2])], .055, bark, tree)
            sphere('Leaf crown', tip, (radius * .52, crown['depth'], radius * .52),
                   needles[branch % len(needles)], tree)
    for index, (tx, tz, height, reach) in enumerate(spec.get('fronds', [])):
        plant = pivot('Frond plant ' + str(index), (0, 0, 0), root)
        tube('Frond stem', [(tx, 0, tz), (tx + .12, height, tz)], max(.04, height * .025), bark, plant)
        vertices, faces = [], []
        for leaf in range(9):
            angle = leaf * math.tau / 9 + index * 1.3
            dx, dz = math.cos(angle), math.sin(angle)
            start = len(vertices)
            for step in range(7):
                t = step / 6
                width = math.sin(math.pi * t) * reach * .17
                x, z = tx + dx * reach * t, tz + dz * reach * t
                y = height + math.sin(math.pi * t) * reach * .23 - t * reach * .32
                vertices.extend([P((x - dz * width, y, z + dx * width)),
                                 P((x, y + width * .25, z)), P((x + dz * width, y, z - dx * width))])
            for step in range(6):
                a = start + step * 3
                faces.extend([(a, a + 3, a + 4, a + 1), (a + 1, a + 4, a + 5, a + 2)])
        mesh = bpy.data.meshes.new('Arching broad fronds')
        mesh.from_pydata(vertices, [], faces)
        uv = mesh.uv_layers.new(name='UVMap')
        for loop in mesh.loops:
            vertex = mesh.vertices[loop.vertex_index].co
            uv.data[loop.index].uv = (vertex.x, vertex.y)
        obj = bpy.data.objects.new('Broad fronds', mesh)
        bpy.context.collection.objects.link(obj)
        finish(obj, 'Broad fronds', needles[index % len(needles)], plant, False)
    for index, (tx, tz, height) in enumerate(spec.get('snags', [])):
        snag = pivot('Weathered snag ' + str(index), (0, 0, 0), root)
        tube('Bare trunk', [(tx, 0, tz), (tx + .15, height * .65, tz),
                           (tx - .18, height, tz + .2)], .13, bark, snag)
        for side in [-1, 1]:
            tube('Broken limb', [(tx, height * .5, tz),
                                 (tx + side * height * .26, height * .66, tz + .15),
                                 (tx + side * height * .3, height * .8, tz + .1)], .045, bark, snag)
    for index, (tx, tz, height) in enumerate(spec['trees']):
        tree = pivot('Pine ' + str(index), (0, 0, 0), root)
        tube('Tapered trunk', [(tx, 0, tz), (tx + .12, height * .6, tz),
                              (tx - .15, height, tz + .12)], .12, bark, tree)
        vertices, faces = [], []
        for tier in range(7):
            y = height * (.28 + tier * .095)
            radius = height * .29 * (1 - tier / 8)
            for branch in range(9):
                angle = branch * math.tau / 9 + tier * 1.7
                length = radius * random.uniform(.7, 1.15)
                dx, dz = math.cos(angle), math.sin(angle)
                tip = (tx + dx * length, y - .2, tz + dz * length)
                if tier < 4 and branch % 3 == 0:
                    tube('Exposed branch', [(tx, y, tz), tip], .025, bark, tree)
                start = len(vertices)
                vertices.extend([P((tx, y + .5, tz)), P((tip[0] - dz * .32, tip[1], tip[2] + dx * .32)),
                                 P((tip[0], tip[1] + .12, tip[2])), P((tip[0] + dz * .32, tip[1] -.1, tip[2] - dx * .32)),
                                 P((tx, y -.16, tz))])
                faces.extend([tuple(start + n for n in face) for face in [(0, 1, 2), (0, 2, 3), (1, 4, 3), (1, 3, 2)]])
        mesh = bpy.data.meshes.new('Layered needle branches')
        mesh.from_pydata(vertices, [], faces)
        uv = mesh.uv_layers.new(name='UVMap')
        for loop in mesh.loops:
            vertex = mesh.vertices[loop.vertex_index].co
            uv.data[loop.index].uv = (vertex.x, vertex.z)
        obj = bpy.data.objects.new('Pine canopy', mesh)
        bpy.context.collection.objects.link(obj)
        finish(obj, 'Pine canopy', needles[index % len(needles)], tree, False)
    for x, z, scale in spec['rocks']:
        if spec.get('angularRocks'):
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, location=P((x, .3 * scale, z)))
            obj = bpy.context.object
            obj.scale = (scale, .7 * scale, .85 * scale)
            obj.rotation_euler.z = random.uniform(0, math.tau)
            finish(obj, 'Fractured rock outcrop', rock, root, False)
        else:
            sphere('Verge boulder', (x, .25 * scale, z), (scale, .5 * scale, .7 * scale), rock, root)
    turf = material('Sunlit meadow tussocks', tuple(spec.get('grass', [.20, .245, .125])), grain=True)
    for x, z, width, height, depth in spec.get('banks', []):
        if spec.get('softBanks'):
            vertices, faces = [], []
            steps = 24
            for row in range(steps + 1):
                for column in range(steps + 1):
                    u, v = column / steps * 2 - 1, row / steps * 2 - 1
                    rise = max(0, 1 - u * u - v * v) ** 2
                    vertices.append(P((x + u * width, height * rise - .08, z + v * depth)))
            for row in range(steps):
                for column in range(steps):
                    a = row * (steps + 1) + column
                    faces.append((a, a + steps + 1, a + steps + 2, a + 1))
            mesh = bpy.data.meshes.new('Soft terrain slope')
            mesh.from_pydata(vertices, [], faces)
            uv = mesh.uv_layers.new(name='UVMap')
            for loop in mesh.loops:
                vertex = mesh.vertices[loop.vertex_index].co
                uv.data[loop.index].uv = (vertex.x, vertex.y)
            obj = bpy.data.objects.new('Distant terrain rise', mesh)
            bpy.context.collection.objects.link(obj)
            finish(obj, 'Distant terrain rise', turf, root)
        else:
            sphere('Distant grassy rise', (x, -.15, z), (width, height, depth), turf, root)
    grass = pivot('Uneven woodland verge', (0, 0, 0), root)
    vertices, faces = [], []
    for _ in range(spec.get('grassCount', 1100)):
        x, z = random.uniform(-11, 11), random.uniform(-18, spec['vergeZ'])
        centre = spec.get('roadBend', 1.2) * math.sin(z / 7) + spec.get('roadOffset', 0)
        if abs(x - centre) < spec.get('grassClearance', 3):
            continue
        y = random.uniform(*spec.get('grassHeight', [.12, .45]))
        start = len(vertices)
        if spec.get('grassClusters'):
            if random.random() > .5 + .3 * math.sin(x * 1.7) * math.cos(z * 1.3):
                continue
            for blade in range(3):
                angle = random.uniform(0, math.tau)
                dx, dz = math.cos(angle), math.sin(angle)
                width = random.uniform(.013, .025)
                height = y * random.uniform(.6, 1.2)
                bx, bz = x + random.uniform(-.08, .08), z + random.uniform(-.08, .08)
                start = len(vertices)
                vertices.extend([P((bx - dz * width, 0, bz + dx * width)),
                                 P((bx + dz * width, 0, bz - dx * width)),
                                 P((bx + dx * height * .3, height * .65, bz + dz * height * .3)),
                                 P((bx + dx * height * .8, height, bz + dz * height * .8))])
                faces.extend([(start, start + 1, start + 2), (start, start + 2, start + 3)])
        else:
            vertices.extend([P((x - .045, 0, z)), P((x + .045, 0, z)), P((x + .1, y, z + .05))])
            faces.append((start, start + 1, start + 2))
    mesh = bpy.data.meshes.new('Grass blades')
    mesh.from_pydata(vertices, [], faces)
    uv = mesh.uv_layers.new(name='UVMap')
    for loop in mesh.loops:
        vertex = mesh.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (vertex.x, vertex.z)
    obj = bpy.data.objects.new('Grass blades', mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, 'Grass blades', turf if 'grass' in spec else needles[2], grass, False)
    export(variant.get('exportName', 'woodland-v1'))


if '--woodland-only' in sys.argv:
    build_woodland()
    sys.exit(0)
if '--outdoor-variants-only' in sys.argv:
    variants = json.loads((ROOT / 'data/combatScene.json').read_text())['sceneVariants']
    for scene_id, variant in variants.items():
        if variant.get('authoring', {}).get('builder') == 'outdoor':
            build_woodland(scene_id)
    sys.exit(0)
if '--outdoor-scene' in sys.argv:
    for scene_id in sys.argv[sys.argv.index('--outdoor-scene') + 1:]:
        build_woodland(scene_id)
    sys.exit(0)
if '--waystation-only' in sys.argv:
    build_waystation()
    sys.exit(0)
if '--settlement-only' in sys.argv:
    build_settlement()
    sys.exit(0)
if '--dungeon-only' in sys.argv:
    build_dungeon()
    sys.exit(0)


def skin_character(root):
    """Convert authoring pivots into one reusable skin, keeping attachment names.

    Blend garment seams into their parent so shoulders and hips bend rather than
    separating. Hard accessories retain rigid weights. The editable source keeps
    named mesh parts and vertex groups for further sculpting/weight painting.
    """
    bpy.context.view_layer.update()
    pivots = [o for o in bpy.context.scene.objects if o.type == 'EMPTY']
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    owners = {o: o.parent for o in meshes}
    matrices = {o: o.matrix_world.copy() for o in meshes}
    rig_data = bpy.data.armatures.new('Humanoid skeleton')
    rig = bpy.data.objects.new('Humanoid', rig_data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bones = {}
    for node in pivots:
        bone = rig_data.edit_bones.new(node.name)
        bone.head = node.matrix_world.translation
        # Blender +Y gives an identity local rest rotation, matching author pivots.
        bone.tail = bone.head + Vector((0, .10, 0))
        bones[node] = bone
    for node in pivots:
        if node.parent in bones:
            bones[node].parent = bones[node.parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for obj in meshes:
        owner = owners[obj]
        obj.parent = rig
        obj.matrix_world = matrices[obj]
        primary = obj.vertex_groups.new(name=owner.name)
        soft = obj.name.startswith(('Sleeve', 'Trouser', 'Split coat skirt'))
        parent = obj.vertex_groups.new(name=owner.parent.name) if soft and owner.parent else None
        seam_height = owner.matrix_world.translation.z
        suffix = owner.name.rsplit('.', 1)[-1]
        bend_name = ('Knee.' + suffix if obj.name.startswith('Trouser') else
                     'Elbow.' + suffix if obj.name.startswith('Sleeve') else
                     'Foot.' + suffix if obj.name.startswith('Boot shaft') else None)
        bend = obj.vertex_groups.new(name=bend_name) if bend_name else None
        bend_height = .51 if obj.name.startswith('Trouser') else 1.12 if obj.name.startswith('Sleeve') else .13
        for vertex in obj.data.vertices:
            weight = 1.0
            height = (obj.matrix_world @ vertex.co).z
            if parent:
                weight = max(0.0, min(1.0, (seam_height - height) / .15))
                parent.add([vertex.index], 1.0 - weight, 'REPLACE')
            if bend:
                blend = max(0.0, min(1.0, (bend_height + .07 - height) / .14))
                bend.add([vertex.index], weight * blend, 'REPLACE')
                weight *= 1.0 - blend
            primary.add([vertex.index], weight, 'REPLACE')
        modifier = obj.modifiers.new('Humanoid deformation', 'ARMATURE')
        modifier.object = rig
    for node in pivots:
        bpy.data.objects.remove(node, do_unlink=True)
    rig['rigKind'] = 'weighted humanoid skeleton; runtime poses'
    return rig


reset()
cloth = material('Slate woven coat', (0.18, 0.22, 0.225), grain=True)
lining = material('Faded coat lining', (0.24, 0.235, 0.19), grain=True)
scarf = material('Blue grey scarf', (0.19, 0.255, 0.29), grain=True)
leather = material('Worn brown leather', (0.20, 0.13, 0.08), 0.78, grain=True)
edge = material('Leather worn edges', (0.32, 0.245, 0.16))
pants = material('Charcoal trousers', (0.095, 0.10, 0.09), grain=True)
skin = material('Skin', (0.48, 0.33, 0.255), 0.85)
hair = material('Dark brown hair', (0.065, 0.046, 0.032), 0.95)
iron = material('Dull iron fittings', (0.28, 0.28, 0.255), 0.48, 0.7)
root = pivot('Traveller', (0, 0, 0))
root['assetVersion'] = 1
root['forward'] = '+Z in glTF'
root['rigKind'] = 'articulated nodes; no skin deformation'
spine = pivot('Spine', (0, 1.05, 0), root)

# Adult proportions: 1.82m total, a 0.235m head; layered silhouette instead of a cone body.
loft('Tailored coat torso', [(0, 1.00, 0, .19, .115), (0, 1.11, 0, .165, .11),
     (0, 1.30, 0, .22, .125), (0, 1.43, -.015, .245, .10), (0, 1.48, -.015, .14, .085)], cloth, root, folds=.006)
for sign, suffix in [(-1, 'L'), (1, 'R')]:
    leg = pivot('Leg.' + suffix, (sign * .115, .91, 0), root)
    knee = pivot('Knee.' + suffix, (sign * .14, .51, .01), leg)
    foot = pivot('Foot.' + suffix, (sign * .14, .09, .01), knee)
    loft('Trouser ' + suffix, [(sign*.115, .91, 0, .092, .095), (sign*.13, .70, -.005, .085, .08),
         (sign*.14, .51, .01, .067, .066), (sign*.14, .37, .015, .059, .06)], pants, leg, folds=.004)
    loft('Boot shaft ' + suffix, [(sign*.14, .045, .025, .07, .08), (sign*.14, .19, .0, .065, .065),
         (sign*.14, .41, .01, .074, .075)], leather, knee, folds=.003)
    sphere('Boot toe ' + suffix, (sign*.14, .075, .10), (.073, .063, .135), leather, foot)
    box('Boot sole ' + suffix, (sign*.14, .019, .078), (.148, .034, .26), pants, foot, .025)
    for height in [.28, .365]:
        loft('Boot strap ' + suffix, [(sign*.14, height, .01, .078, .079),
             (sign*.14, height+.023, .01, .078, .079)], edge, knee)
    tail = pivot('Coat.' + suffix, (sign*.12, 1.02, 0), root)
    start, end = (.16, math.pi-.05) if sign == 1 else (math.pi+.05, math.tau-.16)
    loft('Split coat skirt ' + suffix, [(0, .56, -.01, .27, .18), (0, .70, 0, .24, .15),
         (0, .90, 0, .21, .135), (0, 1.04, 0, .19, .115)], cloth, tail, start, end, .009)
    arm = pivot('Arm.' + suffix, (sign*.235, 1.40, 0), root)
    elbow = pivot('Elbow.' + suffix, (sign*.315, 1.12, .035), arm)
    loft('Sleeve ' + suffix, [(sign*.30, .96, .10, .052, .055), (sign*.315, 1.12, .035, .067, .065),
         (sign*.29, 1.27, .005, .079, .073), (sign*.235, 1.40, 0, .095, .095)], cloth, arm, folds=.004)
    loft('Bracer ' + suffix, [(sign*.30, .96, .1, .056, .06), (sign*.312, 1.105, .045, .07, .07)], leather, elbow)
    hand = pivot('Grip.' + suffix, (sign*.30, .93, .13), elbow)
    sphere('Gloved palm ' + suffix, (sign*.30, .93, .13), (.041, .063, .035), leather, hand)
    sphere('Thumb ' + suffix, (sign*.27, .94, .158), (.018, .033, .021), leather, hand)
    for offset in [-.025, -.009, .009, .025]:
        sphere('Finger ' + suffix, (sign*.30+offset, .895, .147), (.008, .03, .014), leather, hand)
    # Pack straps and seams lie along the tailored chest.
    tube('Shoulder strap ' + suffix, [(sign*.10, 1.08, .125), (sign*.17, 1.29, .13),
         (sign*.17, 1.43, .065), (sign*.15, 1.45, -.11)], .017, leather, root)

loft('Belt', [(0, 1.075, 0, .18, .127), (0, 1.125, 0, .18, .127)], leather, root)
box('Buckle', (.025, 1.10, .137), (.066, .055, .017), iron, root, .006)
box('Buckle centre', (.025, 1.10, .15), (.043, .034, .012), leather, root, .002)
for x in [-.15, .145]:
    box('Belt pouch', (x, .99, .13), (.10, .12, .07), leather, root, .025)
    box('Pouch flap', (x, 1.04, .171), (.105, .045, .014), edge, root, .008)
box('Travel pack', (0, 1.28, -.19), (.30, .34, .17), leather, root, .055)
for x in [-.105, .105]:
    tube('Pack binding', [(x, 1.11, -.22), (x, 1.29, -.28), (x, 1.43, -.22)], .012, edge, root)
loft('Neck', [(0, 1.44, 0, .062, .063), (0, 1.60, 0, .061, .064)], skin, root)
for i in range(4):
    loft('Scarf wrap', [(0, 1.45+i*.024, .015, .10-i*.006, .085),
         (0, 1.48+i*.024, .015, .102-i*.006, .09)], scarf, root, folds=.008)
scarf_end = box('Scarf hanging end', (-.075, 1.36, .144), (.095, .24, .017), scarf, root, .008)
scarf_end.rotation_euler.y = -.12
loft('Head', [(0, 1.585, .006, .047, .061), (0, 1.62, .008, .068, .076),
     (0, 1.69, .003, .091, .081), (0, 1.755, -.005, .087, .078),
     (0, 1.80, -.014, .058, .058), (0, 1.815, -.014, .006, .006)], skin, root)
for sign in [-1, 1]:
    sphere('Ear', (sign*.087, 1.689, -.001), (.014, .028, .016), skin, root)
    tube('Brow', [(sign*.014,1.715,.079),(sign*.04,1.718,.077),(sign*.066,1.709,.061)], .004, hair, root)
    sphere('Eye shadow', (sign*.034,1.702,.078), (.019,.006,.003), hair, root)
    sphere('Eye', (sign*.034,1.702,.081), (.007,.003,.002), iron, root)
sphere('Nose bridge', (0,1.684,.081), (.011,.031,.014), skin, root)
sphere('Nose tip', (0,1.667,.095), (.014,.009,.012), skin, root)
tube('Mouth', [(-.025,1.642,.078),(0,1.640,.083),(.024,1.643,.078)], .0025, leather, root)
sphere('Hair crown', (0,1.779,-.021), (.094,.061,.083), hair, root)
for i in range(11):
    x = -.084+i*.016
    tube('Swept hair strand', [(x,1.77,-.075),(x-.014,1.824,-.015),
         (x-.018,1.784,.069),(x-.025,1.71+abs(x)*.4,.072)], .009, hair, root)
for i in range(4):
    sphere('Back hair lock', (-.055+i*.035,1.727,-.081), (.024,.082,.022), hair, root)
# Upper-body clothing and attachments share the breathing spine; feet stay rooted.
for obj in list(bpy.context.scene.objects):
    if obj.parent == root and obj != spine:
        if obj.name.startswith(('Arm.', 'Tailored', 'Shoulder', 'Travel pack', 'Pack binding',
                                'Neck', 'Scarf', 'Head', 'Ear', 'Brow', 'Eye', 'Nose',
                                'Mouth', 'Hair', 'Swept', 'Back hair')):
            world = obj.matrix_world.copy()
            obj.parent = spine
            obj.matrix_world = world
head = pivot('HeadJoint', (0, 1.56, 0), spine)
for obj in list(bpy.context.scene.objects):
    if obj.type == 'MESH' and obj.name.startswith(('Head', 'Ear', 'Brow', 'Eye', 'Nose',
                                                 'Mouth', 'Hair', 'Swept', 'Back hair')):
        world = obj.matrix_world.copy()
        obj.parent = head
        obj.matrix_world = world
skin_character(root)
export('traveller-v1')
if '--character-only' in sys.argv:
    sys.exit(0)

build_waystation()
build_dungeon()
build_settlement()
build_woodland()
for scene_id, variant in json.loads((ROOT / 'data/combatScene.json').read_text())['sceneVariants'].items():
    if variant.get('authoring', {}).get('builder') == 'outdoor':
        build_woodland(scene_id)
