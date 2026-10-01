# TroDes wearable enclosure — parametric model for Blender 4.5 (run headless):
#   blender -b --python trodes_wearable_enclosure.py -- <output_dir>
# Units: 1 Blender unit = 1 mm. Parts: base (with power-deck compartments), shelf (compartment
# cover + PCB posts), lid (snap-on), SOS plunger, belt clip. Exports STL per part and preview PNGs.
#
# Plan-view coordinates: u = right, v = down (same as the KiCad PCB view), z = up.
# PCB (69 x 66 mm, Rev C3) sits with its top-left corner at (u, v) = (2.5, 2.5).
import bpy, bmesh, math, os, sys, struct

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.getcwd()

# ---------------- parameters (mm) ----------------------------------------------------------
WALL, FLOOR, LID_T = 2.0, 2.0, 2.0
IN_U, IN_V = 70.0, 70.0                  # cavity: PCB 69 + 1 clearance; 66 + 0.5 + 3.5 wire channel
OUT_U, OUT_V = IN_U + 2 * WALL, IN_V + 2 * WALL
PCB_U0, PCB_V0 = WALL + 0.5, WALL + 0.5  # PCB top-left corner
DECK_TOP = 11.0                          # compartment height: floor 2 + 9 clear (toggle body 7.8)
SHELF_T, POST_H = 1.2, 2.5               # cover plate, and posts clearing the solder joints
PCB_BOT = DECK_TOP + SHELF_T + POST_H    # 14.7
PCB_TOP = PCB_BOT + 1.6                  # 16.3
HDR, MALE = 5.0, 2.5                     # female header height (measured) + male header plastic
STACK = 8.5                              # stackable header under the MAX30102
SW2_H = 13.0                             # 12 x 12 x 13 tact switch (team measured 13 mm, 27 Sep)
CLEAR_TOP = 19.5                         # tallest part (heatsink 17.2) + margin, above PCB top
LID_IN = PCB_TOP + CLEAR_TOP             # 35.8
LID_TOP = LID_IN + LID_T                 # 37.8
LIP_H, LIP_T, LIP_GAP = 3.0, 1.2, 0.3        # 0.3 mm/side: PETG prints slightly tight
BUMP = 0.7                                   # snap bump: 0.4 mm into the 0.6 mm groove

P = lambda x, y: (PCB_U0 + x, PCB_V0 + y)       # PCB coordinates -> plan view
I = lambda x, y: (WALL + x, WALL + y)           # cavity coordinates -> plan view

# ---------------- mesh helpers -------------------------------------------------------------
col = bpy.context.scene.collection
def signed_volume(bm):
    bm.faces.ensure_lookup_table()
    v = 0.0
    for f in bm.faces:
        cs = [l.vert.co for l in f.loops]
        for k in range(1, len(cs) - 1):
            v += cs[0].dot(cs[k].cross(cs[k + 1])) / 6.0
    return v
def new_obj(name, bm):
    if signed_volume(bm) < 0:        # the v -> -Y mirror turns boxes inside-out; the EXACT solver then fails
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); col.objects.link(ob); return ob
def box(name, u0, u1, v0, v1, z0, z1):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for vt in bm.verts:
        vt.co.x = u0 + (vt.co.x + 0.5) * (u1 - u0)
        vt.co.y = -(v0 + (vt.co.y + 0.5) * (v1 - v0))
        vt.co.z = z0 + (vt.co.z + 0.5) * (z1 - z0)
    return new_obj(name, bm)
def cyl(name, u, v, z0, z1, r, r_top=None, seg=64, axis="z"):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r,
                          radius2=r if r_top is None else r_top, depth=z1 - z0)
    for vt in bm.verts:
        vt.co.z += (z0 + z1) / 2
    ob = new_obj(name, bm)
    if axis == "y":   # lay the cylinder along plan-view v (Blender -Y)
        ob.rotation_euler = (math.radians(90), 0, 0)
    ob.location = (u, -v, 0) if axis == "z" else (u, 0, 0)
    return ob
def apply_tf(ob):
    bpy.context.view_layer.update()
    ob.data.transform(ob.matrix_world); ob.matrix_world.identity()
    ob.location = (0, 0, 0); ob.rotation_euler = (0, 0, 0)
