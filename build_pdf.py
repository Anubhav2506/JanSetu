import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, HRFlowable
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
    
    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=saffron,
        spaceBefore=14,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor("#333333"),
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=body_style,
        leftIndent=20,
        bulletIndent=8,
        spaceAfter=4
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

    # 1. Header Banner Image
    banner_path = "public/vibe2ship_banner.png"
    if os.path.exists(banner_path):
        # Scale to fit nicely (letter width is 612pt; margins are 54pt each, printable width is 504pt)
        img = Image(banner_path, width=320, height=80)
        img.hAlign = 'CENTER'
        story.append(img)
        story.append(Spacer(1, 15))

    # 2. Divider line
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cccccc"), spaceBefore=5, spaceAfter=15))

    # 3. Problem Statement Title
    story.append(Paragraph("<u>Community Hero - Hyperlocal Problem Solver</u>", title_style))
    story.append(Spacer(1, 10))

    # 4. Background
    story.append(Paragraph("<b>Background</b>", h2_style))
    story.append(Paragraph(
        "Communities frequently face issues such as potholes, water leakages, damaged streetlights, "
        "waste management concerns, and public infrastructure challenges. Reporting these issues is "
        "often fragmented, difficult to track, and lacks transparency.",
        body_style
    ))

    # 5. Challenge
    story.append(Paragraph("<b>Challenge</b>", h2_style))
    story.append(Paragraph(
        "Build a platform that enables citizens to identify, report, validate, track, and resolve "
        "community issues through collaboration, data, and intelligent automation. The solution "
        "should encourage transparency, accountability, and community participation.",
        body_style
    ))

    # 6. Example Features
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

    # 7. Evaluation Focus
    story.append(Paragraph("<b>Evaluation Focus</b>", h2_style))
    story.append(Paragraph(
        "The solution should demonstrate how AI can help communities address local challenges "
        "more efficiently through improved reporting, verification, tracking, and resolution of issues.",
        body_style
    ))

    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dddddd"), spaceBefore=15, spaceAfter=20))

    # 8. Submission Detail Section
    sub_title_style = ParagraphStyle(
        'SubTitle',
        parent=title_style,
        textColor=saffron,
        fontSize=18,
        spaceAfter=15
    )
    story.append(Paragraph("<b>Submission: JanSetu</b>", sub_title_style))

    # 9. Solution Overview
    story.append(Paragraph("<b>1. Solution Overview</b>", ParagraphStyle('Heading1Custom', parent=h2_style, fontSize=14, leading=18, textColor=colors.black)))
    story.append(Paragraph(
        "JanSetu shifts the civic grievance paradigm from standard 'passive complaints lists' to an "
        "<b>active, self-triage, and self-escalating operating system</b>. Instead of forcing citizens "
        "to navigate confusing municipal portals, select exact categories, or manually search for geolocations, "
        "JanSetu exposes a <b>Zero-UI voice interface</b> where citizens speak naturally in English, Hindi, "
        "or mixed dialects.",
        body_style
    ))
    story.append(Paragraph(
        "Behind the scenes, JanSetu orchestrates a <b>directed acyclic graph (DAG) of five specialized Gemini-powered "
        "agents</b> acting as autonomous municipal actors:",
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
            Paragraph("Formulates dynamic priority score based on severity, population density, and infrastructure risk.", table_cell_style),
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

    # 10. Key Features
    story.append(Paragraph("<b>2. Key Features</b>", ParagraphStyle('Heading1Custom2', parent=h2_style, fontSize=14, leading=18, textColor=colors.black)))
    features_list = [
        "<b>Zero-UI Voice Reporting</b>: Real-time transcriptions & translation of English, Hindi, or mixed voice notes.",
        "<b>Google Lens-Style Drag-and-Drop Dropzone</b>: Fluid drop zone supporting drag hover styling, upload feedback, size limits, and easy reset.",
        "<b>COI-Ranked Officer Dashboard</b>: Auto-sorts administrative list by cost-of-inaction value rather than standard chronology.",
        "<b>Interactive Heatmaps & Cluster Polygons</b>: Custom geocoded markers and risk overlay polygons showing spatial trends in real time.",
        "<b>Official Gov/NGO Nodal Directory</b>: Displays linked databases for CPGRAMS, MyGov, MoHUA sanitation services, Janaagraha, and Praja Foundation.",
        "<b>Immutable Transparency Ledger</b>: Chronological, public audit logs containing escalation documents and vision confirmation results."
    ]
    for feat in features_list:
        story.append(Paragraph(f"&bull; {feat}", bullet_style))
    story.append(Spacer(1, 12))

    # 11. Technologies Used
    story.append(Paragraph("<b>3. Technologies Used</b>", ParagraphStyle('Heading1Custom3', parent=h2_style, fontSize=14, leading=18, textColor=colors.black)))
    story.append(Paragraph(
        "<b>Core Web</b>: React 18, Vite (HMR build orchestration), and React Router DOM.<br/>"
        "<b>Design System</b>: Custom CSS using fluid layouts, dark-mode variables, dot-grid dynamic background, glassmorphism, and responsive columns.<br/>"
        "<b>Location Engine</b>: Leaflet.js map layer + Web Geolocation API.",
        body_style
    ))
    story.append(Spacer(1, 12))

    # 12. Google Technologies Utilized
    story.append(Paragraph("<b>4. Google Technologies Utilized</b>", ParagraphStyle('Heading1Custom4', parent=h2_style, fontSize=14, leading=18, textColor=colors.black)))
    story.append(Paragraph(
        "&bull; <b>Gemini 1.5 Pro</b>: Powers language translations, structural ticket parsing, and priority algorithms.<br/>"
        "&bull; <b>Gemini Search Grounding</b>: Performs queries on live government datasets to retrieve active engineer names and designations.<br/>"
        "&bull; <b>Gemini Vision</b>: Audits and verifies uploaded before/after resolution pictures.<br/>"
        "&bull; <b>Firebase Firestore</b>: Manages live tickets, ledger timeline entries, and cluster states.<br/>"
        "&bull; <b>Firebase Authentication</b>: Handles anonymous citizen sessions & email officer access.<br/>"
        "&bull; <b>Firebase Storage & Hosting</b>: Secures static file uploads under strict size parameters and hosts production app at `jansetu-dev.web.app`.",
        body_style
    ))

    # Build the document
    doc.build(story)
    print("PDF Generation complete: SUBMISSION.pdf")

if __name__ == "__main__":
    build_pdf()
