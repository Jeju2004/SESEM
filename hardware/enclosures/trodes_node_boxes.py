# TroDes beacon and door-node enclosures - parametric model for Blender 4.5 (run headless):
#   blender -b --python trodes_node_boxes.py -- <output_dir>
# Units: 1 Blender unit = 1 mm. For each node: a base (walls, board posts, keyhole slots for a
# wall screw, USB-C opening) and a snap-on lid (engraved label, hold-down pins, vents).
# Beacons: optional status-LED hole. Door node: cable notch for the reed-switch wires.
#
# Board: 5 x 7 cm perfboard (50 x 70 mm, 18 x 24 holes, 2.54 mm pitch), portrait, ESP32 DevKitC
# soldered DIRECTLY by its own pins in columns 1 and 11, rows 4-22, antenna end up, USB-C down
# (see "Beacon Node Perfboard Build" / "Door Node Perfboard Layout").
# Plan-view coordinates: u = right, v = down from the top (antenna) edge, z = up.
import bpy, bmesh, math, os, sys, struct

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.getcwd()

# ---------------- parameters (mm) ----------------------------------------------------------
WALL, FLOOR, LID_T = 2.0, 2.0, 2.0
BW, BH, BT = 50.0, 70.0, 1.6              # perfboard
GAP = 0.5                                  # board-to-wall clearance
IN_U, IN_V = BW + 2 * GAP, BH + 2 * GAP
OUT_U, OUT_V = IN_U + 2 * WALL, IN_V + 2 * WALL
B0 = WALL + GAP                            # board top-left corner in plan view
POST_H = 6.0                               # ESP32 pins stick out ~4.4 mm under the board
BOARD_BOT = FLOOR + POST_H                 # 8.0
BOARD_TOP = BOARD_BOT + BT                 # 9.6
DEV_TOP = BOARD_TOP + 2.5 + 1.6            # devkit on its own header plastic: 13.7
LID_IN = BOARD_TOP + 14.5                  # 24.1: room for an ESP32 heatsink (5 mm + pad) with 1.8 mm spare
LID_TOP = LID_IN + LID_T                   # 24.0
LIP_H, LIP_T, LIP_GAP = 2.5, 1.2, 0.3        # 0.3 mm/side: PETG prints slightly tight
BUMP = 0.7

PITCH = 2.54
HX0 = (BW - 17 * PITCH) / 2                # first hole column from the board's left edge (3.41)
HY0 = (BH - 23 * PITCH) / 2                # first hole row from the board's top edge (5.79)
def H(col, row):                           # hole (col, row) -> plan view
    return (B0 + HX0 + col * PITCH, B0 + HY0 + row * PITCH)
def Bd(x, y):                              # board coordinates -> plan view
    return (B0 + x, B0 + y)
DEV_CX = (H(1, 0)[0] + H(11, 0)[0]) / 2   # devkit centre line (u)
USB_Z = DEV_TOP + 1.6                      # USB-C port centre height

NODES = [
    dict(name="Beacon_B1", big="B1", small="BEDROOM WING", led=True, door=False),
    dict(name="Beacon_B2", big="B2", small="DINING HALL", led=True, door=False),
    dict(name="Beacon_B3", big="B3", small="MEDICINE ROOM", led=True, door=False),
    dict(name="DoorNode_D11", big="DOOR", small="MEDICINE ROOM", led=False, door=True),
]

# ---------------- mesh helpers (same as the wearable model) --------------------------------
col = bpy.context.scene.collection
def signed_volume(bm):
    v = 0.0
    for f in bm.faces:
        cs = [l.vert.co for l in f.loops]
        for k in range(1, len(cs) - 1):
            v += cs[0].dot(cs[k].cross(cs[k + 1])) / 6.0
    return v
def new_obj(name, bm):
    if signed_volume(bm) < 0:   # the v -> -Y mirror turns boxes inside-out; EXACT booleans then fail
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
def cyl(name, u, v, z0, z1, r, seg=48):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=z1 - z0)
    for vt in bm.verts:
        vt.co.x += u; vt.co.y += -v; vt.co.z += (z0 + z1) / 2
    return new_obj(name, bm)
def boolean(target, cutters, op):
    if op == "UNION" and len(cutters) > 1:
        for c in cutters: boolean(target, [c], op)
        return
    tmp = bpy.data.collections.new("cut_" + target.name)
    bpy.context.scene.collection.children.link(tmp)
    for c in cutters:
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
FONT_FILE = "C:/Windows/Fonts/arialbd.ttf"      # clear "1" (Blender's default font draws it like "I")
_font = None
def text_cutter(name, s, u, v, z0, size, depth):
    global _font
    cu = bpy.data.curves.new(name, "FONT"); cu.body = s; cu.size = size; cu.extrude = depth / 2
    try:
        if _font is None: _font = bpy.data.fonts.load(FONT_FILE)
        cu.font = _font
    except Exception as e:
        print("font not loaded, default used:", e)
    cu.align_x = "CENTER"; cu.align_y = "CENTER"
    ob = bpy.data.objects.new(name, cu); col.objects.link(ob)
    ob.location = (u, -v, z0 + depth / 2)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    mo = bpy.data.objects.new(name + "_m", me); col.objects.link(mo)
    me.transform(ob.matrix_world)
    bpy.data.objects.remove(ob, do_unlink=True)
    return mo