def boolean(target, cutters, op):
    if op == "UNION" and len(cutters) > 1:
        for c in cutters: boolean(target, [c], op)
        return
    tmp = bpy.data.collections.new("cut_" + target.name)
    bpy.context.scene.collection.children.link(tmp)
    for c in cutters:
        apply_tf(c)
        for cl in c.users_collection: cl.objects.unlink(c)
        tmp.objects.link(c)
    m = target.modifiers.new("b", "BOOLEAN"); m.operation = op; m.solver = "EXACT"
    m.operand_type = "COLLECTION"; m.collection = tmp
    m.use_self = True; m.use_hole_tolerant = True
    bpy.context.view_layer.objects.active = target
    with bpy.context.temp_override(object=target, active_object=target):
        bpy.ops.object.modifier_apply(modifier=m.name)
    for c in list(tmp.objects): bpy.data.objects.remove(c, do_unlink=True)
    bpy.data.collections.remove(tmp)
def text_cutter(name, s, u, v, z0, size, depth):
    cu = bpy.data.curves.new(name, "FONT"); cu.body = s; cu.size = size; cu.extrude = depth / 2
    cu.align_x = "CENTER"; cu.align_y = "CENTER"
    ob = bpy.data.objects.new(name, cu); col.objects.link(ob)
    ob.location = (u, -v, z0 + depth / 2)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    bpy.context.view_layer.update()
    mo = bpy.data.objects.new(name + "_m", me); col.objects.link(mo); mo.matrix_world = ob.matrix_world.copy()
    bpy.data.objects.remove(ob, do_unlink=True)
    return mo

# ---------------- base: shell + power-deck compartments -------------------------------------
base = box("base", 0, OUT_U, 0, OUT_V, 0, LID_IN)
boolean(base, [box("cav", WALL, WALL + IN_U, WALL, WALL + IN_V, FLOOR, LID_IN + 1)], "DIFFERENCE")
adds = []
# dividers (full compartment height, carry the shelf)
adds.append(box("div_y", WALL - 0.05, WALL + IN_U + 0.05, I(0, 46.4)[1], I(0, 47.6)[1], FLOOR - 0.05, DECK_TOP))
adds.append(box("div_c3c4", I(29.2, 0)[0], I(30.4, 0)[0], I(0, 47.6)[1], I(0, 70.05)[1], FLOOR - 0.05, DECK_TOP))
adds.append(box("div_c1c2", I(51.2, 0)[0], I(52.4, 0)[0], I(0, -0.05)[1], I(0, 46.4)[1], FLOOR - 0.05, DECK_TOP))
# locator rims (3 mm tall)
adds.append(box("rim_batt", I(-0.05, 0)[0], I(50, 0)[0], I(0, 35.0)[1], I(0, 36.2)[1], FLOOR - 0.05, FLOOR + 3))
adds.append(box("rim_tp_bot", I(-0.05, 0)[0], I(29.2, 0)[0], I(0, 66.0)[1], I(0, 67.2)[1], FLOOR - 0.05, FLOOR + 3))
adds.append(box("rim_mt_right", I(68.0, 0)[0], I(69.2, 0)[0], I(0, 47.6)[1], I(0, 67.0)[1], FLOOR - 0.05, FLOOR + 3))
adds.append(box("rim_mt_bot", I(30.4, 0)[0], I(70.05, 0)[0], I(0, 67.0)[1], I(0, 68.2)[1], FLOOR - 0.05, FLOOR + 3))
# shelf ledges on the walls (right-wall ledge interrupted at the toggle switch)
adds.append(box("ledge_l", WALL - 0.05, WALL + 1.5, WALL, I(0, 66.5)[1], DECK_TOP - 1.2, DECK_TOP))
adds.append(box("ledge_t", WALL - 0.05, WALL + IN_U + 0.05, WALL - 0.05, WALL + 1.5, DECK_TOP - 1.2, DECK_TOP))
adds.append(box("ledge_r1", WALL + IN_U - 1.5, WALL + IN_U + 0.05, WALL, I(0, 32)[1], DECK_TOP - 1.2, DECK_TOP))
adds.append(box("ledge_r2", WALL + IN_U - 1.5, WALL + IN_U + 0.05, I(0, 50)[1], I(0, 66.5)[1], DECK_TOP - 1.2, DECK_TOP))
adds.append(box("ledge_b", WALL - 0.05, WALL + IN_U + 0.05, I(0, 65.0)[1], I(0, 66.3)[1], DECK_TOP - 1.2, DECK_TOP))
boolean(base, adds, "UNION")
cuts = []
# wire notches through the dividers (top 4 mm)
cuts.append(box("n1", I(10, 0)[0], I(16, 0)[0], I(0, 46.0)[1], I(0, 48.0)[1], DECK_TOP - 4, DECK_TOP + 1))
cuts.append(box("n2", I(60, 0)[0], I(66, 0)[0], I(0, 46.0)[1], I(0, 48.0)[1], DECK_TOP - 4, DECK_TOP + 1))
cuts.append(box("n3", I(28.8, 0)[0], I(30.8, 0)[0], I(0, 52)[1], I(0, 58)[1], DECK_TOP - 4, DECK_TOP + 1))
cuts.append(box("n4", I(50.8, 0)[0], I(52.8, 0)[0], I(0, 20)[1], I(0, 26)[1], DECK_TOP - 4, DECK_TOP + 1))
# wall openings
usb_v = P(0, 34.3)[1]; usb_z = PCB_TOP + HDR + MALE + 1.6 + 1.5
# ESP32 devkit is USB-C (team, 27 Sep): 13 x 8 mm clears a USB-C plug overmold (up to 12.35 x 6.5 mm)
# 15 x 9 mm: the USB-C mouth is ~11.5 mm inside the wall, so the plug overmold (up to 12.35 x 6.5)
# has to pass ~7 mm through this opening - 1.3 mm spare each side
cuts.append(box("usb_esp32", OUT_U - WALL - 1, OUT_U + 1, usb_v - 7.5, usb_v + 7.5, usb_z - 4.5, usb_z + 4.5))
# TP4056 USB Type-C: 13 x 8 mm, clears a USB-C plug overmold (up to 12.35 x 6.5 mm) around the port at z ~ 5.2
cuts.append(box("usb_tp4056", -1, WALL + 1, I(0, 56.8)[1] - 6.5, I(0, 56.8)[1] + 6.5, FLOOR - 0.5, FLOOR + 7.5))
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=3.2, radius2=3.2, depth=WALL + 2)
tg = new_obj("toggle_hole", bm); tg.rotation_euler = (0, math.radians(90), 0)
tg.location = (OUT_U - WALL / 2, -I(0, 40)[1], FLOOR + 4.5); cuts.append(tg)
# snap grooves for the lid (left and right walls)
cuts.append(box("groove_l", WALL - 0.6, WALL + 0.01, 24, 50, LID_IN - 2.2, LID_IN - 1.0))
cuts.append(box("groove_r", WALL + IN_U - 0.01, WALL + IN_U + 0.6, 24, 50, LID_IN - 2.2, LID_IN - 1.0))
# belt-clip screw holes (M3 clearance)
for u in (27.0, 47.0): cuts.append(cyl("clip_hole", u, 42.5, -1, FLOOR + 1, 1.7))
boolean(base, cuts, "DIFFERENCE")

