import zipfile
import xml.dom.minidom

src_pptx = 'C:/Users/MSI/.gemini/antigravity/brain/f8e13947-8eea-4ca5-8fe0-973b06cac4fb/.user_uploaded/media_1795531791705_d1dd63c9.pptx'

with zipfile.ZipFile(src_pptx, 'r') as z:
    for s_name in ['ppt/slides/slide1.xml', 'ppt/slides/slide4.xml', 'ppt/slides/slide6.xml']:
        xml_str = z.read(s_name).decode('utf-8')
        dom = xml.dom.minidom.parseString(xml_str)
        print(f"=== {s_name} ===")
        # Find srgbClr or schemeClr
        colors = []
        for elem in dom.getElementsByTagName('a:srgbClr'):
            val = elem.getAttribute('val')
            if val not in colors:
                colors.append(val)
        print("  srgbClr:", colors)
        fonts = []
        for elem in dom.getElementsByTagName('a:latin'):
            typeface = elem.getAttribute('typeface')
            if typeface not in fonts:
                fonts.append(typeface)
        print("  fonts:", fonts)
