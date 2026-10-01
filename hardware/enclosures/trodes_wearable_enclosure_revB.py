# TroDes wearable enclosure, Rev B (30 Sep 2026) - parametric model for Blender 4.5, run headless:
#   blender -b --python trodes_wearable_enclosure_revB.py -- <output_dir>
# Units: 1 Blender unit = 1 mm. Parts: base, shelf, lid, SOS plunger, sliding belt clip.
# Exports one STL per part (already in print orientation), preview PNGs, and prints fit checks.
#
# Changes from Rev A (trodes_wearable_enclosure.py), requested by the team on 30 Sep 2026:
#   1. +5 mm height: the power-module wiring lifts the PCB 5 mm (WIRE_RISE). The PCB posts are
#      5 mm taller and the shelf is open over the TP4056 and MT3608 so the wiring has room.
#   2. Lid latch: four cantilever snap hooks on the lid click into windows in the side walls
#      (the team's sketch), replacing the bump-and-groove snap.
#   3. ESP32 USB-C opening raised with the PCB, and 2 mm taller for tolerance (15 x 11 mm).
#   4. TP4056 charge light: a window in the left wall just above the charging port looks into
#      the TP4056 bay through the open shelf.
#   5. Rounded outside corners and edges; chamfered SOS/LED holes; rounded finger window.
#      Hole centres and sizes (heart-rate window, SOS, LED D2, buzzer) are unchanged.
#   6. Power switch position unchanged (same hole, same height).
#   7. Belt clip slides onto a dovetail rail on the back (like a fan's control module) and
#      clicks into a detent - no screws.
#
# Plan-view coordinates: u = right, v = down (same as the KiCad PCB view), z = up.
# Worn on the belt with the top edge (v = 0) up: the clip slides in from below and stops at the
# top; the device's weight keeps it seated.
import bpy, bmesh, math, os, sys, struct

for _o in list(bpy.data.objects):      # start from an empty scene (drop the default cube, light, camera)
    bpy.data.objects.remove(_o, do_unlink=True)
OUT =sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.getcwd()

# ---------------- parameters (mm) ----------------------------------------------------------
WALL, FLOOR, LID_T = 2.0, 2.0, 2.0
IN_U, IN_V = 70.0, 70.0                  # cavity: PCB 69 + 1 clearance; 66 + 0.5 + 3.5 wire channel
OUT_U, OUT_V = IN_U + 2 * WALL, IN_V + 2 * WALL
PCB_U0, PCB_V0 = WALL + 0.5, WALL + 0.5  # PCB top-left corner
DECK_TOP = 11.0                          # power compartment: floor 2 + 9 clear (toggle body 7.8)
SHELF_T = 1.2
WIRE_RISE = 5.0                          # measured by the team 30 Sep: wiring lifts the PCB 5 mm
POST_H = 2.5 + WIRE_RISE                 # 7.5 mm wiring space between shelf and PCB
PCB_BOT = DECK_TOP + SHELF_T + POST_H    # 19.7
PCB_TOP = PCB_BOT + 1.6                  # 21.3
HDR, MALE = 5.0, 2.5
STACK = 8.5
SW2_H = 13.0
CLEAR_TOP = 19.5
LID_IN = PCB_TOP + CLEAR_TOP             # 40.8
LID_TOP = LID_IN + LID_T                 # 42.8
LIP_H, LIP_T, LIP_GAP = 3.0, 1.2, 0.3
CORNER_R, IN_R = 4.0, 0.8                # outside corner radius; cavity corner radius (PCB corners clear)
LID_EDGE_R = 1.6                         # rounded top edge of the lid (printable profile)
SEAM_CH, BOT_CH = 0.5, 1.0               # chamfers: base top edge at the seam, base bottom edge

# lid snap hooks (cantilever, PETG): deflection 0.7 mm over ~10 mm -> about 1.5 % strain
ARM_W, ARM_T, ARM_L, ARM_GAP = 8.0, 1.5, 13.0, LIP_GAP
BARB, RAMP_H, LAND = 1.0, 2.0, 0.8       # barb: 1.0 mm out (0.7 into the 2 mm wall), 2 mm lead-in ramp
ARMS = [("L", 26.0), ("L", 48.0), ("R", 18.0), ("R", 53.0)]   # wall, v centre (clear of C1, C3, USB-C)
Z_TIP = LID_IN - ARM_L                   # 27.8
Z_CATCH = Z_TIP + RAMP_H + LAND          # 30.6: top face of the barb
WIN_Z0, WIN_Z1 = Z_TIP + 0.4, Z_CATCH + 0.1

# back plate and dovetail (belt clip rail slides in along v from the bottom edge)
BACK_T = 3.0                             # added under the floor
DT_HALF, DT_CEIL = 9.0, -0.4             # channel half-width at the back face; channel ceiling z
DT_SLOPE = 1 / math.tan(math.radians(60))   # 60-degree dovetail flanks
DT_STOP = 10.0                           # top end of the channel (45-degree stop face)
DT_CLR, DT_TOP_CLR, CLIP_GAP = 0.3, 0.35, 0.4
CU = OUT_U / 2                           # channel centre line, u = 37
DET_V = 68.0                             # detent position (bump centre when fully inserted)
ch_half = lambda z: DT_HALF + (z + BACK_T) * DT_SLOPE

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
    if signed_volume(bm) < 0:        # inside-out meshes make the EXACT solver silently fail
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
def cyl(name, u, v, z0, z1, r, r_top=None, seg=64):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r,
                          radius2=r if r_top is None else r_top, depth=z1 - z0)
    for vt in bm.verts:
        vt.co.x += u; vt.co.y -= v; vt.co.z += (z0 + z1) / 2
    return new_obj(name, bm)