# ---------------- shelf: compartment cover + PCB posts -------------------------------------
shelf = box("shelf", WALL + 0.4, WALL + IN_U - 0.4, WALL + 0.4, I(0, 66.3)[1], DECK_TOP, DECK_TOP + SHELF_T)   # 0.4 mm/side drop-in
posts = [(20, 34), (50, 34), (35.5, 59.3), (64, 35), (6, 16), (33.5, 7)]   # PCB coordinates, clear of pads
boolean(shelf, [cyl("post", *P(x, y), DECK_TOP + SHELF_T - 0.01, PCB_BOT, 2.0) for x, y in posts], "UNION")

# ---------------- lid ----------------------------------------------------------------------
lid = box("lid", 0, OUT_U, 0, OUT_V, LID_IN, LID_TOP)
lz0 = LID_IN - LIP_H
o0, o1 = WALL + LIP_GAP, WALL + IN_U - LIP_GAP
i0, i1 = o0 + LIP_T, o1 - LIP_T
lip = [box("lip_l", o0, i0, o0, o1, lz0, LID_IN + 0.01), box("lip_r", i1, o1, o0, o1, lz0, LID_IN + 0.01),
       box("lip_b", o0, o1, i1, o1, lz0, LID_IN + 0.01),
       box("bump_l", o0 - BUMP, o0 + 0.01, 25, 49, LID_IN - 2.0, LID_IN - 1.2),
       box("bump_r", o1 - 0.01, o1 + BUMP, 25, 49, LID_IN - 2.0, LID_IN - 1.2)]
boolean(lid, lip, "UNION")
lc = []
sos = P(35.5, 59.3); led = P(62.27, 17.5); buz = P(55.0, 59.5); hr = P(22.0, 8.58)
lc.append(cyl("sos_hole", *sos, LID_IN - 1, LID_TOP + 1, 5.5))
lc.append(cyl("led_hole", *led, LID_IN - 1, LID_TOP + 1, 2.6))
lc.append(cyl("buz0", *buz, LID_IN - 1, LID_TOP + 1, 0.9))
for k in range(6):
    a = k * math.pi / 3
    lc.append(cyl("buz", buz[0] + 3.5 * math.cos(a), buz[1] + 3.5 * math.sin(a), LID_IN - 1, LID_TOP + 1, 0.9))
