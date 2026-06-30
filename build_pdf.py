import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, HRFlowable, PageBreak
from reportlab.lib.units import inch

def build_pdf():
    pdf_filename = "SUBMISSION.pdf"
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    saffron = colors.HexColor("#e8691a")
    dark_gray = colors.HexColor("#121212")
    light_bg = colors.HexColor("#f8f9fa")
    teal = colors.HexColor("#1a6e6e")
    
    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.black,
        alignment=1, # Center
        spaceAfter=12
    )
    
    h1_style = ParagraphStyle(
        'DocH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=dark_gray,
        spaceBefore=14,
        spaceAfter=10
    )

    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=saffron,
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=15.5,
        textColor=colors.HexColor("#333333"),
        spaceAfter=10
    )

    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=body_style,
        leftIndent=20,
        bulletIndent=8,
        spaceAfter=5
    )

    header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#222222")
    )

    story = []

    # ================= PAGE 1: COVER & PROBLEM STATEMENT =================
    banner_path = "public/vibe2ship_banner.png"
    if os.path.exists(banner_path):
        img = Image(banner_path, width=320, height=80)
        img.hAlign = 'CENTER'
        story.append(img)
        story.append(Spacer(1, 15))

    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cccccc"), spaceBefore=5, spaceAfter=15))
    story.append(Paragraph("<u>Community Hero - Hyperlocal Problem Solver</u>", title_style))
    story.append(Spacer(1, 15))

    story.append(Paragraph("<b>Background</b>", h2_style))
    story.append(Paragraph(
        "Communities frequently face issues such as potholes, water leakages, damaged streetlights, "
        "waste management concerns, and public infrastructure challenges. Reporting these issues is "
        "often fragmented, difficult to track, and lacks transparency.",
        body_style
    ))

    story.append(Paragraph("<b>Challenge</b>", h2_style))
    story.append(Paragraph(
        "Build a platform that enables citizens to identify, report, validate, track, and resolve "
        "community issues through collaboration, data, and intelligent automation. The solution "
        "should encourage transparency, accountability, and community participation.",
        body_style
    ))

    story.append(Paragraph("<b>Example Features:</b>", ParagraphStyle('Sub', parent=h2_style, textColor=colors.black)))
    features = [
        "Image and video-based issue reporting",
        "AI-powered issue categorization",
        "Geo-location and mapping",
        "Community verification",
        "Real-time issue tracking",
        "Impact dashboards",
        "Predictive insights",
        "Gamification for citizen engagement"
    ]
    for feat in features:
        story.append(Paragraph(f"&bull; {feat}", bullet_style))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Evaluation Focus</b>", h2_style))
    story.append(Paragraph(
        "The solution should demonstrate how AI can help communities address local challenges "
        "more efficiently through improved reporting, verification, tracking, and resolution of issues.",
        body_style
    ))
    
    story.append(PageBreak())

    # ================= PAGE 2: SOLUTION OVERVIEW =================
    sub_title_style = ParagraphStyle(
        'SubTitle',
        parent=title_style,
        textColor=saffron,
        fontSize=18,
        spaceAfter=15
    )
    story.append(Paragraph("<b>Submission: JanSetu</b>", sub_title_style))
    story.append(HRFlowable(width="100%", thickness=1, color=saffron, spaceBefore=0, spaceAfter=15))

    story.append(Paragraph("<b>1. Solution Overview</b>", h1_style))
    story.append(Paragraph(
        "JanSetu shifts the civic grievance paradigm from standard 'passive complaints lists' to an "
        "<b>active, self-triage, and self-escalating operating system</b>. Instead of forcing citizens "
        "to navigate confusing municipal portals, select exact categories, or manually search for geolocations, "
        "JanSetu exposes a <b>Zero-UI voice interface</b> where citizens speak naturally in English, Hindi, "
        "or mixed dialects.",
        body_style
    ))
    story.append(Paragraph(
        "By utilizing an orchestration of specialized Gemini-powered agents, the system automates what was previously "
        "a friction-heavy manual administrative loop. Citizens reporting an issue get a structured ticket logged "
        "within 10 seconds. The ticket calculates dynamic priority scores, geo-clusters adjacent reports to prevent "
        "duplicate database bloat, and monitors SLAs autonomously. If municipal services fail to respond, JanSetu "
        "drafts and publishes formal escalation letters to municipal heads.",
        body_style
    ))
    story.append(Paragraph(
        "JanSetu targets the core of community engagement by closing the feedback loop. By verifying resolutions "
        "using comparative computer vision, the platform prevents municipal fraud and ensures real physical progress "
        "is recorded publicly on the audit trail.",
        body_style
    ))

    story.append(PageBreak())

    # ================= PAGE 3: AGENTIC ARCHITECTURE =================
    story.append(Paragraph("<b>2. Multi-Agent Pipeline & Deep Depth</b>", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dddddd"), spaceBefore=0, spaceAfter=15))
    
    story.append(Paragraph(
        "The core innovation of JanSetu is its directed multi-agent loop, dividing tasks among independent "
        "agents to deliver deep agentic reasoning:",
        body_style
    ))

    # Agent Table
    table_data = [
        [Paragraph("Agent", header_style), Paragraph("Core Reasoning & Job Description", header_style), Paragraph("API / Model", header_style)],
        [
            Paragraph("<b>Triage Agent</b>", table_cell_style),
            Paragraph("Translates raw speech, categorizes context, extracts landmarks, and geocodes coords.", table_cell_style),
            Paragraph("Gemini 1.5 Pro", table_cell_style)
        ],
        [
            Paragraph("<b>Duplicate Detector</b>", table_cell_style),
            Paragraph("Groups spatial-temporal overlaps to prevent ticket duplication and spam.", table_cell_style),
            Paragraph("Gemini 1.5 Pro", table_cell_style)
        ],
        [
            Paragraph("<b>COI Engine</b>", table_cell_style),
            Paragraph("Formulates dynamic priority score based on hazard risk, density, and infrastructure type.", table_cell_style),
            Paragraph("Gemini 1.5 Pro", table_cell_style)
        ],
        [
            Paragraph("<b>SLA Watchdog</b>", table_cell_style),
            Paragraph("Queries live web for nodal government officials and drafts formal escalation letters.", table_cell_style),
            Paragraph("Gemini + Search Grounding", table_cell_style)
        ],
        [
            Paragraph("<b>Verification Agent</b>", table_cell_style),
            Paragraph("Compares before/after resolution photos using visual reasoning to prevent municipal fraud.", table_cell_style),
            Paragraph("Gemini Vision", table_cell_style)
        ]
    ]

    agent_table = Table(table_data, colWidths=[100, 270, 134])
    agent_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), saffron),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#dddddd")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#fcfcfc")]),
    ]))
    
    story.append(Spacer(1, 5))
    story.append(agent_table)
    story.append(Spacer(1, 15))

    story.append(Paragraph(
        "Each agent runs asynchronously on Firebase serverless pipelines, keeping the system decoupled "
        "and protecting API secret keys on the backend rather than in the client browser.",
        body_style
    ))

    story.append(PageBreak())

    # ================= PAGE 4: KEY FEATURES & APP SCREENSHOT =================
    story.append(Paragraph("<b>3. Key Features & Product Experience</b>", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dddddd"), spaceBefore=0, spaceAfter=15))

    features_list = [
        "<b>Zero-UI Voice Reporting</b>: Transcribes and structures mixed-dialect voice notes in seconds.",
        "<b>Google Lens-Style Drag-and-Drop</b>: Clean custom drag-over dropzone with visual feedback and remove states.",
        "<b>COI-Ranked Dashboard</b>: Ranks tasks by Cost of Inaction score instead of standard chronology.",
        "<b>Heatmaps & Polygons</b>: Real-time Leaflet geocoding map tracking with automated risk-boundary clustering.",
        "<b>Grievance Directory</b>: Officer portal integrates real links for CPGRAMS, MyGov, MoHUA, Janaagraha, and Praja.",
        "<b>Public Ledger</b>: Immutable, transparent public audit log for accountability."
    ]
    for feat in features_list:
        story.append(Paragraph(f"&bull; {feat}", bullet_style))
    story.append(Spacer(1, 15))

    # Add screenshot image
    screenshot_path = "public/jansetu_report_page.png"
    if os.path.exists(screenshot_path):
        img_screenshot = Image(screenshot_path, width=440, height=220)
        img_screenshot.hAlign = 'CENTER'
        story.append(Paragraph("<b>Visual Interface: Citizen View & Live Reports Feed</b>", ParagraphStyle('ImgCap', parent=body_style, fontName='Helvetica-Bold', alignment=1, textColor=teal)))
        story.append(Spacer(1, 4))
        story.append(img_screenshot)

    story.append(PageBreak())

    # ================= PAGE 5: TECH STACK & GOOGLE UTILIZATION =================
    story.append(Paragraph("<b>4. Technologies & Google Integration</b>", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dddddd"), spaceBefore=0, spaceAfter=15))

    story.append(Paragraph("<b>Technologies Used</b>", h2_style))
    story.append(Paragraph(
        "<b>Frontend Core</b>: React 18, Vite (HMR bundling), and React Router DOM.<br/>"
        "<b>Design & Layout</b>: Vanilla CSS using glassmorphism, responsive flex layouts, dynamic grid canvas background, and custom HSL color palettes.<br/>"
        "<b>Mapping</b>: Leaflet.js map instance + HTML5 Geolocation API.",
        body_style
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Google & Firebase Services Utilized</b>", h2_style))
    story.append(Paragraph(
        "&bull; <b>Gemini 1.5 Pro</b>: Handles core translation, NLP structures, priority scores, and letter generation.<br/>"
        "&bull; <b>Gemini Search Grounding</b>: Queries public records live to locate active officers and engineering contacts.<br/>"
        "&bull; <b>Gemini Vision</b>: Audits and compares original vs. resolution photos to verify resolved issues.<br/>"
        "&bull; <b>Firebase Firestore</b>: Real-time synchronization of issues database and transparency ledgers.<br/>"
        "&bull; <b>Firebase Authentication</b>: Citizen anonymous sessions & secure administrative officer portal credentials.<br/>"
        "&bull; <b>Firebase Storage & Hosting</b>: Hosts static assets under 5MB and serves production build at `jansetu-dev.web.app`.",
        body_style
    ))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=saffron, spaceBefore=0, spaceAfter=15))
    story.append(Paragraph(
        "<font color='#666666'>Submission for <b>Vibe2Ship</b> Hackathon · codingninjas &times; Google for Developers</font>",
        ParagraphStyle('CreditStyle', parent=body_style, fontName='Helvetica-Oblique', alignment=1, fontSize=9)
    ))

    # Build the document
    doc.build(story)
    print("PDF Generation complete: SUBMISSION.pdf")

if __name__ == "__main__":
    build_pdf()
