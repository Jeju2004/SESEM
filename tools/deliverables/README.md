# Deliverable generators

Scripts that produce the drafts in `deliverables/drafts/`. Edit the text in the
script, regenerate, then open the result in Word/PowerPoint.

```powershell
cd C:\Users\Chester\Desktop\Vaya\SESEM\tools\deliverables
npm install                                   # once
node manual.js ..\..\deliverables\drafts\TroDes_Users_Manual_DRAFT_v0.4.docx
node deck.js   ..\..\deliverables\drafts\TroDes_Defense_Presentation_DRAFT_v0.3.pptx
node paper.js  ..\..\deliverables\drafts\TroDes_IEEE_Paper_DRAFT_Rev3.docx
node pr3.js    ..\..\deliverables\drafts\TroDes_Progress_Report_3_DRAFT.docx
```

After regenerating a Word file, open it and right-click the table of contents →
**Update Field**, then save and export to PDF.

**IEEE-format paper (Revision 7, two columns):**

```powershell
python make_figures.py <dir with sch.pdf and pcb.pdf> <walk log txt>   # f5, f6, schematic, copper
python make_appendix_images.py "<...>\SESEMSG_Panel_QR_Card.pdf"      # rotated schematic, board crop, one QR card
node paper_ieee.js ..\..\deliverables\drafts\TroDes_IEEE_Paper_DRAFT_Rev7.docx
```

Tables, figures and equations are numbered from the `TABLES`, `FIGS` and `EQS`
lists at the top of `paper_ieee.js` (IEEE order of appearance); the script stops
if one is missing or out of order. In Word, add the drop cap to the first
paragraph of 1.1 (Format → Drop Cap → Dropped, 2 lines), then export to PDF.

`figures/` holds the paper's figures, cropped from the presentation's slides 4,
8 and 9 (architecture, Test 1 chart, Test 2 chart).

Yellow-highlighted text in any draft marks a value that is not yet measured or
decided. Replace it with the real value; never with an estimate presented as a
measurement.