lc.append(box("hr_window", hr[0] - 5, hr[0] + 5, hr[1] - 4, hr[1] + 4, LID_IN - 1, LID_TOP + 1))
lc.append(cyl("hr_dish", *hr, LID_TOP - 1.0, LID_TOP + 0.01, 6.0, r_top=10.0))
lc.append(box("hr_relief", hr[0] - 10.5, hr[0] + 10.5, hr[1] - 8.0, hr[1] + 8.0, LID_IN - 1, LID_IN + 0.4))
for u in (12.5, 15.5, 18.5, 21.5, 24.5):
    lc.append(box("vent", PCB_U0 + u - 2.5 - 0.9 + 2.5, PCB_U0 + u - 2.5 + 0.9 + 2.5, P(0, 28)[1], P(0, 41)[1], LID_IN - 1, LID_TOP + 1))
try:
    lc.append(text_cutter("t_sos", "SOS", sos[0], sos[1] - 9.0, LID_TOP - 0.6, 5.0, 1.2))
    lc.append(text_cutter("t_name", "TroDes", 20.0, 69.5, LID_TOP - 0.6, 4.5, 1.2))
except Exception as e:
    print("text engraving skipped:", e)
boolean(lid, lc, "DIFFERENCE")

# ---------------- SOS plunger (captive: flange under the lid) -------------------------------
z_sw = PCB_TOP + SW2_H + 0.6       # 0.6 mm free travel before the switch
plunger = cyl("plunger", *sos, z_sw, LID_IN - 1.0, 3.0)
boolean(plunger, [cyl("flange", *sos, LID_IN - 1.0, LID_IN, 6.75),
                  cyl("shaft", *sos, LID_IN - 0.01, LID_TOP + 1.2, 5.2)], "UNION")

# ---------------- belt clip (print on its side; 2 x M3 x 6 through the base floor) ----------
W_CLIP, A_HOLE = 30.0, 14.0
clip = box("clip", 0, 24, 0, W_CLIP, 0, 5)                     # plate (in its own frame: a = u, w = v, t = z)
boolean(clip, [box("joint", 0, 4, 0, W_CLIP, 4.99, 11), box("tongue", 0, 40, 0, W_CLIP, 8.5, 11),
               box("bump", 35, 40, 0, W_CLIP, 7.2, 8.51)], "UNION")
boolean(clip, [cyl("h", A_HOLE, w, -1, 5.5, 1.4) for w in (5.0, 25.0)], "DIFFERENCE")

# ---------------- export STL ---------------------------------------------------------------
def write_stl(ob, path, orient="as_is"):
    # orient: "as_is"; "flip" = 180 deg about X (lid/plunger print top-down);
    # "side" = 90 deg about X (belt clip: its C-profile on the bed, no supports). Every part is dropped to z = 0.
    dg = bpy.context.evaluated_depsgraph_get(); me = ob.evaluated_get(dg).to_mesh()
    me.calc_loop_triangles()
    R = {"as_is": lambda x, y, z: (x, y, z), "flip": lambda x, y, z: (x, -y, -z),
         "side": lambda x, y, z: (x, -z, y)}[orient]
    tris = [[R(*me.vertices[i].co) for i in t.vertices] for t in me.loop_triangles]
    ns = [R(*t.normal) for t in me.loop_triangles]
    z0 = min(v[2] for t in tris for v in t)
    with open(path, "wb") as f:
        f.write(b"TroDes enclosure".ljust(80, b" ")); f.write(struct.pack("<I", len(tris)))
        for t, n in zip(tris, ns):
            f.write(struct.pack("<3f", *n))
            for v in t: f.write(struct.pack("<3f", v[0], v[1], v[2] - z0))
            f.write(bytes(2))
    ob.evaluated_get(dg).to_mesh_clear()
    return os.path.getsize(path)
os.makedirs(OUT, exist_ok=True)
for ob, name, orient in [(base, "Wearable_Base", "as_is"), (shelf, "Wearable_Shelf", "as_is"),
                         (lid, "Wearable_Lid_print_upside_down", "flip"), (plunger, "Wearable_SOS_Plunger", "flip"),
                         (clip, "Wearable_BeltClip_print_on_side", "side")]:
    print("STL", name, write_stl(ob, os.path.join(OUT, name + ".stl"), orient), "bytes")

# ---------------- stand-ins for the preview (not exported) ---------------------------------
def stand(name, u0, u1, v0, v1, z0, z1, rgba):
    ob = box(name, u0, u1, v0, v1, z0, z1); ob.color = rgba; return ob