CORNERS = [Bd(2.5, 2.5), Bd(BW - 2.5, 2.5), Bd(2.5, BH - 2.5), Bd(BW - 2.5, BH - 2.5)]

def make_base(n):
    base = box(n["name"] + "_Base", 0, OUT_U, 0, OUT_V, 0, LID_IN)
    boolean(base, [box("cav", WALL, WALL + IN_U, WALL, WALL + IN_V, FLOOR, LID_IN + 1)], "DIFFERENCE")
    boolean(base, [cyl("post", u, v, FLOOR - 0.05, BOARD_BOT, 2.5) for u, v in CORNERS], "UNION")
    cuts = []
    # USB-C opening in the bottom wall: 15 x 9 mm, 1.3 mm spare round a USB-C plug overmold (12.35 x 6.5)
    cuts.append(box("usb", DEV_CX - 7.5, DEV_CX + 7.5, OUT_V - WALL - 1, OUT_V + 1, USB_Z - 4.5, USB_Z + 4.5))
    # snap grooves for the lid (left and right walls)
    for u0, u1 in ((WALL - 0.6, WALL + 0.01), (WALL + IN_U - 0.01, WALL + IN_U + 0.6)):
        cuts.append(box("groove", u0, u1, 22, 52, LID_IN - 2.0, LID_IN - 0.9))
    # two keyhole slots in the floor for one wall screw (head <= 7.5 mm): drop the box over the
    # head through the big hole, slide it down; the screw ends up at the top of the slot
    for kv in (22.0, 56.0):
        cuts.append(cyl("key_big", OUT_U / 2, kv, -1, FLOOR + 1, 4.2))
        cuts.append(box("key_slot", OUT_U / 2 - 1.9, OUT_U / 2 + 1.9, kv - 9.0, kv, -1, FLOOR + 1))
        cuts.append(cyl("key_end", OUT_U / 2, kv - 9.0, -1, FLOOR + 1, 1.9))
    if n["door"]:
        # reed-switch cable: open-top notch in the right wall beside the screw terminal J1
        jv = (H(14, 12)[1] + H(14, 14)[1]) / 2
        cuts.append(box("cable", OUT_U - WALL - 1, OUT_U + 1, jv - 3.0, jv + 3.0, BOARD_TOP + 2.0, LID_IN + 1))
    boolean(base, cuts, "DIFFERENCE")
    return base

def make_lid(n):
    lid = box(n["name"] + "_Lid", 0, OUT_U, 0, OUT_V, LID_IN, LID_TOP)
    o0u, o1u = WALL + LIP_GAP, WALL + IN_U - LIP_GAP
    o0v, o1v = WALL + LIP_GAP, WALL + IN_V - LIP_GAP
    z0 = LID_IN - LIP_H
    adds = [box("lip_l", o0u, o0u + LIP_T, o0v, o1v, z0, LID_IN + 0.01),
            box("lip_r", o1u - LIP_T, o1u, o0v, o1v, z0, LID_IN + 0.01),
            box("lip_t", o0u, o1u, o0v, o0v + LIP_T, z0, LID_IN + 0.01),
            box("lip_b", o0u, o1u, o1v - LIP_T, o1v, z0, LID_IN + 0.01),
            box("bump_l", o0u - BUMP, o0u + 0.01, 23, 51, LID_IN - 1.8, LID_IN - 1.1),
            box("bump_r", o1u - 0.01, o1u + BUMP, 23, 51, LID_IN - 1.8, LID_IN - 1.1)]
    # hold-down pins: press the board corners onto the posts (0.3 mm gap)
    adds += [cyl("hold", u, v, BOARD_TOP + 0.3, LID_IN + 0.01, 2.0) for u, v in CORNERS]
    boolean(lid, adds, "UNION")
    cuts = []
    if n["door"]:   # the cable notch continues through the lid lip on that side
        jv = (H(14, 12)[1] + H(14, 14)[1]) / 2
        cuts.append(box("cable_lip", o1u - LIP_T - 0.5, o1u + 1, jv - 3.0, jv + 3.0, z0 - 1, LID_IN - 0.01))
    if n["led"]:
        lu, lv = H(15, 19.5)
        cuts.append(cyl("led_hole", lu, lv, LID_IN - 1, LID_TOP + 1, 2.6))
    for k in range(4):   # vents over the ESP32 module (away from the antenna tip)
        u = DEV_CX - 6 + k * 4
        cuts.append(box("vent", u - 0.8, u + 0.8, Bd(0, 16)[1], Bd(0, 30)[1], LID_IN - 1, LID_TOP + 1))
    try:
        cuts.append(text_cutter("t_up", "UP", OUT_U / 2, 7.5, LID_TOP - 0.6, 4.0, 1.2))
        cuts.append(text_cutter("t_big", n["big"], OUT_U / 2, 44.0, LID_TOP - 0.6, 10.0 if len(n["big"]) <= 2 else 8.0, 1.2))
        cuts.append(text_cutter("t_small", n["small"], OUT_U / 2, 55.0, LID_TOP - 0.6, 3.6, 1.2))
        cuts.append(text_cutter("t_brand", "TroDes", OUT_U / 2 - (8 if n["led"] else 0), 69.5, LID_TOP - 0.6, 3.6, 1.2))
    except Exception as e:
        print("text engraving skipped:", e)
    boolean(lid, cuts, "DIFFERENCE")
    return lid

