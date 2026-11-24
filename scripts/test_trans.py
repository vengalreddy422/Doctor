from pptx import Presentation
from pptx.oxml import parse_xml

prs = Presentation()
prs.slide_width = prs.slides[0].width if prs.slides else 12192000
slide = prs.slides.add_slide(prs.slide_layouts[6])
trans_xml = parse_xml('<p:transition xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:fade/></p:transition>')
slide._element.append(trans_xml)
prs.save('test_trans.pptx')
print('Transition successfully added!')
