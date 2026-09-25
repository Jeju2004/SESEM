# Deliverable generators

Scripts that produce the drafts in `deliverables/drafts/`. Edit the text in the
script, regenerate, then open the result in Word/PowerPoint.

```powershell
cd C:\Users\Chester\Desktop\Vaya\SESEM\tools\deliverables
npm install                                   # once
node manual.js ..\..\deliverables\drafts\TroDes_Users_Manual_DRAFT_v0.1.docx
node deck.js   ..\..\deliverables\drafts\TroDes_Defense_Presentation_DRAFT_v0.1.pptx
node paper.js  ..\..\deliverables\drafts\TroDes_IEEE_Paper_DRAFT_Rev3.docx
node pr3.js    ..\..\deliverables\drafts\TroDes_Progress_Report_3_DRAFT.docx
```

After regenerating a Word file, open it and right-click the table of contents →
**Update Field**, then save and export to PDF.

`figures/` holds the paper's figures, cropped from the presentation's slides 4,
8 and 9 (architecture, Test 1 chart, Test 2 chart).

Yellow-highlighted text in any draft marks a value that is not yet measured or
decided. Replace it with the real value; never with an estimate presented as a
measurement.
