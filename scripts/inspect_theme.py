import zipfile
import xml.dom.minidom

src_pptx = 'C:/Users/MSI/.gemini/antigravity/brain/f8e13947-8eea-4ca5-8fe0-973b06cac4fb/.user_uploaded/media_1795531791705_d1dd63c9.pptx'

with zipfile.ZipFile(src_pptx, 'r') as z:
    xml_str = z.read('ppt/theme/theme1.xml').decode('utf-8')
    dom = xml.dom.minidom.parseString(xml_str)
    clrScheme = dom.getElementsByTagName('a:clrScheme')[0]
    for child in clrScheme.childNodes:
        if child.nodeType == child.ELEMENT_NODE:
            c = child.getElementsByTagName('a:srgbClr')
            val = c[0].getAttribute('val') if c else child.getElementsByTagName('a:sysClr')[0].getAttribute('lastClr') if child.getElementsByTagName('a:sysClr') else '?'
            print(f"{child.nodeName}: {val}")
    fontScheme = dom.getElementsByTagName('a:fontScheme')[0]
    print("Major font:", fontScheme.getElementsByTagName('a:majorFont')[0].getElementsByTagName('a:latin')[0].getAttribute('typeface'))
    print("Minor font:", fontScheme.getElementsByTagName('a:minorFont')[0].getElementsByTagName('a:latin')[0].getAttribute('typeface'))
