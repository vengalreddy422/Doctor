from pptx import Presentation
from pptx.oxml import parse_xml

src_pptx = 'C:/Users/MSI/.gemini/antigravity/brain/f8e13947-8eea-4ca5-8fe0-973b06cac4fb/.user_uploaded/media_1795531791705_d1dd63c9.pptx'
prs = Presentation(src_pptx)

print(f"Total original slides: {len(prs.slides)}")
for idx, s in enumerate(prs.slides):
    title = ""
    for sh in s.shapes:
        if sh.has_text_frame and sh.text.strip():
            title = sh.text.split('\n')[0]
            break
    print(f"Slide {idx+1}: {title}")
