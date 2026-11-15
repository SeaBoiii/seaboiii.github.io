"""Reproduce Aleem's Higgsfield 3D Jutsu specimen in a NEW EMPTY scene.

SCENE: An asymmetric fractured carbon cradle exposes a precise polished heart;
metre scale, 1280x960 studio render, portable low-polygon glTF.
HIERARCHY: RIG_Specimen owns centroid-pivoted HERO_Shell_* shards, HERO_Core
and PRC_* copper construction traces. ENV_* and LGT_* stay separate.
ASSETS: Original procedural geometry and plain PBR materials. No imported
images, models, logos, or replacement novel covers.
SHOT: CAM_main; right-weighted hero, quiet negative space for HTML at left.
LOOK: Obsidian/carbon outside, silver and ice-blue machined surfaces inside,
restrained warm copper for a construction-mark A and silicon-like traces.
LIGHT: Cool upper/front key, soft fill, rear rim, weak warm side light.
MOTION: Interactive opening/scattering is authored by the frontend from these
pivots. This export is a stable rest pose, not an autonomous endless turntable.
ACCEPTANCE: Exposed heart, rough/polished contrast, no silhouette cropping,
object-space pivots, <1MB GLB and no missing texture references.

Run through scene_builder_3d_run_python only after the authorized empty-scene
query and matching revision guards. The service provides bpy and artifacts.
To edit an existing asset, inspect its semantic objects first rather than
re-running this reconstruction. Final IDs/checks are in assets/motion/provenance.json.
"""

import bpy
if len(bpy.data.objects):
    raise RuntimeError('Reconstruction requires an authorized empty scene.')

import bpy, math, random
from mathutils import Vector
random.seed(27)
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=1200
scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.render.image_settings.media_type='IMAGE'
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.world=bpy.data.worlds.new('ENV_ObsidianWorld')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(0.012,0.017,0.028,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=0.32
def mat(name,color,metal=0.0,rough=.5):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    m.use_nodes=True
    b=m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value=(*color,1)
    b.inputs['Metallic'].default_value=metal
    b.inputs['Roughness'].default_value=rough
    return m
carbon=mat('MAT_RoughCarbon',(0.022,0.030,0.042),.68,.72)
carbon2=mat('MAT_CarbonFacet',(0.038,0.047,0.062),.56,.61)
silver=mat('MAT_PolishedInterior',(.57,.68,.77),.93,.15)
coremat=mat('MAT_CoreSilver',(.30,.45,.59),.90,.12)
copper=mat('MAT_CopperSeam',(.63,.35,.19),.90,.22)
floor=mat('MAT_Floor',(.012,.016,.023),.30,.46)
rig=bpy.data.objects.new('RIG_Specimen',None)
scene.collection.objects.link(rig)
rig.location=(1.1,0,0)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1.67)
source=bpy.context.object
verts=[v.co.copy() for v in source.data.vertices]
faces=[tuple(p.vertices) for p in source.data.polygons]
bpy.data.objects.remove(source,do_unlink=True)
made=[]
for i,face in enumerate(faces):
    points=[verts[v] for v in face]
    center=sum(points,Vector())/3
    n=center.normalized()
    # A carbon cradle around an intentionally open polished interior.
    if n.y < -.18 and n.x > -.40 and n.z > -.48:
        continue
    spread=1.0 + (i%4)*.025
    outer=[p*spread+n*.075 for p in points]
    inner=[p*.865+n*.075 for p in points]
    mesh=bpy.data.meshes.new('GEOM_CarbonShard_%02d'%i)
    mesh.from_pydata([list(v) for v in outer+inner],[],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)])
    mesh.materials.append(carbon if i%3 else carbon2)
    mesh.materials.append(silver)
    obj=bpy.data.objects.new('HERO_Shell_%02d'%i,mesh)
    scene.collection.objects.link(obj)
    obj.parent=rig
    mesh.polygons[1].material_index=1
    made.append(obj.name)
# Machined faceted heart, rather than an unrelated product prop.
segments=8
rings=[(-1.05,.12),(-.68,.52),(.18,.99),(.79,.67),(1.04,.30)]
v=[]
for z,r in rings:
    for j in range(segments):
        a=j*math.tau/segments+math.pi/8
        v.append((math.cos(a)*r,math.sin(a)*r,z))
