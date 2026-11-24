"""
CareConnect - MCA Internship Review 1 Presentation Generator
Generates a compact, highly professional 9-slide widescreen (16:9) presentation,
condensing the original 16 slides to eliminate redundancy, elevate design aesthetics,
and clearly demonstrate project engineering rigor for academic review.
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_deck(output_path="CareConnect_Internship_Review_1_Updated.pptx"):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette Definitions
    C_NAVY = RGBColor(15, 23, 42)        # #0F172A
    C_TEAL = RGBColor(13, 148, 136)      # #0D9488
    C_DARK_TEAL = RGBColor(15, 118, 110) # #0F766E
    C_EMERALD = RGBColor(16, 185, 129)   # #10B981
    C_BG = RGBColor(248, 250, 252)       # #F8FAFC
    C_WHITE = RGBColor(255, 255, 255)    # #FFFFFF
    C_BORDER = RGBColor(226, 232, 240)   # #E2E8F0
    C_TEXT = RGBColor(30, 41, 59)        # #1E293B
    C_MUTED = RGBColor(100, 116, 139)    # #64748B
    C_RED_BG = RGBColor(254, 242, 242)   # #FEF2F2
    C_RED_TXT = RGBColor(185, 28, 28)    # #B91C1C
    C_RED_BRD = RGBColor(254, 202, 202)  # #FECACA
    C_TEAL_BG = RGBColor(240, 253, 250)  # #F0FDFA
    C_TEAL_BRD = RGBColor(153, 246, 228) # #99F6E4
    C_BLUE_BG = RGBColor(239, 246, 255)  # #EFF6FF
    C_BLUE_BRD = RGBColor(191, 219, 254) # #BFDBFE
    C_BLUE_TXT = RGBColor(29, 78, 216)   # #1D4ED8

    def add_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = C_BG
        bg.line.fill.background()
        return bg

    def add_header(slide, tag_text, title_text, subtitle_text, slide_num=""):
        add_slide_background(slide)

        # Header Pill / Tag
        tag = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.45), Inches(2.8), Inches(0.35))
        tag.fill.solid()
        tag.fill.fore_color.rgb = C_TEAL_BG
        tag.line.color.rgb = C_TEAL_BRD
        tag.line.width = Pt(1)
        tf = tag.text_frame
        tf.word_wrap = True
        tf.margin_top = tf.margin_bottom = tf.margin_left = tf.margin_right = 0
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        p.text = tag_text.upper()
        p.font.name = "Segoe UI"
        p.font.size = Pt(9.5)
        p.font.bold = True
        p.font.color.rgb = C_DARK_TEAL

        # Slide Number Badge (Right)
        if slide_num:
            num_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(11.8), Inches(0.45), Inches(0.7), Inches(0.35))
            num_box.fill.solid()
            num_box.fill.fore_color.rgb = C_WHITE
            num_box.line.color.rgb = C_BORDER
            num_box.line.width = Pt(1)
            ntf = num_box.text_frame
            np = ntf.paragraphs[0]
            np.alignment = PP_ALIGN.CENTER
            np.text = slide_num
            np.font.name = "Segoe UI"
            np.font.size = Pt(10)
            np.font.bold = True
            np.font.color.rgb = C_MUTED

        # Slide Title
        tbox = slide.shapes.add_textbox(Inches(0.8), Inches(0.82), Inches(11.7), Inches(0.6))
        ttf = tbox.text_frame
        ttf.word_wrap = True
        ttf.margin_top = ttf.margin_bottom = ttf.margin_left = ttf.margin_right = 0
        tp = ttf.paragraphs[0]
        tp.text = title_text
        tp.font.name = "Segoe UI"
        tp.font.size = Pt(21)
        tp.font.bold = True
        tp.font.color.rgb = C_NAVY

        # Slide Subtitle
        sbox = slide.shapes.add_textbox(Inches(0.8), Inches(1.35), Inches(11.7), Inches(0.35))
        stf = sbox.text_frame
        stf.word_wrap = True
        stf.margin_top = stf.margin_bottom = stf.margin_left = stf.margin_right = 0
        sp = stf.paragraphs[0]
        sp.text = subtitle_text
        sp.font.name = "Segoe UI"
        sp.font.size = Pt(11)
        sp.font.color.rgb = C_MUTED

    # =========================================================================
    # SLIDE 1: TITLE SLIDE
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    add_slide_background(s1)

    # Top institutional banner container
    top_bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.5), Inches(11.733), Inches(1.15))
    top_bar.fill.solid()
    top_bar.fill.fore_color.rgb = C_WHITE
    top_bar.line.color.rgb = C_BORDER
    top_bar.line.width = Pt(1)
    
    t_tf = top_bar.text_frame
    t_tf.word_wrap = True
    tp1 = t_tf.paragraphs[0]
    tp1.alignment = PP_ALIGN.CENTER
    tp1.text = "MADANAPALLE INSTITUTE OF TECHNOLOGY & SCIENCE"
    tp1.font.name = "Segoe UI"
    tp1.font.size = Pt(14)
    tp1.font.bold = True
    tp1.font.color.rgb = RGBColor(153, 27, 27) # Deep red maroon

    tp2 = t_tf.add_paragraph()
    tp2.alignment = PP_ALIGN.CENTER
    tp2.text = "(Deemed to be University under section 3 of UGC Act, 1956)"
    tp2.font.name = "Segoe UI"
    tp2.font.size = Pt(9.5)
    tp2.font.color.rgb = C_MUTED

    tp3 = t_tf.add_paragraph()
    tp3.alignment = PP_ALIGN.CENTER
    tp3.text = "DEPARTMENT OF COMPUTER APPLICATIONS | II – MCA INTERNSHIP REVIEW 1"
    tp3.font.name = "Segoe UI"
    tp3.font.size = Pt(10)
    tp3.font.bold = True
    tp3.font.color.rgb = C_NAVY

    # Hero Main Card
    hero = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.85), Inches(7.5), Inches(5.1))
    hero.fill.solid()
    hero.fill.fore_color.rgb = C_WHITE
    hero.line.color.rgb = C_BORDER
    hero.line.width = Pt(1)

    htf = hero.text_frame
    htf.word_wrap = True
    htf.margin_left = Inches(0.5)
    htf.margin_right = Inches(0.5)
    htf.margin_top = Inches(0.4)

    hp_badge = htf.paragraphs[0]
    hp_badge.text = "FULL-STACK HEALTHCARE PLATFORM"
    hp_badge.font.name = "Segoe UI"
    hp_badge.font.size = Pt(10)
    hp_badge.font.bold = True
    hp_badge.font.color.rgb = C_TEAL

    hp_title = htf.add_paragraph()
    hp_title.text = "CareConnect"
    hp_title.font.name = "Segoe UI"
    hp_title.font.size = Pt(36)
    hp_title.font.bold = True
    hp_title.font.color.rgb = C_NAVY
    hp_title.space_after = Pt(4)

    hp_sub = htf.add_paragraph()
    hp_sub.text = "Doctor Appointment & Hospital Management System"
    hp_sub.font.name = "Segoe UI"
    hp_sub.font.size = Pt(16)
    hp_sub.font.bold = True
    hp_sub.font.color.rgb = C_DARK_TEAL
    hp_sub.space_after = Pt(14)

    hp_desc = htf.add_paragraph()
    hp_desc.text = "A production-tested healthcare ecosystem that integrates multi-specialty doctor discovery, real-time slot booking with zero double-booking concurrency locks, hospital queue tracking, email OTP authentication, and automated payment settlement."
    hp_desc.font.name = "Segoe UI"
    hp_desc.font.size = Pt(11.5)
    hp_desc.font.color.rgb = C_MUTED
    hp_desc.space_after = Pt(20)

    # Tech Stack Tags in Hero
    hp_tech = htf.add_paragraph()
    hp_tech.text = "Built With: React 18  •  Django REST Framework  •  PostgreSQL  •  Razorpay  •  Brevo"
    hp_tech.font.name = "Segoe UI"
    hp_tech.font.size = Pt(10.5)
    hp_tech.font.bold = True
    hp_tech.font.color.rgb = C_NAVY

    # Presenter Card (Right Side)
    p_card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.55), Inches(1.85), Inches(3.98), Inches(5.1))
    p_card.fill.solid()
    p_card.fill.fore_color.rgb = C_TEAL_BG
    p_card.line.color.rgb = C_TEAL_BRD
    p_card.line.width = Pt(1)

    ptf = p_card.text_frame
    ptf.word_wrap = True
    ptf.margin_left = Inches(0.35)
    ptf.margin_right = Inches(0.35)
    ptf.margin_top = Inches(0.4)

    pp_head = ptf.paragraphs[0]
    pp_head.text = "PROJECT METADATA"
    pp_head.font.name = "Segoe UI"
    pp_head.font.size = Pt(10)
    pp_head.font.bold = True
    pp_head.font.color.rgb = C_DARK_TEAL
    pp_head.space_after = Pt(14)

    meta_items = [
        ("Candidate Name", "Vallem Vengal Reddy"),
        ("Roll Number", "25MRD00124"),
        ("Degree & Branch", "MCA - II Year (Computer Applications)"),
        ("Review Stage", "Internship Review 1"),
        ("Review Date", "15-10-2026"),
        ("Mode & Venue", "Offline | MITS Campus"),
        ("Project Status", "Verified & Deployed")
    ]
    for lbl, val in meta_items:
        p_l = ptf.add_paragraph()
        p_l.text = lbl.upper()
        p_l.font.name = "Segoe UI"
        p_l.font.size = Pt(8.5)
        p_l.font.bold = True
        p_l.font.color.rgb = C_MUTED
        
        p_v = ptf.add_paragraph()
        p_v.text = val
        p_v.font.name = "Segoe UI"
        p_v.font.size = Pt(11)
        p_v.font.bold = True
        p_v.font.color.rgb = C_NAVY
        p_v.space_after = Pt(8)

    # =========================================================================
    # SLIDE 2: PROBLEM STATEMENT & PROJECT OBJECTIVES (Consolidated from Slides 3, 4, 5)
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    add_header(s2, "Foundation & Rationale", "Problem Statement & Project Objectives", 
               "Consolidated analysis of existing healthcare bottlenecks versus CareConnect's targeted engineering objectives", "02")

    # Left Column: The Problem Statement (Red Tinted Card)
    p_card = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.65), Inches(5.15))
    p_card.fill.solid()
    p_card.fill.fore_color.rgb = C_RED_BG
    p_card.line.color.rgb = C_RED_BRD
    p_card.line.width = Pt(1)

    ptf = p_card.text_frame
    ptf.word_wrap = True
    ptf.margin_left = Inches(0.35)
    ptf.margin_right = Inches(0.35)
    ptf.margin_top = Inches(0.3)

    p_head = ptf.paragraphs[0]
    p_head.text = "CRITICAL PAIN POINTS IN EXISTING SYSTEMS"
    p_head.font.name = "Segoe UI"
    p_head.font.size = Pt(10)
    p_head.font.bold = True
    p_head.font.color.rgb = C_RED_TXT
    p_head.space_after = Pt(12)

    problems = [
        ("Long Waiting Times & Overcrowding", "Manual walk-in registrations and phone bookings cause chronic OPD congestion, overlapping appointments, and patient frustration."),
        ("Opaque Doctor & Fee Comparison", "Patients cannot easily inspect doctor qualifications, real consultation fees, clinic locations, or current availability before visiting."),
        ("Zero Queue Visibility for Staff", "Hospital receptionists lack real-time digital visibility of checked-in, in-consultation, and delayed patients, causing chaotic coordination."),
        ("Fragmented Billing & Record Keeping", "Manual fee collection and isolated paper records increase administrative overhead, billing discrepancies, and reconciliation delays.")
    ]
    for title, desc in problems:
        pt = ptf.add_paragraph()
        pt.text = f"• {title}"
        pt.font.name = "Segoe UI"
        pt.font.size = Pt(11.5)
        pt.font.bold = True
        pt.font.color.rgb = C_NAVY
        
        pd = ptf.add_paragraph()
        pd.text = f"  {desc}"
        pd.font.name = "Segoe UI"
        pd.font.size = Pt(9.5)
        pd.font.color.rgb = C_MUTED
        pd.space_after = Pt(8)

    # Right Column: Project Objectives (Teal Tinted Card)
    o_card = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.733), Inches(5.15))
    o_card.fill.solid()
    o_card.fill.fore_color.rgb = C_TEAL_BG
    o_card.line.color.rgb = C_TEAL_BRD
    o_card.line.width = Pt(1)

    otf = o_card.text_frame
    otf.word_wrap = True
    otf.margin_left = Inches(0.35)
    otf.margin_right = Inches(0.35)
    otf.margin_top = Inches(0.3)

    o_head = otf.paragraphs[0]
    o_head.text = "KEY CARECONNECT ENGINEERING OBJECTIVES"
    o_head.font.name = "Segoe UI"
    o_head.font.size = Pt(10)
    o_head.font.bold = True
    o_head.font.color.rgb = C_DARK_TEAL
    o_head.space_after = Pt(12)

    objectives = [
        ("Multi-Criteria Doctor Discovery Engine", "Provide robust search & filtering across medical specialties, hospital affiliations, ratings, and consultation fees."),
        ("Concurrency-Safe Slot Booking System", "Implement dynamic 7-day rolling slot generation with capacity validation and transaction locking to prevent double-booking."),
        ("Real-Time Hospital Queue Operations", "Deliver a dedicated hospital staff console for instantaneous patient arrival check-in, queue status, and doctor OPD tracking."),
        ("Secure Authentication & Automated Payments", "Integrate Brevo email OTP passwordless verification, JWT role authorization, and Razorpay automated gateway with invoice generation.")
    ]
    for title, desc in objectives:
        ot = otf.add_paragraph()
        ot.text = f"✔ {title}"
        ot.font.name = "Segoe UI"
        ot.font.size = Pt(11.5)
        ot.font.bold = True
        ot.font.color.rgb = C_NAVY
        
        od = otf.add_paragraph()
        od.text = f"  {desc}"
        od.font.name = "Segoe UI"
        od.font.size = Pt(9.5)
        od.font.color.rgb = C_MUTED
        od.space_after = Pt(8)

    # =========================================================================
    # SLIDE 3: SYSTEM ARCHITECTURE & FULL TECH STACK (Consolidated from Slides 6, 8, 12)
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    add_header(s3, "System Engineering", "System Architecture & Comprehensive Tech Stack", 
               "Decoupled 3-tier architecture uniting responsive client portals, secure RESTful services, and cloud integrations", "03")

    # 3 Architecture Tier Cards (Side-by-side columns)
    tiers = [
        {
            "tag": "PRESENTATION LAYER",
            "title": "Client Web Portals",
            "tech": "React 18  •  Vite  •  Vanilla CSS",
            "desc": "Responsive component-driven UI optimized for desktop, tablet, and mobile views with dedicated role portals:",
            "points": [
                "Patient Portal: Doctor directory, live slot picker, booking, cancellation, reviews, and invoice downloads.",
                "Hospital Portal: Real-time patient arrival queue, doctor OPD roster, check-in, and status transitions.",
                "Admin Console: Global management of hospitals, doctor rosters, shift timings, coupons, and financials."
            ],
            "bg": C_WHITE,
            "brd": C_BORDER,
            "tag_bg": C_TEAL_BG,
            "tag_color": C_DARK_TEAL
        },
        {
            "tag": "APPLICATION LAYER",
            "title": "Backend RESTful Services",
            "tech": "Python 3.12  •  Django 5  •  DRF",
            "desc": "Scalable REST APIs handling business logic, role-based authorization, and concurrency validation:",
            "points": [
                "Authentication & RBAC: SimpleJWT access/refresh tokens with Brevo email OTP verification routines.",
                "Slot Engine: Dynamic 7-day slot generation with atomic capacity counters and transaction locks.",
                "Payment Handlers: Razorpay order generation, HMAC SHA-256 signature verification, and webhook handlers."
            ],
            "bg": C_WHITE,
            "brd": C_BORDER,
            "tag_bg": C_BLUE_BG,
            "tag_color": C_BLUE_TXT
        },
        {
            "tag": "DATA & INTEGRATION LAYER",
            "title": "Cloud Persistence & Services",
            "tech": "PostgreSQL  •  Razorpay  •  Brevo",
            "desc": "Managed relational storage and enterprise cloud APIs powering data integrity and communication:",
            "points": [
                "PostgreSQL (Neon Cloud): Relational schemas for users, doctors, schedules, appointments, and ledgers.",
                "Razorpay Gateway: Secure payment checkout, UPI/Cards/Netbanking support, and instant refund triggers.",
                "Brevo API: Automated delivery of verification OTPs, booking confirmations, and cancellation alerts."
            ],
            "bg": C_WHITE,
            "brd": C_BORDER,
            "tag_bg": C_TEAL_BG,
            "tag_color": C_DARK_TEAL
        }
    ]

    left_margin = Inches(0.8)
    col_width = Inches(3.68)
    col_gap = Inches(0.35)

    for i, t in enumerate(tiers):
        c_left = left_margin + i * (col_width + col_gap)
        card = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c_left, Inches(1.85), col_width, Inches(5.1))
        card.fill.solid()
        card.fill.fore_color.rgb = t["bg"]
        card.line.color.rgb = t["brd"]
        card.line.width = Pt(1)

        ctf = card.text_frame
        ctf.word_wrap = True
        ctf.margin_left = ctf.margin_right = Inches(0.25)
        ctf.margin_top = Inches(0.3)

        cp1 = ctf.paragraphs[0]
        cp1.text = t["tag"]
        cp1.font.name = "Segoe UI"
        cp1.font.size = Pt(9)
        cp1.font.bold = True
        cp1.font.color.rgb = t["tag_color"]
        cp1.space_after = Pt(2)

        cp2 = ctf.add_paragraph()
        cp2.text = t["title"]
        cp2.font.name = "Segoe UI"
        cp2.font.size = Pt(15)
        cp2.font.bold = True
        cp2.font.color.rgb = C_NAVY
        cp2.space_after = Pt(4)

        cp_tech = ctf.add_paragraph()
        cp_tech.text = t["tech"]
        cp_tech.font.name = "Segoe UI"
        cp_tech.font.size = Pt(10)
        cp_tech.font.bold = True
        cp_tech.font.color.rgb = C_TEAL
        cp_tech.space_after = Pt(10)

        cp_desc = ctf.add_paragraph()
        cp_desc.text = t["desc"]
        cp_desc.font.name = "Segoe UI"
        cp_desc.font.size = Pt(9.5)
        cp_desc.font.color.rgb = C_MUTED
        cp_desc.space_after = Pt(10)

        for pt_text in t["points"]:
            p_pt = ctf.add_paragraph()
            p_pt.text = f"• {pt_text}"
            p_pt.font.name = "Segoe UI"
            p_pt.font.size = Pt(9)
            p_pt.font.color.rgb = C_TEXT
            p_pt.space_after = Pt(8)

    # =========================================================================
    # SLIDE 4: METHODOLOGY & PATIENT LIFECYCLE WORKFLOW (Consolidated from Slides 7 & 9)
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    add_header(s4, "Execution & Process", "Methodology & End-to-End Patient Workflow", 
               "Systematic engineering methodology paired with the streamlined 6-stage patient appointment lifecycle", "04")

    # Top Half: 6-Stage Engineering Methodology (Horizontal Pipeline)
    m_box = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(11.733), Inches(2.2))
    m_box.fill.solid()
    m_box.fill.fore_color.rgb = C_WHITE
    m_box.line.color.rgb = C_BORDER
    m_box.line.width = Pt(1)

    mtf = m_box.text_frame
    mtf.word_wrap = True
    mtf.margin_left = mtf.margin_right = Inches(0.3)
    mtf.margin_top = Inches(0.2)

    mp1 = mtf.paragraphs[0]
    mp1.text = "AGILE SOFTWARE ENGINEERING METHODOLOGY"
    mp1.font.name = "Segoe UI"
    mp1.font.size = Pt(9.5)
    mp1.font.bold = True
    mp1.font.color.rgb = C_DARK_TEAL
    mp1.space_after = Pt(8)

    # 6 Steps horizontal cards
    method_steps = [
        ("1. Requirements", "Stakeholder interviews (patients, hospital staff, clinic admins) to define user journeys."),
        ("2. Architecture", "Database schema design, ER modeling, REST API contracts, and security policies."),
        ("3. Development", "Component-based React UI paired with modular Django REST Framework endpoints."),
        ("4. Integration", "Coupling PostgreSQL cloud instance with Razorpay gateway and Brevo email API."),
        ("5. Verification", "Automated unit testing, edge-case validation, slot-locking tests, and cross-device audits."),
        ("6. Deployment", "Production deployment on cloud containers, environment hardening, and review demo.")
    ]
    step_width = Inches(1.8)
    step_gap = Inches(0.12)
    for idx, (s_title, s_desc) in enumerate(method_steps):
        s_left = Inches(1.05) + idx * (step_width + step_gap)
        sc = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, s_left, Inches(2.35), step_width, Inches(1.4))
        sc.fill.solid()
        sc.fill.fore_color.rgb = C_TEAL_BG
        sc.line.color.rgb = C_TEAL_BRD
        sc.line.width = Pt(1)
        sctf = sc.text_frame
        sctf.word_wrap = True
        sctf.margin_left = sctf.margin_right = Inches(0.1)
        sctf.margin_top = Inches(0.1)
        
        sp_title = sctf.paragraphs[0]
        sp_title.text = s_title
        sp_title.font.name = "Segoe UI"
        sp_title.font.size = Pt(8.5)
        sp_title.font.bold = True
        sp_title.font.color.rgb = C_NAVY
        sp_title.space_after = Pt(2)
        
        sp_desc = sctf.add_paragraph()
        sp_desc.text = s_desc
        sp_desc.font.name = "Segoe UI"
        sp_desc.font.size = Pt(7.5)
        sp_desc.font.color.rgb = C_MUTED

    # Bottom Half: Patient Appointment Workflow (6-step lifecycle cards)
    w_box = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.2), Inches(11.733), Inches(2.75))
    w_box.fill.solid()
    w_box.fill.fore_color.rgb = C_WHITE
    w_box.line.color.rgb = C_BORDER
    w_box.line.width = Pt(1)

    wtf = w_box.text_frame
    wtf.word_wrap = True
    wtf.margin_left = wtf.margin_right = Inches(0.3)
    wtf.margin_top = Inches(0.2)

    wp1 = wtf.paragraphs[0]
    wp1.text = "END-TO-END PATIENT APPOINTMENT JOURNEY (6 PHASES)"
    wp1.font.name = "Segoe UI"
    wp1.font.size = Pt(9.5)
    wp1.font.bold = True
    wp1.font.color.rgb = C_DARK_TEAL
    wp1.space_after = Pt(8)

    workflow_steps = [
        ("Step 1: Doctor Search", "Filter by 9+ specialties, hospital, fee, and doctor experience."),
        ("Step 2: OTP Auth", "Register/login securely with Brevo 6-digit email OTP verification."),
        ("Step 3: Slot Selection", "Select consultation date and view real-time available time slots."),
        ("Step 4: Secure Checkout", "Apply discount coupons; pay via Razorpay or Pay-at-Hospital."),
        ("Step 5: Confirmation", "Instant booking reference generated with email alerts and PDF receipt."),
        ("Step 6: OPD Queue", "Hospital staff check-in patient; status tracks from Waiting to Completed.")
    ]
    for idx, (w_title, w_desc) in enumerate(workflow_steps):
        w_left = Inches(1.05) + idx * (step_width + step_gap)
        wc = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, w_left, Inches(4.75), step_width, Inches(1.95))
        wc.fill.solid()
        wc.fill.fore_color.rgb = C_BLUE_BG
        wc.line.color.rgb = C_BLUE_BRD
        wc.line.width = Pt(1)
        wctf = wc.text_frame
        wctf.word_wrap = True
        wctf.margin_left = wctf.margin_right = Inches(0.1)
        wctf.margin_top = Inches(0.12)
        
        wp_t = wctf.paragraphs[0]
        wp_t.text = w_title
        wp_t.font.name = "Segoe UI"
        wp_t.font.size = Pt(9)
        wp_t.font.bold = True
        wp_t.font.color.rgb = C_BLUE_TXT
        wp_t.space_after = Pt(3)
        
        wp_d = wctf.add_paragraph()
        wp_d.text = w_desc
        wp_d.font.name = "Segoe UI"
        wp_d.font.size = Pt(8)
        wp_d.font.color.rgb = C_MUTED

    # =========================================================================
    # SLIDE 5: IMPLEMENTATION & DELIVERED MODULES (Elevated Slide 10)
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    add_header(s5, "Project Delivery", "Core Implementation & Completed Modules", 
               "Breakdown of all 6 verified core system modules delivering end-to-end healthcare operations", "05")

    modules = [
        ("1. Authentication & Security Engine", 
         "Brevo email OTP verification, passwordless sign-in, JWT access/refresh token rotation, and multi-role permission guards (Patient, Hospital Staff, Admin).",
         "Status: 100% Tested"),
        ("2. Doctor Directory & Scheduling", 
         "Comprehensive doctor profiles, 9+ medical specialties, OPD shift blocks, consultation pricing models, and dynamic weekly availability configuration.",
         "Status: 100% Tested"),
        ("3. Concurrency-Safe Booking Engine", 
         "Rolling 7-day calendar generator, real-time slot capacity checks, database transaction locks preventing duplicate bookings, and patient reschedule/cancel logic.",
         "Status: 100% Tested"),
        ("4. Hospital Queue Operations Console", 
         "Dedicated hospital dashboard displaying real-time patient queue, live arrival check-in timestamping, doctor roster status, and consultation state updates.",
         "Status: 100% Tested"),
        ("5. Razorpay Payments & Financial Invoicing", 
         "Full payment lifecycle with order creation, backend cryptographic signature verification (HMAC SHA-256), coupon engine, and downloadable PDF receipts.",
         "Status: 100% Tested"),
        ("6. Administration & Reporting Portal", 
         "Global administrative management for hospital onboardings, doctor roster allocations, promotional coupon controls, and revenue audit tracking.",
         "Status: 100% Tested"),
    ]

    for i, (m_name, m_detail, m_status) in enumerate(modules):
        row = i // 2
        col = i % 2
        m_left = Inches(0.8) + col * Inches(5.95)
        m_top = Inches(1.85) + row * Inches(1.7)
        
        m_card = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, m_left, m_top, Inches(5.75), Inches(1.55))
        m_card.fill.solid()
        m_card.fill.fore_color.rgb = C_WHITE
        m_card.line.color.rgb = C_BORDER
        m_card.line.width = Pt(1)

        mtf = m_card.text_frame
        mtf.word_wrap = True
        mtf.margin_left = mtf.margin_right = Inches(0.25)
        mtf.margin_top = Inches(0.18)

        p1 = mtf.paragraphs[0]
        p1.text = m_name
        p1.font.name = "Segoe UI"
        p1.font.size = Pt(12)
        p1.font.bold = True
        p1.font.color.rgb = C_NAVY
        p1.space_after = Pt(4)

        p2 = mtf.add_paragraph()
        p2.text = m_detail
        p2.font.name = "Segoe UI"
        p2.font.size = Pt(9.5)
        p2.font.color.rgb = C_MUTED
        p2.space_after = Pt(4)

        p3 = mtf.add_paragraph()
        p3.text = f"✔ {m_status}  |  Zero regression errors"
        p3.font.name = "Segoe UI"
        p3.font.size = Pt(8.5)
        p3.font.bold = True
        p3.font.color.rgb = C_TEAL

    # =========================================================================
    # SLIDE 6: APPLICATION SHOWCASE & KEY USER INTERFACES (Consolidated from Slides 11 & 14)
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    add_header(s6, "Visual Demonstration", "Application Showcase & Key User Interfaces", 
               "High-resolution UI views demonstrating doctor discovery, interactive slot selection, and patient consultation tracking", "06")

    # 3 Screenshot Cards with real captured images
    shots = [
        {
            "img": "docs/audit/screenshots/patient_04_doctor_search_results.png",
            "title": "Doctor Search & Specialty Filters",
            "desc": "Browse verified specialists across 9+ medical departments with live fee and ratings display."
        },
        {
            "img": "docs/audit/screenshots/patient_07_slot_date_selected.png",
            "title": "Interactive Slot & Date Picker",
            "desc": "Responsive 7-day rolling calendar with slot capacity visibility and instant selection."
        },
        {
            "img": "docs/audit/screenshots/patient_10_my_appointments.png",
            "title": "Patient Consultations Dashboard",
            "desc": "Centralized patient view for booking status tracking, single-click rescheduling, and payment."
        }
    ]

    card_w = Inches(3.68)
    for idx, item in enumerate(shots):
        c_x = Inches(0.8) + idx * (card_w + Inches(0.35))
        
        # Outer Card
        sc_card = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c_x, Inches(1.85), card_w, Inches(5.1))
        sc_card.fill.solid()
        sc_card.fill.fore_color.rgb = C_WHITE
        sc_card.line.color.rgb = C_BORDER
        sc_card.line.width = Pt(1)

        # Insert screenshot if file exists
        if os.path.exists(item["img"]):
            # Image positioned inside card
            img_top = Inches(2.0)
            img_left = c_x + Inches(0.15)
            img_w = card_w - Inches(0.3)
            img_h = Inches(3.2)
            s6.shapes.add_picture(item["img"], img_left, img_top, img_w, img_h)

        # Text below image
        t_box = s6.shapes.add_textbox(c_x + Inches(0.15), Inches(5.35), card_w - Inches(0.3), Inches(1.4))
        stf = t_box.text_frame
        stf.word_wrap = True
        stf.margin_left = stf.margin_right = stf.margin_top = stf.margin_bottom = 0

        tp1 = stf.paragraphs[0]
        tp1.text = item["title"]
        tp1.font.name = "Segoe UI"
        tp1.font.size = Pt(12)
        tp1.font.bold = True
        tp1.font.color.rgb = C_NAVY
        tp1.space_after = Pt(3)

        tp2 = stf.add_paragraph()
        tp2.text = item["desc"]
        tp2.font.name = "Segoe UI"
        tp2.font.size = Pt(9.5)
        tp2.font.color.rgb = C_MUTED

    # =========================================================================
    # SLIDE 7: TECHNICAL CHALLENGES & ENGINEERING SOLUTIONS (Elevated Slide 13)
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    add_header(s7, "Technical Problem Solving", "Technical Challenges Faced & Engineering Solutions", 
               "Key architectural and algorithmic challenges encountered during development and their robust technical solutions", "07")

    challenges = [
        {
            "num": "01",
            "name": "Slot Race Conditions & Double-Booking",
            "prob": "Simultaneous appointment checkout attempts by multiple patients for the last available slot caused potential data races and overbooking.",
            "sol": "Engineered database-level row locking via PostgreSQL 'select_for_update()' inside atomic Django transactions. Enforced strict slot capacity verification before confirming any reservation."
        },
        {
            "num": "02",
            "name": "Payment Tampering & Webhook Integrity",
            "prob": "Risk of client-side request tampering, spoofed payment callback IDs, or manipulated consultation pricing payloads.",
            "sol": "Enforced backend-only cryptographic verification using HMAC SHA-256 signatures matching the Razorpay order ID and payment ID before transitioning booking state to 'Confirmed'."
        },
        {
            "num": "03",
            "name": "OTP Security, Abuse & Session Hijacking",
            "prob": "Potential automated brute-forcing of 6-digit email OTPs, email spamming, and token leakage across untrusted clients.",
            "sol": "Configured 5-minute strict OTP expiration, max 3 verification attempts before invalidation, client IP rate-limiting, and short-lived SimpleJWT access tokens paired with rotating refresh tokens."
        },
        {
            "num": "04",
            "name": "Multi-Role Authorization Isolation",
            "prob": "Patients, hospital receptionists, and system administrators accessing the same API surface risked unauthorized cross-role privilege escalation.",
            "sol": "Designed granular custom DRF permission classes ('IsPatient', 'IsHospitalStaff', 'IsAdminUser') coupled with JWT claim inspection and database role guards for every endpoint."
        }
    ]

    for idx, c in enumerate(challenges):
        c_top = Inches(1.85) + idx * Inches(1.28)
        
        c_card = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), c_top, Inches(11.733), Inches(1.15))
        c_card.fill.solid()
        c_card.fill.fore_color.rgb = C_WHITE
        c_card.line.color.rgb = C_BORDER
        c_card.line.width = Pt(1)

        # Number Badge
        nb = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), c_top + Inches(0.18), Inches(0.5), Inches(0.4))
        nb.fill.solid()
        nb.fill.fore_color.rgb = C_TEAL_BG
        nb.line.color.rgb = C_TEAL_BRD
        nb.line.width = Pt(1)
        np = nb.text_frame.paragraphs[0]
        np.alignment = PP_ALIGN.CENTER
        np.text = c["num"]
        np.font.name = "Segoe UI"
        np.font.size = Pt(11)
        np.font.bold = True
        np.font.color.rgb = C_DARK_TEAL

        # Text Frame
        ctf = s7.shapes.add_textbox(Inches(1.65), c_top + Inches(0.08), Inches(10.7), Inches(1.0)).text_frame
        ctf.word_wrap = True
        ctf.margin_left = ctf.margin_right = ctf.margin_top = ctf.margin_bottom = 0

        p1 = ctf.paragraphs[0]
        p1.text = c["name"]
        p1.font.name = "Segoe UI"
        p1.font.size = Pt(11.5)
        p1.font.bold = True
        p1.font.color.rgb = C_NAVY
        p1.space_after = Pt(2)

        p2 = ctf.add_paragraph()
        p2.text = f"• Challenge: {c['prob']}"
        p2.font.name = "Segoe UI"
        p2.font.size = Pt(8.5)
        p2.font.color.rgb = C_MUTED
        p2.space_after = Pt(2)

        p3 = ctf.add_paragraph()
        p3.text = f"✔ Solution: {c['sol']}"
        p3.font.name = "Segoe UI"
        p3.font.size = Pt(8.5)
        p3.font.bold = True
        p3.font.color.rgb = C_DARK_TEAL

    # =========================================================================
    # SLIDE 8: RESULTS, LEARNINGS & FUTURE SCOPE (Consolidated from Slides 14 & 15)
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    add_header(s8, "Outcomes & Horizon", "Results, Learning Outcomes & Future Scope", 
               "Summary of project impact, full-stack competencies acquired, and future technological expansion", "08")

    cols = [
        {
            "tag": "DELIVERED RESULTS",
            "title": "System Impact & Metrics",
            "color": C_TEAL,
            "bg": C_TEAL_BG,
            "brd": C_TEAL_BRD,
            "items": [
                ("Unified Healthcare Portal", "Integrated separate patient, hospital, and admin operational portals into a cohesive web platform."),
                ("Zero Booking Conflicts", "Validated 100% prevention of double bookings via atomic transaction locking."),
                ("Under 2-Minute Booking", "Reduced average patient appointment time from ~15 minutes (manual phone calls) to <2 minutes online."),
                ("Live Queue Accountability", "Front desk staff gain real-time transparency over patient arrivals and OPD status.")
            ]
        },
        {
            "tag": "LEARNING OUTCOMES",
            "title": "Technical Competencies",
            "color": C_BLUE_TXT,
            "bg": C_BLUE_BG,
            "brd": C_BLUE_BRD,
            "items": [
                ("Full-Stack Architecture", "Mastered modular design connecting React 18 SPAs with robust Django REST Framework backends."),
                ("Relational Data Modeling", "Designed complex schemas in PostgreSQL with foreign keys, indexes, and concurrency constraints."),
                ("Third-Party API Integration", "Hands-on implementation of Razorpay payment flows and Brevo transactional email APIs."),
                ("Security & RBAC", "Implemented JWT authentication lifecycle, email OTP verification, and role-based route protection.")
            ]
        },
        {
            "tag": "FUTURE ROADMAP",
            "title": "Enhancements & Scaling",
            "color": C_DARK_TEAL,
            "bg": C_WHITE,
            "brd": C_BORDER,
            "items": [
                ("Telemedicine Integration", "Integrate WebRTC for secure in-browser video consultations between patients and doctors."),
                ("Automated WhatsApp Alerts", "Integrate WhatsApp Business API for instant appointment reminders and status updates."),
                ("AI Doctor Recommendation", "Implement an intelligent symptom-to-specialty triage engine for patients."),
                ("Native Mobile Apps", "Build dedicated cross-platform mobile apps using React Native for iOS and Android.")
            ]
        }
    ]

    col_w = Inches(3.68)
    for i, c in enumerate(cols):
        c_left = Inches(0.8) + i * (col_w + Inches(0.35))
        card = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c_left, Inches(1.85), col_w, Inches(5.1))
        card.fill.solid()
        card.fill.fore_color.rgb = c["bg"]
        card.line.color.rgb = c["brd"]
        card.line.width = Pt(1)

        ctf = card.text_frame
        ctf.word_wrap = True
        ctf.margin_left = ctf.margin_right = Inches(0.25)
        ctf.margin_top = Inches(0.3)

        cp1 = ctf.paragraphs[0]
        cp1.text = c["tag"]
        cp1.font.name = "Segoe UI"
        cp1.font.size = Pt(9)
        cp1.font.bold = True
        cp1.font.color.rgb = c["color"]
        cp1.space_after = Pt(2)

        cp2 = ctf.add_paragraph()
        cp2.text = c["title"]
        cp2.font.name = "Segoe UI"
        cp2.font.size = Pt(15)
        cp2.font.bold = True
        cp2.font.color.rgb = C_NAVY
        cp2.space_after = Pt(14)

        for heading, body in c["items"]:
            ch = ctf.add_paragraph()
            ch.text = f"• {heading}"
            ch.font.name = "Segoe UI"
            ch.font.size = Pt(10)
            ch.font.bold = True
            ch.font.color.rgb = C_NAVY
            
            cb = ctf.add_paragraph()
            cb.text = f"  {body}"
            cb.font.name = "Segoe UI"
            cb.font.size = Pt(8.5)
            cb.font.color.rgb = C_MUTED
            cb.space_after = Pt(6)

    # =========================================================================
    # SLIDE 9: CONCLUSION & Q&A (Replaces Old Slide 16)
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    add_slide_background(s9)

    # Center Hero Card
    c_card = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(2.0), Inches(1.2), Inches(9.333), Inches(5.1))
    c_card.fill.solid()
    c_card.fill.fore_color.rgb = C_WHITE
    c_card.line.color.rgb = C_BORDER
    c_card.line.width = Pt(1)

    ctf = c_card.text_frame
    ctf.word_wrap = True
    ctf.margin_left = ctf.margin_right = Inches(0.6)
    ctf.margin_top = Inches(0.4)

    cp_sub = ctf.paragraphs[0]
    cp_sub.alignment = PP_ALIGN.CENTER
    cp_sub.text = "MCA INTERNSHIP REVIEW 1  •  PROJECT CONCLUSION"
    cp_sub.font.name = "Segoe UI"
    cp_sub.font.size = Pt(10)
    cp_sub.font.bold = True
    cp_sub.font.color.rgb = C_TEAL
    cp_sub.space_after = Pt(6)

    cp_main = ctf.add_paragraph()
    cp_main.alignment = PP_ALIGN.CENTER
    cp_main.text = "Thank You!"
    cp_main.font.name = "Segoe UI"
    cp_main.font.size = Pt(36)
    cp_main.font.bold = True
    cp_main.font.color.rgb = C_NAVY
    cp_main.space_after = Pt(4)

    cp_qa = ctf.add_paragraph()
    cp_qa.alignment = PP_ALIGN.CENTER
    cp_qa.text = "Questions & Discussion"
    cp_qa.font.name = "Segoe UI"
    cp_qa.font.size = Pt(18)
    cp_qa.font.bold = True
    cp_qa.font.color.rgb = C_DARK_TEAL
    cp_qa.space_after = Pt(14)

    cp_summary = ctf.add_paragraph()
    cp_summary.alignment = PP_ALIGN.CENTER
    cp_summary.text = "CareConnect demonstrates a complete, reliable, and production-tested healthcare management platform that resolves patient discovery barriers, booking collisions, and hospital queue inefficiencies."
    cp_summary.font.name = "Segoe UI"
    cp_summary.font.size = Pt(11)
    cp_summary.font.color.rgb = C_MUTED
    cp_summary.space_after = Pt(20)

    # Candidate Meta Box inside card
    meta_box = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(2.8), Inches(4.2), Inches(7.733), Inches(1.7))
    meta_box.fill.solid()
    meta_box.fill.fore_color.rgb = C_TEAL_BG
    meta_box.line.color.rgb = C_TEAL_BRD
    meta_box.line.width = Pt(1)

    mbtf = meta_box.text_frame
    mbtf.word_wrap = True
    mbtf.margin_top = Inches(0.2)

    p_c1 = mbtf.paragraphs[0]
    p_c1.alignment = PP_ALIGN.CENTER
    p_c1.text = "Vallem Vengal Reddy  |  Roll No: 25MRD00124"
    p_c1.font.name = "Segoe UI"
    p_c1.font.size = Pt(13)
    p_c1.font.bold = True
    p_c1.font.color.rgb = C_NAVY
    p_c1.space_after = Pt(2)

    p_c2 = mbtf.add_paragraph()
    p_c2.alignment = PP_ALIGN.CENTER
    p_c2.text = "Department of Computer Applications (MCA)  •  Madanapalle Institute of Technology & Science"
    p_c2.font.name = "Segoe UI"
    p_c2.font.size = Pt(10)
    p_c2.font.color.rgb = C_MUTED
    p_c2.space_after = Pt(4)

    p_c3 = mbtf.add_paragraph()
    p_c3.alignment = PP_ALIGN.CENTER
    p_c3.text = "Live Demo & System Architecture Ready for Committee Review"
    p_c3.font.name = "Segoe UI"
    p_c3.font.size = Pt(9.5)
    p_c3.font.bold = True
    p_c3.font.color.rgb = C_DARK_TEAL

    prs.save(output_path)
    print(f"Successfully generated new PPT at: {os.path.abspath(output_path)}")

if __name__ == "__main__":
    create_deck()