def to3d(axis, a, p):
    if axis == "z": return (p[0], -p[1], a)      # p = (u, v)
    if axis == "u": return (a, -p[0], p[1])      # p = (v, z)
    return (p[0], -a, p[1])                      # axis v: p = (u, z)
def loft(name, rings):
    """rings: list of (axis, a, [2-D points]) with equal point counts -> closed solid."""
    bm = bmesh.new()
    vs = [[bm.verts.new(to3d(ax, a, p)) for p in pts] for ax, a, pts in rings]
    n = len(vs[0])
    for r0, r1 in zip(vs, vs[1:]):
        for k in range(n):
            bm.faces.new((r0[k], r0[(k + 1) % n], r1[(k + 1) % n], r1[k]))
    caps = [bm.faces.new(list(reversed(vs[0]))), bm.faces.new(vs[-1])]
    bmesh.ops.triangulate(bm, faces=caps, quad_method="BEAUTY", ngon_method="EAR_CLIP")
    return new_obj(name, bm)
def prism(name, axis, a0, a1, pts):
    return loft(name, [(axis, a0, pts), (axis, a1, pts)])
def rr_pts(x0, x1, y0, y1, r, seg=10):
    r = max(0.0, min(r, (x1 - x0) / 2 - 1e-3, (y1 - y0) / 2 - 1e-3))
    pts = []
    for cx, cy, a0 in ((x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180), (x1 - r, y0 + r, 270)):
        for k in range(seg + 1):
            a = math.radians(a0 + 90 * k / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts
def rslab(name, u0, u1, v0, v1, r, prof):
    """Rounded-rectangle solid; prof = [(z, inset), ...] bottom to top (edge chamfers/rounds)."""
    return loft(name, [("z", z, rr_pts(u0 + i, u1 - i, v0 + i, v1 - i, r - i)) for z, i in prof])
def rr_open(name, axis, a0, a1, x0, x1, y0, y1, r):
    """Rounded-rectangle opening through a wall; axis 'u' -> (v, z) rectangle, 'v' -> (u, z)."""
    return prism(name, axis, a0, a1, rr_pts(x0, x1, y0, y1, r))
def corner_round(name, uc, vc, su, sv, r, z0, z1):
    """Cutter that rounds a plan-view corner at (uc, vc); the part lies toward (su, sv)."""
    cu_, cv_ = uc + su * r, vc + sv * r
    pts = [(uc - su * 0.5, vc - sv * 0.5), (cu_, vc - sv * 0.5)]
    a0, a1 = math.atan2(-sv, 0), math.atan2(0, -su)
    if a1 - a0 > math.pi: a1 -= 2 * math.pi
    if a0 - a1 > math.pi: a1 += 2 * math.pi
    for k in range(13):
        a = a0 + (a1 - a0) * k / 12
        pts.append((cu_ + r * math.cos(a), cv_ + r * math.sin(a)))
    pts.append((uc - su * 0.5, cv_))
    return prism(name, "z", z0, z1, pts)
def corner_chamfer(name, uc, vc, su, sv, c, z0, z1):
    pts = [(uc - su * 0.5, vc - sv * 0.5), (uc + su * (c + 0.5), vc - sv * 0.5), (uc - su * 0.5, vc + sv * (c + 0.5))]
    return prism(name, "z", z0, z1, pts)
def apply_tf(ob):
    bpy.context.view_layer.update()
    ob.data.transform(ob.matrix_world); ob.matrix_world.identity()
    ob.location = (0, 0, 0); ob.rotation_euler = (0, 0, 0)
def boolean(target, cutters, op):
    if op in ("UNION", "INTERSECT") and len(cutters) > 1:
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
def mesh_volume(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data); v = bm.calc_volume(signed=False); bm.free(); return v
def open_edges(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data); n = sum(1 for e in bm.edges if not e.is_manifold); bm.free(); return n
def clean(ob):
    """Remove zero-thickness internal sheets the boolean solver sometimes leaves: pairs of faces
    on the same vertices (back to back), then loose geometry."""
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    seen, kill = {}, set()
    for f in bm.faces:
        key = tuple(sorted(v.index for v in f.verts))
        if key in seen: kill.update((f, seen[key]))
        else: seen[key] = f
    bmesh.ops.delete(bm, geom=list(kill), context="FACES_ONLY")
    loose = [e for e in bm.edges if not e.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="EDGES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_edges], context="VERTS")
    bm.to_mesh(ob.data); bm.free(); return len(kill)
def dup(ob, name):
    o = bpy.data.objects.new(name, ob.data.copy()); col.objects.link(o); o.matrix_world = ob.matrix_world.copy(); return o
def overlap(a, b):
    A, B = dup(a, "chkA"), dup(b, "chkB")
    boolean(A, [B], "INTERSECT")
    v = mesh_volume(A); bpy.data.objects.remove(A, do_unlink=True); return v

# ---------------- base: shell, back plate, power-deck compartments --------------------------
base = rslab("base", 0, OUT_U, 0, OUT_V, CORNER_R,
             [(-BACK_T, BOT_CH), (-BACK_T + BOT_CH, 0.0), (LID_IN - SEAM_CH, 0.0), (LID_IN, SEAM_CH)])
boolean(base, [rslab("cav", WALL, WALL + IN_U, WALL, WALL + IN_V, IN_R, [(FLOOR, 0.0), (LID_IN + 1, 0.0)])], "DIFFERENCE")
adds = []
adds.append(box("div_y", WALL - 0.05, WALL + IN_U + 0.05, I(0, 46.4)[1], I(0, 47.6)[1], FLOOR - 0.05, DECK_TOP))
adds.append(box("div_c3c4", I(29.2, 0)[0], I(30.4, 0)[0], I(0, 47.6)[1], I(0, 70.05)[1], FLOOR - 0.05, DECK_TOP))
adds.append(box("div_c1c2", I(51.2, 0)[0], I(52.4, 0)[0], I(0, -0.05)[1], I(0, 46.4)[1], FLOOR - 0.05, DECK_TOP))
adds.append(box("rim_batt", I(-0.05, 0)[0], I(50, 0)[0], I(0, 35.0)[1], I(0, 36.2)[1], FLOOR - 0.05, FLOOR + 3))
adds.append(box("rim_tp_bot", I(-0.05, 0)[0], I(29.2, 0)[0], I(0, 66.0)[1], I(0, 67.2)[1], FLOOR - 0.05, FLOOR + 3))
adds.append(box("rim_mt_right", I(68.0, 0)[0], I(69.2, 0)[0], I(0, 47.6)[1], I(0, 67.0)[1], FLOOR - 0.05, FLOOR + 3))
adds.append(box("rim_mt_bot", I(30.4, 0)[0], I(70.05, 0)[0], I(0, 67.0)[1], I(0, 68.2)[1], FLOOR - 0.05, FLOOR + 3))
# shelf ledges; the left ledge stops at the TP4056 bay (the shelf is open there for the charge light)
adds.append(box("ledge_l", WALL - 0.05, WALL + 1.5, WALL, I(0, 47.6)[1], DECK_TOP - 1.2, DECK_TOP))
adds.append(box("ledge_t", WALL - 0.05, WALL + IN_U + 0.05, WALL - 0.05, WALL + 1.5, DECK_TOP - 1.2, DECK_TOP))
adds.append(box("ledge_r1", WALL + IN_U - 1.5, WALL + IN_U + 0.05, WALL, I(0, 32)[1], DECK_TOP - 1.2, DECK_TOP))
adds.append(box("ledge_r2", WALL + IN_U - 1.5, WALL + IN_U + 0.05, I(0, 50)[1], I(0, 66.5)[1], DECK_TOP - 1.2, DECK_TOP))
adds.append(box("ledge_b", WALL - 0.05, WALL + IN_U + 0.05, I(0, 65.0)[1], I(0, 66.3)[1], DECK_TOP - 1.2, DECK_TOP))
boolean(base, adds, "UNION")

cuts = []
cuts.append(box("n1", I(10, 0)[0], I(16, 0)[0], I(0, 46.0)[1], I(0, 48.0)[1], DECK_TOP - 4, DECK_TOP + 1))
cuts.append(box("n2", I(60, 0)[0], I(66, 0)[0], I(0, 46.0)[1], I(0, 48.0)[1], DECK_TOP - 4, DECK_TOP + 1))
cuts.append(box("n3", I(28.8, 0)[0], I(30.8, 0)[0], I(0, 52)[1], I(0, 58)[1], DECK_TOP - 4, DECK_TOP + 1))
cuts.append(box("n4", I(50.8, 0)[0], I(52.8, 0)[0], I(0, 20)[1], I(0, 26)[1], DECK_TOP - 4, DECK_TOP + 1))
# ESP32 USB-C: follows the PCB (+5 mm); 15 x 11 mm = Rev A's 15 x 9 plus 1 mm up and down for
# the build-to-build variation in how high the wiring lifts the board
usb_v = P(0, 34.3)[1]; usb_z = PCB_TOP + HDR + MALE + 1.6 + 1.5
cuts.append(rr_open("usb_esp32", "u", OUT_U - WALL - 1, OUT_U + 1, usb_v - 7.5, usb_v + 7.5, usb_z - 5.5, usb_z + 5.5, 1.5))
# TP4056 USB-C charging port: unchanged size and place (13 x 8 mm), corners rounded
tp_v = I(0, 56.8)[1]
cuts.append(rr_open("usb_tp4056", "u", -1, WALL + 1, tp_v - 6.5, tp_v + 6.5, FLOOR - 0.5, FLOOR + 7.5, 1.5))
# TP4056 charge light: 12 x 5.8 mm window 1.5 mm above the charging port, looking into the bay
LIGHT_Z0, LIGHT_Z1 = FLOOR + 9.0, FLOOR + 14.8
cuts.append(rr_open("charge_light", "u", -1, WALL + 1, tp_v - 6.0, tp_v + 6.0, LIGHT_Z0, LIGHT_Z1, 1.5))
# power toggle: exactly as Rev A
bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=3.2, radius2=3.2, depth=WALL + 2)
tg = new_obj("toggle_hole", bm); tg.rotation_euler = (0, math.radians(90), 0)
tg.location = (OUT_U - WALL / 2, -I(0, 40)[1], FLOOR + 4.5); cuts.append(tg)
# latch windows for the lid's snap hooks
for side, vc in ARMS:
    u0, u1 = (-1, WALL + 0.5) if side == "L" else (OUT_U - WALL - 0.5, OUT_U + 1)
    cuts.append(rr_open("latch_win", "u", u0, u1, vc - ARM_W / 2 - DT_CLR, vc + ARM_W / 2 + DT_CLR, WIN_Z0, WIN_Z1, 0.5))
# pry notch at the top edge (lift the lid there after releasing the hooks)
cuts.append(rr_open("pry", "v", -1, 1.0, CU - 6, CU + 6, LID_IN - 1.5, LID_IN + 1, 0.8))
boolean(base, cuts, "DIFFERENCE")
# dovetail channel in the back plate: open at the bottom edge, 45-degree stop at the top
chan = prism("chan", "v", DT_STOP - 1, OUT_V + 1,
             [(CU - ch_half(-BACK_T - 0.1), -BACK_T - 0.1), (CU + ch_half(-BACK_T - 0.1), -BACK_T - 0.1),
              (CU + ch_half(DT_CEIL), DT_CEIL), (CU - ch_half(DT_CEIL), DT_CEIL)])
stop_line = lambda z: DT_STOP + (z + BACK_T)
boolean(chan, [prism("stop", "u", CU - 15, CU + 15,
                     [(DT_STOP - 2, -BACK_T - 0.2), (stop_line(-BACK_T - 0.2), -BACK_T - 0.2),
                      (stop_line(DT_CEIL + 0.1), DT_CEIL + 0.1), (DT_STOP - 2, DT_CEIL + 0.1)])], "DIFFERENCE")
groove = prism("detent_groove", "u", CU - 3.5, CU + 3.5,
               [(DET_V - 1.4, DT_CEIL - 0.05), (DET_V + 1.4, DT_CEIL - 0.05), (DET_V + 0.4, DT_CEIL + 1.0), (DET_V - 0.4, DT_CEIL + 1.0)])
boolean(base, [chan, groove], "DIFFERENCE")

# ---------------- shelf: battery cover + PCB posts, open over the TP4056 and MT3608 ---------
shelf = box("shelf", WALL + 0.4, WALL + IN_U - 0.4, WALL + 0.4, I(0, 66.3)[1], DECK_TOP, DECK_TOP + SHELF_T)
boolean(shelf, [box("tp_open", -1, I(28.8, 0)[0], I(0, 48.4)[1], I(0, 64.8)[1], DECK_TOP - 1, DECK_TOP + 3),
                box("mt_open", I(40.0, 0)[0], I(68.4, 0)[0], I(0, 48.8)[1], I(0, 64.8)[1], DECK_TOP - 1, DECK_TOP + 3)], "DIFFERENCE")
# centre strip over the TP/MT divider carries the post under the SOS switch; 2.4 mm thick
strip = box("strip", I(28.8, 0)[0], I(40.0, 0)[0], I(0, 47.6)[1], I(0, 66.3)[1], DECK_TOP + SHELF_T - 0.01, DECK_TOP + 2 * SHELF_T)
posts = [(20, 34), (50, 34), (35.5, 59.3), (64, 35), (6, 16), (33.5, 7)]   # PCB coordinates, clear of pads
boolean(shelf, [strip] + [cyl("post", *P(x, y), DECK_TOP + SHELF_T - 0.01, PCB_BOT, 3.0, r_top=2.0) for x, y in posts], "UNION")

# ---------------- lid: rounded plate, lip, four snap hooks ---------------------------------
lid_prof = [(LID_IN, 0.0), (LID_TOP - LID_EDGE_R, 0.0)]
for deg in (15, 30, 45):                  # round, then 45 degrees at the bed (prints without droop)
    f = math.radians(deg)
    lid_prof.append((LID_TOP - LID_EDGE_R + LID_EDGE_R * math.sin(f), LID_EDGE_R * (1 - math.cos(f))))
lid_prof.append((LID_TOP, 2 * LID_EDGE_R * (1 - math.cos(math.radians(45)))))
lid = rslab("lid", 0, OUT_U, 0, OUT_V, CORNER_R, lid_prof)
lz0 = LID_IN - LIP_H
o0, o1 = WALL + LIP_GAP, WALL + IN_U - LIP_GAP
i0, i1 = o0 + LIP_T, o1 - LIP_T
def lip_segments(side):
    slots = sorted(vc for s, vc in ARMS if s == side)
    edges, v = [], o0
    for vc in slots:
        edges.append((v, vc - ARM_W / 2 - 1.0)); v = vc + ARM_W / 2 + 1.0
    edges.append((v, o1))
    return edges
lip = [box("lip_l", o0, i0, a, b, lz0, LID_IN + 0.01) for a, b in lip_segments("L")]
lip += [box("lip_r", i1, o1, a, b, lz0, LID_IN + 0.01) for a, b in lip_segments("R")]
lip.append(box("lip_b", o0, o1, i1, o1, lz0, LID_IN + 0.01))
for side, vc in ARMS:
    m = (lambda u: u) if side == "L" else (lambda u: OUT_U - u)
    ua = WALL + ARM_GAP                  # outer face of the hook (toward the wall)
    ui = ua + ARM_T
    lo, hi = sorted((m(ua), m(ui)))
    lip.append(box("arm", lo, hi, vc - ARM_W / 2, vc + ARM_W / 2, Z_TIP, LID_IN + 0.01))
    lip.append(prism("barb", "v", vc - ARM_W / 2, vc + ARM_W / 2,
                     [(m(ua + 0.05), Z_TIP), (m(ua - BARB), Z_TIP + RAMP_H), (m(ua - BARB), Z_CATCH), (m(ua + 0.05), Z_CATCH)]))
    lip.append(prism("gusset", "v", vc - ARM_W / 2, vc + ARM_W / 2,
                     [(m(ui - 0.05), LID_IN + 0.01), (m(ui + 1.0), LID_IN + 0.01), (m(ui - 0.05), LID_IN - 1.0)]))
boolean(lid, lip, "UNION")
lc = []
sos = P(35.5, 59.3); led = P(62.27, 17.5); buz = P(55.0, 59.5); hr = P(22.0, 8.58)   # unchanged
lc.append(cyl("sos_hole", *sos, LID_IN - 1, LID_TOP + 1, 5.5))
lc.append(cyl("sos_chamfer", *sos, LID_TOP - 0.8, LID_TOP + 0.01, 5.5, r_top=6.3))
lc.append(cyl("led_hole", *led, LID_IN - 1, LID_TOP + 1, 2.6))
lc.append(cyl("led_chamfer", *led, LID_TOP - 0.6, LID_TOP + 0.01, 2.6, r_top=3.2))
lc.append(cyl("buz0", *buz, LID_IN - 1, LID_TOP + 1, 0.9))
for k in range(6):
    a = k * math.pi / 3
    lc.append(cyl("buz", buz[0] + 3.5 * math.cos(a), buz[1] + 3.5 * math.sin(a), LID_IN - 1, LID_TOP + 1, 0.9))
# finger window: same 10 x 8 mm opening, corners rounded (r 2), 0.5 mm chamfer into the dish
lc.append(rslab("hr_window", hr[0] - 5, hr[0] + 5, hr[1] - 4, hr[1] + 4, 2.0, [(LID_IN - 1, 0.0), (LID_TOP + 1, 0.0)]))
lc.append(rslab("hr_window_ch", hr[0] - 5.5, hr[0] + 5.5, hr[1] - 4.5, hr[1] + 4.5, 2.5, [(LID_TOP - 1.5, 0.5), (LID_TOP - 1.0 + 0.01, 0.0)]))
lc.append(cyl("hr_dish", *hr, LID_TOP - 1.0, LID_TOP + 0.01, 6.0, r_top=10.0))
lc.append(box("hr_relief", hr[0] - 10.5, hr[0] + 10.5, hr[1] - 8.0, hr[1] + 8.0, LID_IN - 1, LID_IN + 0.4))
for u in (12.5, 15.5, 18.5, 21.5, 24.5):         # vent slots, now with round ends
    uc = PCB_U0 + u
    lc.append(rslab("vent", uc - 0.9, uc + 0.9, P(0, 28)[1], P(0, 41)[1], 0.9, [(LID_IN - 1, 0.0), (LID_TOP + 1, 0.0)]))
try:
    lc.append(text_cutter("t_sos", "SOS", sos[0], sos[1] - 9.0, LID_TOP - 0.6, 5.0, 1.2))
    lc.append(text_cutter("t_name", "TroDes", 20.0, 69.5, LID_TOP - 0.6, 4.5, 1.2))
except Exception as e:
    print("text engraving skipped:", e)
boolean(lid, lc, "DIFFERENCE")

# ---------------- SOS plunger (captive: flange under the lid) -------------------------------
z_sw = PCB_TOP + SW2_H + 0.6
plunger = cyl("plunger", *sos, z_sw, LID_IN - 1.0, 3.0)
boolean(plunger, [cyl("flange", *sos, LID_IN - 1.0, LID_IN, 6.75),
                  cyl("shaft", *sos, LID_IN - 0.01, LID_TOP + 0.7, 5.2),
                  cyl("face", *sos, LID_TOP + 0.69, LID_TOP + 1.2, 5.2, r_top=4.7)], "UNION")

# ---------------- sliding belt clip ---------------------------------------------------------
# C-profile in the (v, z) plane, extruded across u; the rail sits on the plate's inner face.
PL_IN, PL_T, BELT_GAP, TG_T = -BACK_T - CLIP_GAP, 3.0, 4.5, 2.5
PL_OUT = PL_IN - PL_T; TG_IN = PL_OUT - BELT_GAP; TG_OUT = TG_IN - TG_T
J0, J1, PL_END, TIP = 3.0, 6.5, 73.5, 62.0
CLIP_U0, CLIP_U1 = CU - 17, CU + 17
tip_c = (TIP - TG_T / 2, (TG_IN + TG_OUT) / 2)
prof = [(J0 + 1.2, PL_IN), (PL_END - 0.8, PL_IN), (PL_END, PL_IN - 0.8), (PL_END, PL_OUT + 0.8), (PL_END - 0.8, PL_OUT),
        (J1, PL_OUT), (J1, TG_IN), (55.5, TG_IN), (57.0, TG_IN + 1.2), (58.5, TG_IN)]
for k in range(13):                       # rounded tongue tip
    a = math.radians(90 - 180 * k / 12)
    prof.append((tip_c[0] + TG_T / 2 * math.cos(a), tip_c[1] + TG_T / 2 * math.sin(a)))
prof += [(J0 + 1.2, TG_OUT), (J0, TG_OUT + 1.2), (J0, PL_IN - 1.2)]
clip = prism("clip", "u", CLIP_U0, CLIP_U1, prof)
RAIL_TOP = DT_CEIL - DT_TOP_CLR
rail = prism("rail", "v", DT_STOP - 0.5, PL_END - 1.0,
             [(CU - DT_HALF + DT_CLR, PL_IN - 0.05), (CU + DT_HALF - DT_CLR, PL_IN - 0.05), (CU + DT_HALF - DT_CLR, -BACK_T),
              (CU + ch_half(RAIL_TOP) - DT_CLR, RAIL_TOP), (CU - ch_half(RAIL_TOP) + DT_CLR, RAIL_TOP), (CU - DT_HALF + DT_CLR, -BACK_T)])
rstop = lambda z: DT_STOP + DT_CLR + (z + BACK_T)          # 45-degree nose, parallel to the stop face
boolean(rail, [prism("nose", "u", CU - 12, CU + 12,
                     [(DT_STOP - 3, PL_IN - 0.2), (rstop(PL_IN - 0.2), PL_IN - 0.2), (rstop(RAIL_TOP + 0.2), RAIL_TOP + 0.2), (DT_STOP - 3, RAIL_TOP + 0.2)])], "DIFFERENCE")
boolean(clip, [rail], "UNION")
# detent finger: the last 15 mm of the rail's centre, free to flex toward the plate
FING0 = 58.5
boolean(clip, [box("slot_a", CU - 3.8, CU - 3.0, FING0, PL_END + 1, PL_IN - 0.1, RAIL_TOP + 0.2),
               box("slot_b", CU + 3.0, CU + 3.8, FING0, PL_END + 1, PL_IN - 0.1, RAIL_TOP + 0.2),
               box("undercut", CU - 3.8, CU + 3.8, FING0, PL_END + 1, PL_IN - 0.1, RAIL_TOP - 1.6)], "DIFFERENCE")
boolean(clip, [prism("detent_bump", "u", CU - 3.0, CU + 3.0,
                     [(DET_V - 1.15, RAIL_TOP - 0.05), (DET_V + 1.15, RAIL_TOP - 0.05), (DET_V + 0.2, RAIL_TOP + 0.95), (DET_V - 0.2, RAIL_TOP + 0.95)])], "UNION")
rc = [corner_chamfer("cc", CLIP_U0, J0, 1, 1, 2.0, TG_OUT - 1, PL_IN + 1), corner_chamfer("cc", CLIP_U1, J0, -1, 1, 2.0, TG_OUT - 1, PL_IN + 1),
      corner_round("cr", CLIP_U0, TIP, 1, -1, 4.0, TG_OUT - 1, TG_IN + 1.5), corner_round("cr", CLIP_U1, TIP, -1, -1, 4.0, TG_OUT - 1, TG_IN + 1.5),
      corner_round("cr", CLIP_U0, PL_END, 1, -1, 4.0, PL_OUT - 0.5, PL_IN + 0.02), corner_round("cr", CLIP_U1, PL_END, -1, -1, 4.0, PL_OUT - 0.5, PL_IN + 0.02)]
boolean(clip, rc, "DIFFERENCE")

# ---------------- stand-ins (fit checks and previews; not exported) --------------------------
def stand(name, u0, u1, v0, v1, z0, z1, rgba):
    ob = box(name, u0, u1, v0, v1, z0, z1); ob.color = rgba; return ob
def stand_c(name, u, v, z0, z1, r, rgba):
    ob = cyl(name, u, v, z0, z1, r, seg=32); ob.color = rgba; return ob
green, blue, grey, red, dark = (0.1, 0.45, 0.2, 1), (0.1, 0.2, 0.55, 1), (0.35, 0.35, 0.35, 1), (0.7, 0.15, 0.1, 1), (0.15, 0.15, 0.15, 1)
def pr(x0, y0, x1, y1): return (P(x0, y0)[0], P(x1, y1)[0], P(x0, y0)[1], P(x1, y1)[1])
def ir(x0, y0, x1, y1): return (I(x0, y0)[0], I(x1, y1)[0], I(x0, y0)[1], I(x1, y1)[1])
parts = [
    stand("pcb", *pr(0, 0, 69, 66), PCB_BOT, PCB_TOP, green),
    stand("devkit", *pr(3, 20.3, 58, 48.3), PCB_TOP + HDR + MALE, PCB_TOP + HDR + MALE + 1.6, blue),
    stand("heatsink", *pr(9, 27, 25, 42), PCB_TOP + HDR + MALE + 1.6, PCB_TOP + 17.2, grey),
    stand("hr_module", *pr(12, 1.08, 32, 16.08), PCB_TOP + HDR + STACK + MALE, PCB_TOP + HDR + STACK + MALE + 1.6, red),
    stand("fg_module", *pr(33, 2.5, 57.1, 12.7), PCB_TOP + HDR + MALE, PCB_TOP + HDR + MALE + 1.6, red),
    stand("sw2", *pr(29.5, 53.3, 41.5, 65.3), PCB_TOP, PCB_TOP + SW2_H - 0.01, dark),
    stand("c2", *pr(63.8, 50.3, 66.4, 55.1), PCB_TOP, PCB_TOP + 7.0, (0.8, 0.6, 0.2, 1)),
    stand_c("c3", *P(5.4, 7.0), PCB_TOP, PCB_TOP + 13.0, 5.2, dark),
    stand_c("c1", *P(65.6, 59.6), PCB_TOP, PCB_TOP + 13.0, 3.2, dark),
    stand_c("bz1", *P(55.0, 59.5), PCB_TOP, PCB_TOP + 9.5, 6.0, dark),
    stand("battery", *ir(0.3, 1.0, 50.3, 34.0), FLOOR, FLOOR + 5, (0.8, 0.7, 0.2, 1)),
    stand("tp4056", *ir(0.2, 48.2, 28.2, 65.2), FLOOR, FLOOR + 4.5, (0.1, 0.3, 0.7, 1)),
    stand("mt3608", *ir(31.2, 48.2, 67.2, 66.2), FLOOR, FLOOR + 6, (0.1, 0.4, 0.8, 1)),
]
for ob, c in [(base, (0.85, 0.85, 0.88, 1)), (shelf, (0.95, 0.75, 0.4, 1)), (lid, (0.92, 0.92, 0.96, 1)),
              (plunger, (0.9, 0.2, 0.2, 1)), (clip, (0.28, 0.3, 0.33, 1))]:
    ob.color = c

# ---------------- checks --------------------------------------------------------------------
for ob in (base, shelf, lid, plunger, clip):
    n = clean(ob)
    if n: print(f"  cleaned {ob.name}: removed {n} back-to-back faces")
print("=== Rev B fit checks (overlap volume, mm^3; 0 = no collision) ===")
checks = [("lid", lid, "base", base), ("clip", clip, "base", base), ("shelf", shelf, "base", base),
          ("plunger", plunger, "lid", lid)]
checks += [("lid", lid, s.name, s) for s in parts if s.name not in ("battery", "tp4056", "mt3608")]
checks += [("shelf", shelf, s.name, s) for s in parts if s.name in ("battery", "tp4056", "mt3608", "pcb")]
checks += [("base", base, s.name, s) for s in parts]
worst = 0.0
for an, a, bn, b in checks:
    v = overlap(a, b); worst = max(worst, v)
    if v > 1e-3: print(f"  COLLISION {an} x {bn}: {v:.4f}")
print(f"  {len(checks)} pairs checked, largest overlap {worst:.5f} mm^3")
probe = box("probe", -1, 3, 30, 40, 5, 10)      # known collision: 2 mm of wall x 10 x 5 -> ~100 mm^3
print(f"  check self-test (probe through the left wall): {overlap(base, probe):.1f} mm^3 (expect ~100)")
bpy.data.objects.remove(probe, do_unlink=True)
def bad_edges(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    out = [(round((e.verts[0].co.x + e.verts[1].co.x) / 2, 2), round(-(e.verts[0].co.y + e.verts[1].co.y) / 2, 2),
            round((e.verts[0].co.z + e.verts[1].co.z) / 2, 2), len(e.link_faces)) for e in bm.edges if not e.is_manifold]
    bm.free(); return out
print("  clip non-manifold edges (u, v, z, faces):", bad_edges(clip))
if os.environ.get("TRODES_DEBUG"):
    bm = bmesh.new(); bm.from_mesh(clip.data)
    for e in bm.edges:
        if not e.is_manifold:
            print("  edge", [tuple(round(c, 3) for c in (v.co.x, -v.co.y, v.co.z)) for v in e.verts])
            for f in e.link_faces:
                print("     face n=", tuple(round(c, 2) for c in f.normal), "area", round(f.calc_area(), 3),
                      "centre", tuple(round(c, 2) for c in (f.calc_center_median().x, -f.calc_center_median().y, f.calc_center_median().z)))
    bm.free()
    raise SystemExit
for ob in (base, shelf, lid, plunger, clip):
    print(f"  {ob.name:8s} volume {mesh_volume(ob) / 1000:6.2f} cm^3, non-manifold edges {open_edges(ob)}")
print(f"  outside {OUT_U:.0f} x {OUT_V:.0f} x {LID_TOP + BACK_T:.1f} mm (Rev A 74 x 74 x 37.8)")
print(f"  PCB bottom z {PCB_BOT:.1f} (Rev A 14.7); lid underside {LID_IN:.1f}; USB-C opening z {usb_z - 5.5:.1f}-{usb_z + 5.5:.1f}")
print(f"  hook strain ~{100 * (BARB - ARM_GAP) * ARM_T / (0.67 * (LID_IN - Z_CATCH + LAND / 2) ** 2):.1f} %;"
      f" detent finger strain ~{100 * 0.6 * 1.6 / (0.67 * (DET_V - FING0) ** 2):.1f} %")

# ---------------- export STL (print orientation) -------------------------------------------
def write_stl(ob, path, orient="as_is"):
    # "as_is"; "flip" = 180 deg about X (lid/plunger print top-down);
    # "stand" = -90 deg about X (clip stands on its top end, profile vertical, no supports)
    dg = bpy.context.evaluated_depsgraph_get(); me = ob.evaluated_get(dg).to_mesh()
    me.calc_loop_triangles()
    R = {"as_is": lambda x, y, z: (x, y, z), "flip": lambda x, y, z: (x, -y, -z),
         "stand": lambda x, y, z: (x, z, -y)}[orient]
    tris = [[R(*me.vertices[i].co) for i in t.vertices] for t in me.loop_triangles]
    ns = [R(*t.normal) for t in me.loop_triangles]
    z0 = min(v[2] for t in tris for v in t)
    with open(path, "wb") as f:
        f.write(b"TroDes enclosure Rev B".ljust(80, b" ")); f.write(struct.pack("<I", len(tris)))
        for t, n in zip(tris, ns):
            f.write(struct.pack("<3f", *n))
            for v in t: f.write(struct.pack("<3f", v[0], v[1], v[2] - z0))
            f.write(bytes(2))
    ob.evaluated_get(dg).to_mesh_clear()
    return os.path.getsize(path)
os.makedirs(OUT, exist_ok=True)
for ob, name, orient in [(base, "Wearable_Base_RevB", "as_is"), (shelf, "Wearable_Shelf_RevB", "as_is"),
                         (lid, "Wearable_Lid_RevB_print_upside_down", "flip"), (plunger, "Wearable_SOS_Plunger_RevB", "flip"),
                         (clip, "Wearable_BeltClip_RevB_print_standing", "stand")]:
    print("STL", name, write_stl(ob, os.path.join(OUT, name + ".stl"), orient), "bytes")

# ---------------- previews ------------------------------------------------------------------
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.color_type = "OBJECT"; sc.display.shading.light = "STUDIO"
sc.display.shading.show_cavity = True
sc.render.resolution_x, sc.render.resolution_y = 1600, 1200
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); col.objects.link(cam); sc.camera = cam
cam.data.lens = 50; cam.data.clip_end = 5000
def shot(name, loc, target, hide=(), ortho=None):
    cam.data.type = "ORTHO" if ortho else "PERSP"
    if ortho: cam.data.ortho_scale = ortho
    cam.location = loc
    d = [target[i] - loc[i] for i in range(3)]
    cam.rotation_euler = (math.atan2(math.hypot(d[0], d[1]), -d[2]), 0, math.atan2(d[1], d[0]) - math.pi / 2)
    for ob in bpy.data.objects: ob.hide_render = ob.name in hide
    sc.render.filepath = os.path.join(OUT, name + ".png"); bpy.ops.render.render(write_still=True)
inner = ("pcb", "devkit", "heatsink", "hr_module", "fg_module", "sw2", "c2", "c3", "c1", "bz1")
center = (OUT_U / 2, -OUT_V / 2, 20)
# 1. closed, front three-quarter (clip hidden)
shot("RevB_Closed", (150, -190, 150), center, hide=("clip",))
# 2. exploded
lid.location.z += 45; plunger.location.z += 45; shelf.location.z += 20
for ob in parts:
    if ob.name in inner: ob.location.z += 22
clip.location = (0, -15, -32)
shot("RevB_Exploded", (240, -300, 190), (37, -45, 8))
lid.location.z -= 45; plunger.location.z -= 45; shelf.location.z -= 20
for ob in parts:
    if ob.name in inner: ob.location.z -= 22
# 3. back: clip half-way along the dovetail (slides up from the bottom edge)
clip.location = (0, -30, 0)
shot("RevB_Back_ClipSliding", (150, -230, -140), (37, -45, -5))
clip.location = (0, 0, 0)
shot("RevB_Back_ClipLatched", (150, -230, -140), (37, -45, -5))
# 4. left side: charging port and charge-light window
shot("RevB_Left_ChargeLight", (-150, -60, 60), (0, -55, 12), hide=("clip",))
# 5. shelf openings from above (lid, PCB and modules hidden)
shot("RevB_Shelf", (37, -95, 160), (37, -40, 0), hide=("lid", "plunger", "clip") + inner)
# 6. cross-section: a 1 mm slice at v = 26 (through the upper-left snap hook and the dovetail),
#    seen from the bottom edge so u runs left to right
print("objects before sections:", sorted(o.name for o in bpy.data.objects if o.type == "MESH" and o.name not in
      ("base", "shelf", "lid", "plunger", "clip") and o.name not in [p_.name for p_ in parts]))
SV = ARMS[0][1]
sec = [(base, "sec_base"), (lid, "sec_lid"), (clip, "sec_clip"), (shelf, "sec_shelf")]
sec += [(o, "sec_" + o.name) for o in parts]
made = []
for ob, nm in sec:
    d = dup(ob, nm); d.color = ob.color
    boolean(d, [box("slice", -5, OUT_U + 5, SV - 0.5, SV + 0.5, -30, 60)], "INTERSECT")
    made.append(d.name)
keep = tuple(made) + ("cam",)
hide_all = tuple(o.name for o in bpy.data.objects if o.name not in keep)
shot("RevB_Section_Latch", (3.5, -300, 31.0), (3.5, 0, 31.0), hide=hide_all, ortho=16)
shot("RevB_Section_Full", (37, -300, 20.0), (37, 0, 20.0), hide=hide_all, ortho=84)
print("done")
