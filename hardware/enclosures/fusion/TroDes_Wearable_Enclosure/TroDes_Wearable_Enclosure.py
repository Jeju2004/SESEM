# TroDes wearable enclosure -- Autodesk Fusion script (Python API).
# Run: Utilities > Add-Ins > Scripts and Add-Ins > TroDes_Wearable_Enclosure > Run.
# Builds a new parametric design with one component per printed part (Base, Shelf, Lid,
# SOS Plunger, Belt Clip) plus grey "Reference parts" stand-ins (PCB, modules, battery) that are
# not printed. All HEIGHTS are Fusion user parameters (Modify > Change Parameters) and every
# feature that depends on them updates. The plan-view layout is fixed to PCB Rev C3.
# Printer: Bambu Lab A1, PETG, Bambu Studio. STLs are exported to OUT_DIR at the end.
#
# Plan-view convention (same as KiCad and the Blender model): u = right, v = down from the
# top edge of the case. Fusion x = u, Fusion y = 74 - v, z = up. The PCB's top-left corner
# sits at (u, v) = (2.5, 2.5).
import adsk.core, adsk.fusion, traceback, math, os

OUT_DIR = r"C:\Users\Chester\Desktop\TroDes Deliverables\Enclosures\fusion"

# ---- user parameters: heights (name, expression, comment) --------------------------------
PARAMS = [
    ("floor_t",   "2 mm",    "Base floor thickness"),
    ("lid_t",     "2 mm",    "Lid plate thickness"),
    ("deck_top",  "11 mm",   "Top of the power compartment (battery, TP4056, MT3608, toggle body)"),
    ("shelf_t",   "1.2 mm",  "Shelf plate that covers the power compartment"),
    ("post_h",    "2.5 mm",  "PCB posts on the shelf (clear the solder joints)"),
    ("pcb_t",     "1.6 mm",  "PCB / module board thickness"),
    ("hdr_h",     "5 mm",    "Female header height (measured)"),
    ("male_h",    "2.5 mm",  "Male-header plastic under each module"),
    ("stack_h",   "8.5 mm",  "Stackable header that lifts the MAX30102 to the lid"),
    ("sw2_h",     "13 mm",   "SOS tact switch SW2 total height (measured 13 mm)"),
    ("sw_travel", "0.6 mm",  "Free gap between plunger and SW2"),
    ("clear_top", "19.5 mm", "Clearance above the PCB top (tallest part + margin)"),
    ("lip_h",     "3 mm",    "Lid lip depth"),
    ("pcb_bot",   "deck_top + shelf_t + post_h", "PCB bottom (derived)"),
    ("pcb_top",   "pcb_bot + pcb_t",             "PCB top (derived)"),
    ("lid_in",    "pcb_top + clear_top",         "Underside of the lid = top of the base walls (derived)"),
    ("lid_top",   "lid_in + lid_t",              "Top of the lid (derived)"),
    ("esp_usb_z", "pcb_top + hdr_h + male_h + pcb_t + 1.6 mm", "Centre height of the ESP32 USB-C port (derived)"),
]

# ---- plan-view constants (mm), fixed to PCB Rev C3 ---------------------------------------
WALL, IN_U, IN_V = 2.0, 70.0, 70.0
OUT_U, OUT_V = IN_U + 2 * WALL, IN_V + 2 * WALL
LIP_T, LIP_GAP, BUMP = 1.2, 0.3, 0.7            # lid lip, lip-to-wall gap (PETG), snap bump
P = lambda x, y: (2.5 + x, 2.5 + y)             # PCB coordinates -> plan view
I = lambda x, y: (WALL + x, WALL + y)           # cavity coordinates -> plan view
CM = 0.1                                        # Fusion API lengths are in cm

app = adsk.core.Application.get()
ui = app.userInterface
_planes = {}


def V(expr):
    return adsk.core.ValueInput.createByString(expr)


def pt(u, v):
    return adsk.core.Point3D.create(u * CM, (OUT_V - v) * CM, 0)


def zplane(comp, expr):
    key = (comp.name, expr)
    if key not in _planes:
        if expr == "0 mm":
            _planes[key] = comp.xYConstructionPlane
        else:
            inp = comp.constructionPlanes.createInput()
            inp.setByOffset(comp.xYConstructionPlane, V(expr))
            pl = comp.constructionPlanes.add(inp)
            pl.name = "z = " + expr
            pl.isLightBulbOn = False
            _planes[key] = pl
    return _planes[key]


