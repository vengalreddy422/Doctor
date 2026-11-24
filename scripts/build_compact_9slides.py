"""
Generates the 9-slide ultra-compact edition of CareConnect presentation
using the exact visual design, fonts, shapes, and images from the sample reference PPTX.
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml import parse_xml
import os

src_pptx = 'CareConnect_Internship_Review_1_Sample_Style_Updated.pptx'

# Let's inspect shapes from src_pptx to copy over or build the compact 9-slide version
prs_src = Presentation(src_pptx)
prs_dst = Presentation()
prs_dst.slide_width = prs_src.slide_width
prs_dst.slide_height = prs_src.slide_height

print("Source presentation opened successfully.")
