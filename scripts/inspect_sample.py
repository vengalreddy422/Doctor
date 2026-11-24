from pptx import Presentation

prs = Presentation('C:/Users/MSI/.gemini/antigravity/brain/f8e13947-8eea-4ca5-8fe0-973b06cac4fb/.user_uploaded/media_1795531791705_d1dd63c9.pptx')

for i in [0, 1, 2, 3, 5, 7, 9, 10, 12, 14, 15]:
    s = prs.slides[i]
    print(f"=== SLIDE {i+1} ===")
    for sh in s.shapes:
        fill_color = None
        if hasattr(sh, 'fill') and sh.fill and sh.fill.type == 1:
            try:
                fill_color = sh.fill.fore_color.rgb
            except:
                pass
        txt = ""
        if sh.has_text_frame:
            txt = " ".join([p.text for p in sh.text_frame.paragraphs if p.text.strip()])
        print(f"Shape: {sh.name} ({sh.shape_type}) left={sh.left.inches:.2f} top={sh.top.inches:.2f} w={sh.width.inches:.2f} h={sh.height.inches:.2f} fill={fill_color} txt='{txt[:50]}'")
