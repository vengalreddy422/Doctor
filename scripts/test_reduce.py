from pptx import Presentation

src_pptx = 'C:/Users/MSI/.gemini/antigravity/brain/f8e13947-8eea-4ca5-8fe0-973b06cac4fb/.user_uploaded/media_1795531791705_d1dd63c9.pptx'
prs = Presentation(src_pptx)
print('Original slides count:', len(prs.slides))

# Test removing a slide (e.g. Slide 2: Outline)
slide_id_list = prs.slides._sldIdLst
rId = slide_id_list[1].rId
prs.part.drop_rel(rId)
del slide_id_list[1]

print('After removing slide 2:', len(prs.slides))
prs.save('test_reduced.pptx')
print('Saved test_reduced.pptx successfully!')