def extrude(comp, profile, h_expr, op, body, name):
    ext = comp.features.extrudeFeatures
    inp = ext.createInput(profile, op)
    inp.setDistanceExtent(False, V(h_expr))
    if body is not None and op != adsk.fusion.FeatureOperations.NewBodyFeatureOperation:
        inp.participantBodies = [body]
    f = ext.add(inp)
    f.name = name
    if op == adsk.fusion.FeatureOperations.NewBodyFeatureOperation:
        b = f.bodies.item(0)
        b.name = name
        return b
    return body


def box(comp, name, u0, u1, v0, v1, z0, h, op, body=None):
    """Rectangle (u0..u1, v0..v1) on the plane z = z0 (expression), extruded h (expression) up."""
    sk = comp.sketches.add(zplane(comp, z0))
    sk.name = name
    sk.sketchCurves.sketchLines.addTwoPointRectangle(pt(u0, v1), pt(u1, v0))
    return extrude(comp, sk.profiles.item(0), h, op, body, name)


def cyl(comp, name, u, v, r, z0, h, op, body=None):
    sk = comp.sketches.add(zplane(comp, z0))
    sk.name = name
    sk.sketchCurves.sketchCircles.addByCenterRadius(pt(u, v), r * CM)
    return extrude(comp, sk.profiles.item(0), h, op, body, name)


def new_comp(root, name):
    occ = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
    occ.component.name = name
    return occ.component, occ


