"""Pack the Rev B wearable STLs into one 3MF laid out on a Bambu Lab A1 plate (256 x 256 mm).
Plain 3MF core spec (millimetres); Bambu Studio opens it as geometry with the parts in place.
Usage: python make_plate_revB.py <Enclosures folder>"""
import os, struct, sys, zipfile
from xml.sax.saxutils import escape

def read_stl(path):
    d = open(path, "rb").read(); n = struct.unpack_from("<I", d, 80)[0]
    verts, index, tris = [], {}, []
    for i in range(n):
        o = 84 + i * 50 + 12
        t = []
        for k in range(3):
            v = struct.unpack_from("<3f", d, o + 12 * k)
            key = (round(v[0], 4), round(v[1], 4), round(v[2], 4))
            if key not in index:
                index[key] = len(verts); verts.append(key)
            t.append(index[key])
        if len(set(t)) == 3: tris.append(t)
    mn = [min(v[i] for v in verts) for i in range(3)]
    verts = [(v[0] - mn[0], v[1] - mn[1], v[2] - mn[2]) for v in verts]
    size = [max(v[i] for v in verts) for i in range(3)]
    return verts, tris, size

def write_3mf(out, parts):
    objs, items, boxes = [], [], []
    for k, (path, name, x, y) in enumerate(parts, start=1):
        verts, tris, size = read_stl(path)
        assert x + size[0] <= 256 and y + size[1] <= 256, (name, x, y, size)
        for bx in boxes:     # keep 5 mm between parts
            assert x + size[0] + 5 <= bx[0] or bx[2] + 5 <= x or y + size[1] + 5 <= bx[1] or bx[3] + 5 <= y, (name, bx)
        boxes.append((x, y, x + size[0], y + size[1]))
        vx = "".join(f'<vertex x="{a:.4f}" y="{b:.4f}" z="{c:.4f}"/>' for a, b, c in verts)
        tx = "".join(f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in tris)
        objs.append(f'<object id="{k}" name="{escape(name)}" type="model"><mesh><vertices>{vx}</vertices><triangles>{tx}</triangles></mesh></object>')
        items.append(f'<item objectid="{k}" transform="1 0 0 0 1 0 0 0 1 {x:.3f} {y:.3f} 0" printable="1"/>')
        print(f"  {name:34s} {size[0]:6.1f} x {size[1]:6.1f} x {size[2]:5.1f} mm at ({x}, {y})")
    model = ('<?xml version="1.0" encoding="UTF-8"?>\n<model unit="millimeter" xml:lang="en-US" '
             'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">'
             '<metadata name="Title">' + escape(os.path.basename(out)) + '</metadata>'
             '<metadata name="Designer">TroDes (Cirio, Cruz)</metadata>'
             '<resources>' + "".join(objs) + '</resources><build>' + "".join(items) + '</build></model>')
    ct = ('<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
          '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>')
    rels = ('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>')
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", ct); z.writestr("_rels/.rels", rels); z.writestr("3D/3dmodel.model", model)
    print("wrote", out, round(os.path.getsize(out) / 1e6, 2), "MB")

E = sys.argv[1]
W = os.path.join(E, "out_revB")
write_3mf(os.path.join(E, "TroDes_Wearable_RevB_A1_plate.3mf"), [
    (os.path.join(W, "Wearable_Base_RevB.stl"), "Wearable Base Rev B", 12, 150),
    (os.path.join(W, "Wearable_Lid_RevB_print_upside_down.stl"), "Wearable Lid Rev B", 94, 150),
    (os.path.join(W, "Wearable_Shelf_RevB.stl"), "Wearable Shelf Rev B", 176, 150),
    (os.path.join(W, "Wearable_SOS_Plunger_RevB.stl"), "SOS Plunger", 30, 115),
    (os.path.join(W, "Wearable_BeltClip_RevB_print_standing.stl"), "Belt Clip Rev B (standing)", 100, 115),
])