# ---------------- STL export -----------------------------------------------------------------
def write_stl(ob, path, orient="as_is"):
    dg = bpy.context.evaluated_depsgraph_get(); me = ob.evaluated_get(dg).to_mesh()
    me.calc_loop_triangles()
    R = {"as_is": lambda x, y, z: (x, y, z), "flip": lambda x, y, z: (x, -y, -z)}[orient]
    tris = [[R(*me.vertices[i].co) for i in t.vertices] for t in me.loop_triangles]
    ns = [R(*t.normal) for t in me.loop_triangles]
    z0 = min(v[2] for t in tris for v in t)
    with open(path, "wb") as f:
        f.write(b"TroDes node enclosure".ljust(80, b" ")); f.write(struct.pack("<I", len(tris)))
        for t, n in zip(tris, ns):
            f.write(struct.pack("<3f", *n))
            for v in t: f.write(struct.pack("<3f", v[0], v[1], v[2] - z0))
            f.write(bytes(2))
    ob.evaluated_get(dg).to_mesh_clear()
    return os.path.getsize(path)

os.makedirs(OUT, exist_ok=True)
built = {}
for n in NODES:
    b = make_base(n); l = make_lid(n)
    print("STL", n["name"], "base", write_stl(b, os.path.join(OUT, n["name"] + "_Base.stl")),
          "lid", write_stl(l, os.path.join(OUT, n["name"] + "_Lid_print_upside_down.stl"), "flip"))
    built[n["name"]] = (b, l)

# ---------------- preview renders (beacon B1 and the door node) -------------------------------
for name, (b, l) in built.items():
    if name not in ("Beacon_B1", "DoorNode_D11"):
        for o in (b, l): o.hide_render = True
def stand(name, u0, u1, v0, v1, z0, z1, rgba):
    o = box(name, u0, u1, v0, v1, z0, z1); o.color = rgba; return o
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.color_type = "OBJECT"; sc.display.shading.light = "STUDIO"; sc.display.shading.show_cavity = True
sc.render.resolution_x, sc.render.resolution_y = 1600, 1200
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); col.objects.link(cam); sc.camera = cam
def shot(fname, loc, target):
    cam.location = loc
    d = [target[i] - loc[i] for i in range(3)]
    cam.rotation_euler = (math.atan2(math.hypot(d[0], d[1]), -d[2]), 0, math.atan2(d[1], d[0]) - math.pi / 2)
    sc.render.filepath = os.path.join(OUT, fname); bpy.ops.render.render(write_still=True)
for name, dx in (("Beacon_B1", 0.0), ("DoorNode_D11", 80.0)):
    b, l = built[name]
    b.location.x += dx; l.location.x += dx; l.location.z += 30
    b.color = (0.88, 0.88, 0.9, 1); l.color = (0.93, 0.93, 0.96, 1)
    pcb = stand(name + "_pcb", B0 + dx, B0 + BW + dx, B0, B0 + BH, BOARD_BOT + 12, BOARD_TOP + 12, (0.15, 0.45, 0.2, 1))
    dev = stand(name + "_dev", DEV_CX - 14 + dx, DEV_CX + 14 + dx, Bd(0, 8.94)[1], Bd(0, 63.93)[1], BOARD_TOP + 2.5 + 12, DEV_TOP + 12, (0.1, 0.2, 0.55, 1))
    if name.startswith("Door"):
        ju, jv = H(14, 13)
        stand(name + "_j1", ju - 3.8 + dx, ju + 4.5 + dx, jv - 5, jv + 5, DEV_TOP + 12 - 4.1, DEV_TOP + 12 + 6, (0.1, 0.35, 0.8, 1))
shot("Node_Enclosures_Exploded.png", (150, -150, 120), (60, -37, 20))
for o in bpy.data.objects:
    if o.name.endswith(("_pcb", "_dev", "_j1")): o.hide_render = True
for name, dx in (("Beacon_B1", 0.0), ("DoorNode_D11", 80.0)):
    built[name][1].location.z -= 30
shot("Node_Enclosures_Closed.png", (150, -160, 110), (60, -37, 10))
print("done")
