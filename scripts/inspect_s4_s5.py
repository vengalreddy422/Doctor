from pptx import Presentation

prs = Presentation('C:/Users/MSI/.gemini/antigravity/brain/f8e13947-8eea-4ca5-8fe0-973b06cac4fb/.user_uploaded/media_1795531791705_d1dd63c9.pptx')

print("=== SLIDE 4 (Problem) ===")
s4 = prs.slides[3]
for sh in s4.shapes:
    print(f"  {sh.name} | type={sh.shape_type} | left={sh.left.inches:.2f} top={sh.top.inches:.2f} w={sh.width.inches:.2f} h={sh.height.inches:.2f} | text='{sh.text[:30] if sh.has_text_frame else ''}'")

print("\n=== SLIDE 5 (Objectives) ===")
s5 = prs.slides[4]
for sh in s5.shapes:
    print(f"  {sh.name} | type={sh.shape_type} | left={sh.left.inches:.2f} top={sh.top.inches:.2f} w={sh.width.inches:.2f} h={sh.height.inches:.2f} | text='{sh.text[:30] if sh.has_text_frame else ''}'")
