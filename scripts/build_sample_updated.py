import os
from pptx import Presentation
from pptx.oxml import parse_xml

src_pptx = 'C:/Users/MSI/.gemini/antigravity/brain/f8e13947-8eea-4ca5-8fe0-973b06cac4fb/.user_uploaded/media_1795531791705_d1dd63c9.pptx'
prs = Presentation(src_pptx)

print(f"Initial slides: {len(prs.slides)}")

# We want to remove:
# Index 1: Outline (Slide 2 in original)
# Index 2: Introduction (Slide 3 in original)
# Index 7: System Components (Slide 8 in original, after removing index 1 & 2, it will shift)

slide_id_list = prs.slides._sldIdLst

# Remove Slide 8 (System Components) first from back
# Original indices: 0:Title, 1:Outline, 2:Intro, 3:Problem, 4:Objectives, 5:Graphical, 6:Methodology, 7:Components, 8:Workflow, 9:Implementation, 10:Screenshots, 11:Tools, 12:Challenges, 13:Results, 14:Conclusion, 15:Thank You

slides_to_remove = [7, 2, 1] # Remove 7 (Components), then 2 (Intro), then 1 (Outline)
for idx in sorted(slides_to_remove, reverse=True):
    rId = slide_id_list[idx].rId
    prs.part.drop_rel(rId)
    del slide_id_list[idx]
    print(f"Removed slide at index {idx}")

print(f"Remaining slides count: {len(prs.slides)}")

# Now add fade transition animation to every slide and update slide numbers
for s_idx, slide in enumerate(prs.slides):
    # Add fade transition
    # Check if transition already exists
    trans_elems = slide._element.xpath('p:transition')
    if not trans_elems:
        trans_xml = parse_xml('<p:transition xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:fade/></p:transition>')
        slide._element.append(trans_xml)
    
    # Update slide number placeholder if present
    slide_num_str = str(s_idx + 1)
    for sh in slide.shapes:
        if sh.is_placeholder and sh.placeholder_format.type == 14: # Slide Number
            sh.text = slide_num_str
        elif sh.has_text_frame and sh.text.strip().isdigit() and len(sh.text.strip()) <= 2:
            # Check if this shape is located at bottom right (x > 11, y > 6.5)
            if sh.left.inches > 11.0 and sh.top.inches > 6.5:
                sh.text = slide_num_str

out_path = 'CareConnect_Internship_Review_1_Sample_Style_Updated.pptx'
prs.save(out_path)
print(f"Saved: {out_path} ({os.path.getsize(out_path)} bytes)")