f=[]
f.append(tuple(range(segments-1,-1,-1)))
for k in range(len(rings)-1):
    for j in range(segments):
        f.append((k*segments+j,k*segments+(j+1)%segments,(k+1)*segments+(j+1)%segments,(k+1)*segments+j))
f.append(tuple((len(rings)-1)*segments+j for j in range(segments)))
mesh=bpy.data.meshes.new('GEOM_FacetedHeart')
mesh.from_pydata(v,[],f)
mesh.materials.append(coremat)
mesh.materials.append(silver)
core=bpy.data.objects.new('HERO_Core',mesh)
scene.collection.objects.link(core)
core.parent=rig
for p in mesh.polygons:
    p.material_index=1 if p.index%5==0 else 0
# A quiet copper A is a personal construction mark, not a logo pasted on top.
def trace(name,points,radius=.014,material=copper):
    curve=bpy.data.curves.new(name+'_Curve','CURVE')
    curve.dimensions='3D'
    curve.bevel_depth=radius
    curve.bevel_resolution=1
    poly=curve.splines.new('POLY')
    poly.points.add(len(points)-1)
    for point,co in zip(poly.points,points):
        point.co=(*co,1)
    obj=bpy.data.objects.new(name,curve)
    scene.collection.objects.link(obj)
    obj.parent=rig
    obj.data.materials.append(material)
    return obj
trace('PRC_A_Left',[(-.34,-.88,-.31),(0,-.88,.47)])
trace('PRC_A_Right',[(0,-.88,.47),(.34,-.88,-.31)])
trace('PRC_A_Crossbar',[(-.19,-.89,.02),(.19,-.89,.02)],.011)
trace('PRC_Trace_00',[(-.72,-.43,-.30),(-.55,-.70,-.04),(-.55,-.70,.27),(-.29,-.70,.52)],.012)
trace('PRC_Trace_01',[(.43,-.75,-.30),(.65,-.62,-.10),(.65,-.62,.28),(.45,-.62,.50)],.012)
# Low, physical support and a studio floor.
bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=1.39,depth=.12,location=(1.1,0,-1.74))
base=bpy.context.object
base.name='ENV_SpecimenPlinth'
base.data.materials.append(carbon)
bpy.ops.mesh.primitive_plane_add(size=12,location=(0,0,-1.81))
ground=bpy.context.object
ground.name='ENV_StudioFloor'
ground.data.materials.append(floor)
def aim(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def light(name,kind,location,power,color,size):
    data=bpy.data.lights.new(name,kind)
    data.energy=power
    data.color=color
    if hasattr(data,'shadow_soft_size'):data.shadow_soft_size=size
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location=location
    aim(obj,(1.1,0,0))
    return obj
light('LGT_key','POINT',(0,-4.4,5.0),1450,(.79,.89,1),2.0)
light('LGT_fill','POINT',(4.8,-2.0,1.8),420,(.65,.78,1),2.4)
light('LGT_rim','POINT',(2.5,2.1,3.4),1800,(.76,.88,1),1.1)
light('LGT_copper','POINT',(-2.1,.1,.1),175,(1,.58,.32),1.0)
camdata=bpy.data.cameras.new('CAM_main')
cam=bpy.data.objects.new('CAM_main',camdata)
scene.collection.objects.link(cam)
cam.location=(4.6,-8.7,3.35)
camdata.lens=46
aim(cam,(.2,0,-.1))
scene.camera=cam

# Refinement: portable local origins, readable raw edges, surface-following copper.

import bpy, math, random
from mathutils import Vector
random.seed(27)
scene=bpy.context.scene
rig=bpy.data.objects['RIG_Specimen']
rig.location=(0,0,0)
for obj in bpy.data.objects:
    if obj.name.startswith('HERO_Shell_'):
        old=obj.data
        outer=[old.vertices[i].co.copy() for i in range(3)]
        inner=[old.vertices[i].co.copy() for i in range(3,6)]
        normal=(sum(outer,Vector())/3).normalized()
        # Small chipped planar breaks travel into GLB as geometry, not an unexportable noise shader.
        for i,p in enumerate(outer):
            tangent=Vector((random.uniform(-.045,.045),random.uniform(-.045,.045),random.uniform(-.045,.045)))
            outer[i]=p+tangent
        center=sum(outer,Vector())/3+normal*.035
        points=outer+inner+[center]
        pivot=sum(points,Vector())/len(points)
        mesh=bpy.data.meshes.new('GEOM_Fractured_'+obj.name)
        mesh.from_pydata([list(p-pivot) for p in points],[],[(0,1,6),(1,2,6),(2,0,6),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)])
        for material in old.materials:mesh.materials.append(material)
        mesh.polygons[3].material_index=1
        obj.data=mesh
        obj.location=pivot+normal*random.uniform(.045,.12)
        obj.rotation_euler=(random.uniform(-.045,.045),random.uniform(-.045,.045),random.uniform(-.045,.045))
        if old.users==0:bpy.data.meshes.remove(old)