green, blue, grey, red = (0.1, 0.45, 0.2, 1), (0.1, 0.2, 0.55, 1), (0.35, 0.35, 0.35, 1), (0.7, 0.15, 0.1, 1)
def pr(x0, y0, x1, y1): return (P(x0, y0)[0], P(x1, y1)[0], P(x0, y0)[1], P(x1, y1)[1])
def ir(x0, y0, x1, y1): return (I(x0, y0)[0], I(x1, y1)[0], I(x0, y0)[1], I(x1, y1)[1])
parts = [
    stand("pcb", *pr(0, 0, 69, 66), PCB_BOT, PCB_TOP, green),
    stand("devkit", *pr(3, 20.3, 58, 48.3), PCB_TOP + HDR + MALE, PCB_TOP + HDR + MALE + 1.6, blue),
    stand("heatsink", *pr(9, 27, 25, 42), PCB_TOP + HDR + MALE + 1.6, PCB_TOP + 17.2, grey),
    stand("hr_module", *pr(12, 1.08, 32, 16.08), PCB_TOP + HDR + STACK + MALE, PCB_TOP + HDR + STACK + MALE + 1.6, red),
    stand("fg_module", *pr(33, 2.5, 57.1, 12.7), PCB_TOP + HDR + MALE, PCB_TOP + HDR + MALE + 1.6, red),
    stand("battery", *ir(0.3, 1.0, 50.3, 34.0), FLOOR, FLOOR + 5, (0.8, 0.7, 0.2, 1)),
    stand("tp4056", *ir(0.2, 48.2, 28.2, 65.2), FLOOR, FLOOR + 4.5, (0.1, 0.3, 0.7, 1)),
    stand("mt3608", *ir(31.2, 48.2, 67.2, 66.2), FLOOR, FLOOR + 6, (0.1, 0.4, 0.8, 1)),
]
for ob, c in [(base, (0.85, 0.85, 0.88, 1)), (shelf, (0.95, 0.75, 0.4, 1)), (lid, (0.9, 0.9, 0.95, 1)),
              (plunger, (0.9, 0.2, 0.2, 1)), (clip, (0.3, 0.3, 0.3, 1))]:
    ob.color = c

sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.color_type = "OBJECT"; sc.display.shading.light = "STUDIO"
sc.display.shading.show_cavity = True
sc.render.resolution_x, sc.render.resolution_y = 1600, 1200
sc.render.film_transparent = False
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); col.objects.link(cam); sc.camera = cam
cam.data.lens = 50
def shot(name, loc, target, hide=()):
    cam.location = loc
    d = [target[i] - loc[i] for i in range(3)]
    cam.rotation_euler = (math.atan2(math.hypot(d[0], d[1]), -d[2]), 0, math.atan2(d[1], d[0]) - math.pi / 2)
    for ob in bpy.data.objects: ob.hide_render = ob.name in hide
    sc.render.filepath = os.path.join(OUT, name + ".png"); bpy.ops.render.render(write_still=True)
center = (OUT_U / 2, -OUT_V / 2, 18)
# 1. exploded: lift lid, plunger and shelf content upwards
lid.location.z += 45; plunger.location.z += 45
shelf.location.z += 20
for ob in parts:
    if ob.name in ("pcb", "devkit", "heatsink", "hr_module", "fg_module"): ob.location.z += 22
clip.location = (22, 0, -30); clip.rotation_euler = (0, 0, 0)
shot("Wearable_Enclosure_Exploded", (190, -230, 170), (37, -37, 30))
# 2. assembled, lid on
lid.location.z -= 45; plunger.location.z -= 45; shelf.location.z -= 20
for ob in parts:
    if ob.location.z > 1: ob.location.z -= 22
shot("Wearable_Enclosure_Closed", (150, -190, 150), center, hide=("clip",))
# 3. power deck, lid/shelf/PCB hidden
shot("Wearable_Enclosure_PowerDeck", (37, -110, 150), (37, -37, 0),
     hide=("lid", "plunger", "shelf", "pcb", "devkit", "heatsink", "hr_module", "fg_module", "clip"))
cam.data.type = "ORTHO"; cam.data.ortho_scale = 90
cam.location = (OUT_U / 2, -OUT_V / 2, 200); cam.rotation_euler = (0, 0, 0)
for ob in bpy.data.objects: ob.hide_render = ob.name not in ("base", "cam")
sc.render.filepath = os.path.join(OUT, "Wearable_Base_TopView.png"); bpy.ops.render.render(write_still=True)
print("done")
