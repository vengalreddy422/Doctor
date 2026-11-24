from pptx import Presentation

prs = Presentation('C:/Users/MSI/.gemini/antigravity/brain/f8e13947-8eea-4ca5-8fe0-973b06cac4fb/.user_uploaded/media_1795531791705_d1dd63c9.pptx')

print("=== SLIDE 6 (Graphical Representation) ===")
s6 = prs.slides[5]
for sh in s6.shapes:
    print(f"  {sh.name} | type={sh.shape_type} | left={sh.left.inches:.2f} top={sh.top.inches:.2f} w={sh.width.inches:.2f} h={sh.height.inches:.2f} | text='{sh.text[:30] if sh.has_text_frame else ''}'")

print("\n=== SLIDE 12 (Tools) ===")
s12 = prs.slides[11]
for sh in s12.shapes:
    print(f"  {sh.name} | type={sh.shape_type} | left={sh.left.inches:.2f} top={sh.top.inches:.2f} w={sh.width.inches:.2f} h={sh.height.inches:.2f} | text='{sh.text[:30] if sh.has_text_frame else ''}'")