# Place the mark and traces on the actual faceted front surface.
rings=[(-1.05,.12),(-.68,.52),(.18,.99),(.79,.67),(1.04,.30)]
def radius(z):
    for (za,ra),(zb,rb) in zip(rings,rings[1:]):
        if za<=z<=zb:return ra+(rb-ra)*(z-za)/(zb-za)
    return rings[0][1] if z<rings[0][0] else rings[-1][1]
def surface(x,z):
    r=radius(z)
    points=[(math.cos(j*math.tau/8+math.pi/8)*r,math.sin(j*math.tau/8+math.pi/8)*r) for j in range(8)]
    ys=[]
    for (xa,ya),(xb,yb) in zip(points,points[1:]+points[:1]):
        if min(xa,xb)-1e-8<=x<=max(xa,xb)+1e-8 and abs(xb-xa)>1e-8:
            ys.append(ya+(yb-ya)*(x-xa)/(xb-xa))
    return min(ys)-.012 if ys else -.01
def route(name,xzs,radius=.010):
    old=bpy.data.objects.get(name)
    if old:bpy.data.objects.remove(old,do_unlink=True)
    points=[]
    for (xa,za),(xb,zb) in zip(xzs,xzs[1:]):
        for j in range(5):
            t=j/5
            x,z=xa+(xb-xa)*t,za+(zb-za)*t
            points.append((x,surface(x,z),z))
    x,z=xzs[-1]
    points.append((x,surface(x,z),z))
    data=bpy.data.curves.new(name+'_Projected','CURVE')
    data.dimensions='3D';data.bevel_depth=radius;data.bevel_resolution=1
    poly=data.splines.new('POLY');poly.points.add(len(points)-1)
    for p,co in zip(poly.points,points):p.co=(*co,1)
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.parent=rig
    obj.data.materials.append(bpy.data.materials['MAT_CopperSeam'])
route('PRC_A_Left',[(-.28,-.27),(0,.43)],.011)
route('PRC_A_Right',[(0,.43),(.28,-.27)],.011)
route('PRC_A_Crossbar',[(-.17,.0),(.17,.0)],.008)
route('PRC_Trace_00',[(-.52,-.29),(-.44,-.05),(-.44,.31),(-.27,.49)],.009)
route('PRC_Trace_01',[(.40,-.29),(.56,-.06),(.56,.28),(.36,.49)],.009)
# Preserve the established negative-space shot while the portable asset root stays at zero.
bpy.data.objects['ENV_SpecimenPlinth'].location.x=0
for name in ('LGT_key','LGT_fill','LGT_rim','LGT_copper'):
    bpy.data.objects[name].location.x-=1.1
bpy.data.objects['LGT_copper'].data.energy=55
cam=bpy.data.objects['CAM_main']
cam.location.x-=1.1
cam.rotation_euler=(Vector((-.9,0,-.1))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=1280
scene.render.resolution_y=960
target=artifacts.file(name='aleem-specimen-poster.png',media_type='image/png')
scene.render.filepath=str(target.path)
scene.render.image_settings.media_type='IMAGE'
scene.render.image_settings.file_format='PNG'
bpy.ops.render.render(write_still=True)
target.publish()
result={'root':list(rig.location),'shellPivots':{o.name:list(o.location) for o in rig.children if o.name.startswith('HERO_Shell_')},'coreDimensions':list(bpy.data.objects['HERO_Core'].dimensions),'meshVertexCount':sum(len(o.data.vertices) for o in rig.children if o.type=='MESH'),'camera':list(cam.location)}
