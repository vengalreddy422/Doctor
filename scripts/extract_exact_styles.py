from pptx import Presentation

prs = Presentation('C:/Users/MSI/.gemini/antigravity/brain/f8e13947-8eea-4ca5-8fe0-973b06cac4fb/.user_uploaded/media_1795531791705_d1dd63c9.pptx')

for i in range(len(prs.slides)):
    s = prs.slides[i]
    print(f"\n--- SLIDE {i+1} ---")
    for sh in s.shapes:
        info = f"{sh.name} ({sh.shape_type})"
        if sh.has_text_frame:
            for p in sh.text_frame.paragraphs:
                if p.text.strip():
                    f_name = p.font.name if p.font else None
                    f_size = p.font.size.pt if p.font and p.font.size else None
                    f_col = None
                    if p.font and p.font.color and p.font.color.type == 1:
                        f_col = p.font.color.rgb
                    for r in p.runs:
                        if r.font and r.font.color and r.font.color.type == 1:
                            f_col = r.font.color.rgb
                    print(f"  TXT: '{p.text[:40]}' | Font: {f_name} {f_size}pt | Col: {f_col}")
        if hasattr(sh, 'fill') and sh.fill and sh.fill.type == 1:
            try:
                print(f"  FILL: {sh.fill.fore_color.rgb}")
            except:
                pass
        if hasattr(sh, 'line') and sh.line and sh.line.fill and sh.line.fill.type == 1:
            try:
                print(f"  LINE: {sh.line.color.rgb}")
            except:
                pass