def run(context):
    try:
        NEW = adsk.fusion.FeatureOperations.NewBodyFeatureOperation
        JOIN = adsk.fusion.FeatureOperations.JoinFeatureOperation
        CUT = adsk.fusion.FeatureOperations.CutFeatureOperation

        doc = app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
        design = adsk.fusion.Design.cast(app.activeProduct)
        design.designType = adsk.fusion.DesignTypes.ParametricDesignType
        design.fusionUnitsManager.distanceDisplayUnits = adsk.fusion.DistanceUnits.MillimeterDistanceUnits
        for name, expr, comment in PARAMS:
            design.userParameters.add(name, V(expr), "mm", comment)
        root = design.rootComponent

        # ================= BASE: shell + power compartment ================================
        c, occ_base = new_comp(root, "Base")
        base = box(c, "Base", 0, OUT_U, 0, OUT_V, "0 mm", "lid_in", NEW)
        box(c, "Cavity", WALL, WALL + IN_U, WALL, WALL + IN_V, "floor_t", "lid_in - floor_t + 1 mm", CUT, base)
        dh = "deck_top - floor_t"
        # dividers (carry the shelf)
        box(c, "Divider across", WALL, WALL + IN_U, I(0, 46.4)[1], I(0, 47.6)[1], "floor_t", dh, JOIN, base)
        box(c, "Divider TP4056-MT3608", I(29.2, 0)[0], I(30.4, 0)[0], I(0, 47.6)[1], WALL + IN_V, "floor_t", dh, JOIN, base)
        box(c, "Divider battery-toggle", I(51.2, 0)[0], I(52.4, 0)[0], WALL, I(0, 46.4)[1], "floor_t", dh, JOIN, base)
        # locator rims, 3 mm tall
        box(c, "Rim battery", WALL, I(50, 0)[0], I(0, 35.0)[1], I(0, 36.2)[1], "floor_t", "3 mm", JOIN, base)
        box(c, "Rim TP4056", WALL, I(29.2, 0)[0], I(0, 66.0)[1], I(0, 67.2)[1], "floor_t", "3 mm", JOIN, base)
        box(c, "Rim MT3608 side", I(68.0, 0)[0], I(69.2, 0)[0], I(0, 47.6)[1], I(0, 67.0)[1], "floor_t", "3 mm", JOIN, base)
        box(c, "Rim MT3608 end", I(30.4, 0)[0], WALL + IN_U, I(0, 67.0)[1], I(0, 68.2)[1], "floor_t", "3 mm", JOIN, base)
        # shelf ledges (right-hand ledge interrupted at the toggle switch)
        lz = "deck_top - 1.2 mm"
        box(c, "Ledge left", WALL, WALL + 1.5, WALL, I(0, 66.5)[1], lz, "1.2 mm", JOIN, base)
        box(c, "Ledge top", WALL, WALL + IN_U, WALL, WALL + 1.5, lz, "1.2 mm", JOIN, base)
        box(c, "Ledge right 1", WALL + IN_U - 1.5, WALL + IN_U, WALL, I(0, 32)[1], lz, "1.2 mm", JOIN, base)
        box(c, "Ledge right 2", WALL + IN_U - 1.5, WALL + IN_U, I(0, 50)[1], I(0, 66.5)[1], lz, "1.2 mm", JOIN, base)
        box(c, "Ledge bottom", WALL, WALL + IN_U, I(0, 65.0)[1], I(0, 66.3)[1], lz, "1.2 mm", JOIN, base)
        # wire notches in the dividers (top 4 mm)
        nz = "deck_top - 4 mm"
        box(c, "Notch 1", I(10, 0)[0], I(16, 0)[0], I(0, 46.0)[1], I(0, 48.0)[1], nz, "5 mm", CUT, base)
        box(c, "Notch 2", I(60, 0)[0], I(66, 0)[0], I(0, 46.0)[1], I(0, 48.0)[1], nz, "5 mm", CUT, base)
        box(c, "Notch 3", I(28.8, 0)[0], I(30.8, 0)[0], I(0, 52)[1], I(0, 58)[1], nz, "5 mm", CUT, base)
        box(c, "Notch 4", I(50.8, 0)[0], I(52.8, 0)[0], I(0, 20)[1], I(0, 26)[1], nz, "5 mm", CUT, base)
        # wall openings: ESP32 USB-C (right wall) and TP4056 USB-C (left wall), 13 x 8 mm
        usb_v = P(0, 34.3)[1]
        box(c, "ESP32 USB-C opening", OUT_U - WALL - 1, OUT_U + 1, usb_v - 7.5, usb_v + 7.5, "esp_usb_z - 4.5 mm", "9 mm", CUT, base)
        tp_v = I(0, 56.8)[1]
        box(c, "TP4056 USB-C opening", -1, WALL + 1, tp_v - 6.5, tp_v + 6.5, "floor_t - 0.5 mm", "8 mm", CUT, base)
        # power toggle switch: 6.4 mm hole through the right wall
        inp = c.constructionPlanes.createInput()
        inp.setByOffset(c.yZConstructionPlane, V("%.3f mm" % (OUT_U - WALL - 1)))
        yz = c.constructionPlanes.add(inp)
        yz.name = "Right wall (toggle)"
        yz.isLightBulbOn = False
        sk = c.sketches.add(yz)
        sk.name = "Toggle hole"
        cen = sk.modelToSketchSpace(adsk.core.Point3D.create((OUT_U - WALL - 1) * CM, (OUT_V - I(0, 40)[1]) * CM, 6.5 * CM))
        cen.z = 0
        sk.sketchCurves.sketchCircles.addByCenterRadius(cen, 3.2 * CM)
        extrude(c, sk.profiles.item(0), "%.3f mm" % (WALL + 2), CUT, base, "Toggle hole")
        # snap grooves for the lid (left and right walls)
        gz = "lid_in - 2.2 mm"
        box(c, "Groove left", WALL - 0.6, WALL + 0.01, 24, 50, gz, "1.2 mm", CUT, base)
        box(c, "Groove right", WALL + IN_U - 0.01, WALL + IN_U + 0.6, 24, 50, gz, "1.2 mm", CUT, base)
        # belt-clip screw holes (M3 clearance)
        for k, u in enumerate((27.0, 47.0)):
            cyl(c, "Clip screw hole %d" % (k + 1), u, 42.5, 1.7, "-1 mm", "floor_t + 2 mm", CUT, base)

        # ================= SHELF: compartment cover + PCB posts ============================
        c, occ_shelf = new_comp(root, "Shelf")
        shelf = box(c, "Shelf", WALL + 0.4, WALL + IN_U - 0.4, WALL + 0.4, I(0, 66.3)[1], "deck_top", "shelf_t", NEW)
        for k, (x, y) in enumerate([(20, 34), (50, 34), (35.5, 59.3), (64, 35), (6, 16), (33.5, 7)]):
            cyl(c, "PCB post %d" % (k + 1), *P(x, y), 2.0, "deck_top + shelf_t", "post_h", JOIN, shelf)

        # ================= LID ===============================================================
        c, occ_lid = new_comp(root, "Lid")
        lid = box(c, "Lid", 0, OUT_U, 0, OUT_V, "lid_in", "lid_t", NEW)
        o0, o1 = WALL + LIP_GAP, WALL + IN_U - LIP_GAP
        i0, i1 = o0 + LIP_T, o1 - LIP_T
        box(c, "Lip left", o0, i0, o0, o1, "lid_in - lip_h", "lip_h", JOIN, lid)
        box(c, "Lip right", i1, o1, o0, o1, "lid_in - lip_h", "lip_h", JOIN, lid)
        box(c, "Lip bottom", o0, o1, i1, o1, "lid_in - lip_h", "lip_h", JOIN, lid)
        box(c, "Snap bump left", o0 - BUMP, o0, 25, 49, "lid_in - 2 mm", "0.8 mm", JOIN, lid)
        box(c, "Snap bump right", o1, o1 + BUMP, 25, 49, "lid_in - 2 mm", "0.8 mm", JOIN, lid)
        sos, led, buz, hr = P(35.5, 59.3), P(62.27, 17.5), P(55.0, 59.5), P(22.0, 8.58)
        thru_z, thru_h = "lid_in - 1 mm", "lid_t + 2 mm"
        cyl(c, "SOS hole", *sos, 5.5, thru_z, thru_h, CUT, lid)
        cyl(c, "LED hole", *led, 2.6, thru_z, thru_h, CUT, lid)
        cyl(c, "Buzzer hole 0", *buz, 0.9, thru_z, thru_h, CUT, lid)
        for k in range(6):
            a = k * math.pi / 3
            cyl(c, "Buzzer hole %d" % (k + 1), buz[0] + 3.5 * math.cos(a), buz[1] + 3.5 * math.sin(a), 0.9, thru_z, thru_h, CUT, lid)
        box(c, "HR finger window", hr[0] - 5, hr[0] + 5, hr[1] - 4, hr[1] + 4, thru_z, thru_h, CUT, lid)
        box(c, "HR sensor relief", hr[0] - 10.5, hr[0] + 10.5, hr[1] - 8, hr[1] + 8, thru_z, "1.4 mm", CUT, lid)
        # finger-locating dish: cone r6 -> r10, 1 mm deep, as a loft cut
        sk1 = c.sketches.add(zplane(c, "lid_top - 1 mm")); sk1.name = "HR dish bottom"
        sk1.sketchCurves.sketchCircles.addByCenterRadius(pt(*hr), 6.0 * CM)
        sk2 = c.sketches.add(zplane(c, "lid_top + 0.01 mm")); sk2.name = "HR dish top"
        sk2.sketchCurves.sketchCircles.addByCenterRadius(pt(*hr), 10.0 * CM)
        lofts = c.features.loftFeatures
        li = lofts.createInput(CUT)
        # the profile with the window hole inside: take the outer (largest) profile of each sketch
        def outer(sk):
            best = None
            for pr in sk.profiles:
                if best is None or pr.areaProperties().area > best.areaProperties().area:
                    best = pr
            return best
        li.loftSections.add(outer(sk1))
        li.loftSections.add(outer(sk2))
        try:
            li.participantBodies = [lid]
        except Exception:
            pass
        lf = lofts.add(li); lf.name = "HR finger dish"
        for k, u in enumerate((12.5, 15.5, 18.5, 21.5, 24.5)):
            box(c, "Vent %d" % (k + 1), 2.5 + u - 0.9, 2.5 + u + 0.9, P(0, 28)[1], P(0, 41)[1], thru_z, thru_h, CUT, lid)
        # engraved text on the top face (0.6 mm deep)
        for label, (tu, tv), size in (("SOS", (sos[0], sos[1] - 9.0), 5.0), ("TroDes", (20.0, 69.5), 4.5)):
            try:
                sk = c.sketches.add(zplane(c, "lid_top - 0.6 mm")); sk.name = "Text " + label
                ti = sk.sketchTexts.createInput2(label, size * CM)
                w, h = size * len(label) * 0.9, size * 1.6
                ti.setAsMultiLine(pt(tu - w / 2, tv + h / 2), pt(tu + w / 2, tv - h / 2),
                                  adsk.core.HorizontalAlignments.CenterHorizontalAlignment,
                                  adsk.core.VerticalAlignments.MiddleVerticalAlignment, 0)
                t = sk.sketchTexts.add(ti)
                ei = c.features.extrudeFeatures.createInput(t, CUT)
                ei.setDistanceExtent(False, V("1 mm"))
                ei.participantBodies = [lid]
                c.features.extrudeFeatures.add(ei).name = "Engrave " + label
            except Exception:
                pass   # engraving is cosmetic; skip if the text API differs in this Fusion version

        # ================= SOS PLUNGER (captive: flange under the lid) ======================
        c, occ_pl = new_comp(root, "SOS Plunger")
        z_sw = "pcb_top + sw2_h + sw_travel"
        pl = cyl(c, "Plunger stem", *sos, 3.0, z_sw, "lid_in - 1 mm - (%s)" % z_sw, NEW)
        cyl(c, "Plunger flange", *sos, 6.75, "lid_in - 1 mm", "1 mm", JOIN, pl)
        cyl(c, "Plunger button", *sos, 5.2, "lid_in", "lid_t + 1.2 mm", JOIN, pl)

        # ================= BELT CLIP (under the base; 2 x M3 x 6 through the floor) =========
        # plate against the base underside; the joint is at the top (small v), the open end points down
        c, occ_clip = new_comp(root, "Belt Clip")
        cu0, cu1, a0 = 22.0, 52.0, 28.5          # across the clip (u) and the joint end (v)
        clip = box(c, "Belt clip plate", cu0, cu1, a0, a0 + 24, "-5 mm", "5 mm", NEW)
        box(c, "Belt clip joint", cu0, cu1, a0, a0 + 4, "-11 mm", "6 mm", JOIN, clip)
        box(c, "Belt clip tongue", cu0, cu1, a0, a0 + 40, "-11 mm", "2.5 mm", JOIN, clip)
        box(c, "Belt clip grip", cu0, cu1, a0 + 35, a0 + 40, "-8.5 mm", "1.3 mm", JOIN, clip)
        for k, u in enumerate((27.0, 47.0)):
            cyl(c, "Clip pilot hole %d" % (k + 1), u, 42.5, 1.4, "-5.5 mm", "5.5 mm", CUT, clip)

        # ================= REFERENCE PARTS (not printed) ====================================
        c, occ_ref = new_comp(root, "Reference parts (not printed)")
        pr = lambda x0, y0, x1, y1: (P(x0, y0)[0], P(x1, y1)[0], P(x0, y0)[1], P(x1, y1)[1])
        ir = lambda x0, y0, x1, y1: (I(x0, y0)[0], I(x1, y1)[0], I(x0, y0)[1], I(x1, y1)[1])
        refs = [
            ("PCB Rev C3", pr(0, 0, 69, 66), "pcb_bot", "pcb_t"),
            ("ESP32 devkit", pr(3, 20.3, 58, 48.3), "pcb_top + hdr_h + male_h", "pcb_t"),
            ("ESP32 heatsink", pr(9, 27, 25, 42), "pcb_top + hdr_h + male_h + pcb_t", "8.1 mm"),
            ("MAX30102 (on stackable header)", pr(12, 1.08, 32, 16.08), "pcb_top + hdr_h + stack_h + male_h", "pcb_t"),
            ("MAX17043", pr(33, 2.5, 57.1, 12.7), "pcb_top + hdr_h + male_h", "pcb_t"),
            ("SW2 13 mm", (sos[0] - 6, sos[0] + 6, sos[1] - 6, sos[1] + 6), "pcb_top", "sw2_h"),
            ("Li-Po 50x33x5", ir(0.3, 1.0, 50.3, 34.0), "floor_t", "5 mm"),
            ("TP4056 USB-C", ir(0.2, 48.2, 28.2, 65.2), "floor_t", "4.5 mm"),
            ("MT3608", ir(31.2, 48.2, 67.2, 66.2), "floor_t", "6 mm"),
        ]
        for name, (u0, u1, v0, v1), z0, h in refs:
            b = box(c, name, u0, u1, v0, v1, z0, h, NEW)
            try:
                b.opacity = 0.45
            except Exception:
                pass

        # ================= export STLs for Bambu Studio =====================================
        os.makedirs(OUT_DIR, exist_ok=True)
        em = design.exportManager
        done = []
        for occ, fname in ((occ_base, "Wearable_Base"), (occ_shelf, "Wearable_Shelf"), (occ_lid, "Wearable_Lid"),
                           (occ_pl, "Wearable_SOS_Plunger"), (occ_clip, "Wearable_BeltClip")):
            path = os.path.join(OUT_DIR, fname + ".stl")
            opt = em.createSTLExportOptions(occ, path)
            opt.meshRefinement = adsk.fusion.MeshRefinementSettings.MeshRefinementHigh
            em.execute(opt)
            done.append(fname)
        try:
            em.execute(em.createFusionArchiveExportOptions(os.path.join(OUT_DIR, "TroDes_Wearable_Enclosure.f3d")))
            done.append("TroDes_Wearable_Enclosure.f3d")
        except Exception:
            pass
        app.activeViewport.fit()
        ui.messageBox("TroDes wearable enclosure built.\n\nExported to:\n%s\n\n%s\n\nHeights: Modify > Change Parameters."
                      % (OUT_DIR, "\n".join(done)), "TroDes")
    except Exception:
        if ui:
            ui.messageBox("Failed:\n{}".format(traceback.format_exc()), "TroDes")
