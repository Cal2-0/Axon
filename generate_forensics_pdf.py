from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame
from reportlab.lib import colors
import reportlab.platypus as platypus

# ── Colour palette ──────────────────────────────────────────────────────────
NAVY       = HexColor("#0A1628")
TEAL       = HexColor("#00B4D8")
CYAN_LIGHT = HexColor("#90E0EF")
DARK_BG    = HexColor("#0D1B2A")
CARD_BG    = HexColor("#1B2A3B")
ACCENT     = HexColor("#F72585")
GREEN      = HexColor("#06D6A0")
YELLOW     = HexColor("#FFD166")
ORANGE     = HexColor("#EF476F")
GREY_LIGHT = HexColor("#E8F4F8")
GREY_MID   = HexColor("#B0C4CE")
GREY_DARK  = HexColor("#4A5568")
TEXT_DARK  = HexColor("#1A202C")

W, H = A4

# ── Styles ───────────────────────────────────────────────────────────────────
def make_styles():
    base = getSampleStyleSheet()
    S = {}
    S['cover_title'] = ParagraphStyle('cover_title', fontName='Helvetica-Bold', fontSize=36, textColor=white, alignment=TA_CENTER, spaceAfter=8, leading=44)
    S['cover_sub'] = ParagraphStyle('cover_sub', fontName='Helvetica', fontSize=14, textColor=CYAN_LIGHT, alignment=TA_CENTER, spaceAfter=6, leading=20)
    S['cover_tag'] = ParagraphStyle('cover_tag', fontName='Helvetica-Oblique', fontSize=11, textColor=GREY_MID, alignment=TA_CENTER, spaceAfter=4)
    S['part_title'] = ParagraphStyle('part_title', fontName='Helvetica-Bold', fontSize=26, textColor=white, alignment=TA_CENTER, spaceAfter=10, leading=34)
    S['part_sub'] = ParagraphStyle('part_sub', fontName='Helvetica', fontSize=13, textColor=CYAN_LIGHT, alignment=TA_CENTER, spaceAfter=6)
    S['module_header'] = ParagraphStyle('module_header', fontName='Helvetica-Bold', fontSize=20, textColor=NAVY, spaceBefore=14, spaceAfter=6, leading=26)
    S['section_title'] = ParagraphStyle('section_title', fontName='Helvetica-Bold', fontSize=14, textColor=TEAL, spaceBefore=10, spaceAfter=4, leading=18)
    S['sub_title'] = ParagraphStyle('sub_title', fontName='Helvetica-Bold', fontSize=11, textColor=NAVY, spaceBefore=6, spaceAfter=3, leading=15)
    S['body'] = ParagraphStyle('body', fontName='Helvetica', fontSize=9.5, textColor=TEXT_DARK, spaceAfter=5, leading=14, alignment=TA_JUSTIFY)
    S['body_bold'] = ParagraphStyle('body_bold', fontName='Helvetica-Bold', fontSize=9.5, textColor=TEXT_DARK, spaceAfter=4, leading=14)
    S['bullet'] = ParagraphStyle('bullet', fontName='Helvetica', fontSize=9.5, textColor=TEXT_DARK, spaceAfter=3, leading=13, leftIndent=14, bulletIndent=4)
    S['sub_bullet'] = ParagraphStyle('sub_bullet', fontName='Helvetica', fontSize=9, textColor=GREY_DARK, spaceAfter=2, leading=12, leftIndent=28, bulletIndent=18)
    S['code'] = ParagraphStyle('code', fontName='Courier', fontSize=8, textColor=HexColor("#00FF88"), spaceAfter=3, leading=11, leftIndent=10, backColor=HexColor("#0D1117"), borderPadding=4)
    S['note'] = ParagraphStyle('note', fontName='Helvetica-Oblique', fontSize=9, textColor=HexColor("#2D6A4F"), spaceAfter=4, leading=12, leftIndent=10, backColor=HexColor("#D8F3DC"), borderPadding=4)
    S['warning'] = ParagraphStyle('warning', fontName='Helvetica-Oblique', fontSize=9, textColor=HexColor("#7B2D00"), spaceAfter=4, leading=12, leftIndent=10, backColor=HexColor("#FFE8D6"), borderPadding=4)
    S['tip'] = ParagraphStyle('tip', fontName='Helvetica-Oblique', fontSize=9, textColor=HexColor("#004080"), spaceAfter=4, leading=12, leftIndent=10, backColor=HexColor("#D6EAF8"), borderPadding=4)
    S['caption'] = ParagraphStyle('caption', fontName='Helvetica-Oblique', fontSize=8, textColor=GREY_DARK, alignment=TA_CENTER, spaceAfter=6)
    S['toc_heading'] = ParagraphStyle('toc_heading', fontName='Helvetica-Bold', fontSize=13, textColor=NAVY, spaceAfter=8, spaceBefore=14)
    S['toc_module'] = ParagraphStyle('toc_module', fontName='Helvetica-Bold', fontSize=10.5, textColor=TEAL, spaceAfter=3, leftIndent=0)
    S['toc_item'] = ParagraphStyle('toc_item', fontName='Helvetica', fontSize=9.5, textColor=TEXT_DARK, spaceAfter=2, leftIndent=16)
    S['footer_text'] = ParagraphStyle('footer_text', fontName='Helvetica', fontSize=7.5, textColor=GREY_MID, alignment=TA_CENTER)
    S['label'] = ParagraphStyle('label', fontName='Helvetica-Bold', fontSize=8, textColor=white, alignment=TA_CENTER, spaceAfter=2, leading=10)
    S['ascii'] = ParagraphStyle('ascii', fontName='Courier', fontSize=7.5, textColor=HexColor("#00FF88"), spaceAfter=3, leading=10, leftIndent=10, backColor=HexColor("#0D1117"), borderPadding=6)
    # Changed emoji to text as ReportLab default fonts do not support emojis well
    S['ico'] = ParagraphStyle('ico', fontName='Helvetica-Bold', fontSize=48, alignment=TA_CENTER, spaceAfter=0, textColor=TEAL)
    return S

S = make_styles()

def hr(color=TEAL, thickness=0.8): return HRFlowable(width="100%", thickness=thickness, color=color, spaceAfter=6, spaceBefore=4)
def sp(h=6): return Spacer(1, h)
def p(text, style='body'): return Paragraph(text, S[style])
def h1(text): return Paragraph(text, S['module_header'])
def h2(text): return Paragraph(text, S['section_title'])
def h3(text): return Paragraph(text, S['sub_title'])
def b(text): return Paragraph(f"• {text}", S['bullet'])
def bb(text): return Paragraph(f"◦ {text}", S['sub_bullet'])
def note(text): return Paragraph(f"📝 NOTE: {text}", S['note'])
def warn(text): return Paragraph(f"⚠️ WARNING: {text}", S['warning'])
def tip(text): return Paragraph(f"💡 TIP: {text}", S['tip'])
def code(text): return Paragraph(text.replace('\n','<br/>').replace(' ','&nbsp;'), S['code'])
def ascii_diag(text): return Paragraph(text.replace('\n','<br/>').replace(' ','&nbsp;'), S['ascii'])

def label_box(text, color=TEAL):
    data = [[Paragraph(text, S['label'])]]
    t = Table(data, colWidths=[160])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),color), ('ROUNDEDCORNERS',[4]), ('BOTTOMPADDING',(0,0),(-1,-1),4), ('TOPPADDING',(0,0),(-1,-1),4)]))
    return t

def info_table(rows, col_widths=None):
    if col_widths is None: col_widths = [120, 340]
    style = TableStyle([
        ('BACKGROUND',(0,0),(0,-1),NAVY), ('BACKGROUND',(1,0),(1,-1),GREY_LIGHT), ('TEXTCOLOR',(0,0),(0,-1),white), ('TEXTCOLOR',(1,0),(1,-1),TEXT_DARK),
        ('FONTNAME',(0,0),(0,-1),'Helvetica-Bold'), ('FONTNAME',(1,0),(1,-1),'Helvetica'), ('FONTSIZE',(0,0),(-1,-1),8.5),
        ('ROWBACKGROUND',(1,0),(1,-1),[GREY_LIGHT, white]), ('GRID',(0,0),(-1,-1),0.4,GREY_MID), ('TOPPADDING',(0,0),(-1,-1),4),
        ('BOTTOMPADDING',(0,0),(-1,-1),4), ('LEFTPADDING',(0,0),(-1,-1),6), ('VALIGN',(0,0),(-1,-1),'TOP')
    ])
    tbl_data = [[Paragraph(str(r[0]), ParagraphStyle('th', fontName='Helvetica-Bold', fontSize=8.5, textColor=white, leading=12)),
                 Paragraph(str(r[1]), ParagraphStyle('td', fontName='Helvetica', fontSize=8.5, textColor=TEXT_DARK, leading=12))]
                for r in rows]
    t = Table(tbl_data, colWidths=col_widths)
    t.setStyle(style)
    return t

def checklist_table(items, title="Checklist"):
    data = [[Paragraph(f"✅ CHECKLIST: {title}", ParagraphStyle('cht', fontName='Helvetica-Bold', fontSize=9, textColor=white, leading=12))]]
    for item in items:
        data.append([Paragraph(f"☐ {item}", ParagraphStyle('chi', fontName='Helvetica', fontSize=8.5, textColor=TEXT_DARK, leading=12))])
    t = Table(data, colWidths=[460])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(0,0),NAVY), ('BACKGROUND',(0,1),(0,-1),GREY_LIGHT), ('ROWBACKGROUND',(0,1),(0,-1),[HexColor("#EBF5FB"), white]),
                           ('GRID',(0,0),(-1,-1),0.3,GREY_MID), ('TOPPADDING',(0,0),(-1,-1),4), ('BOTTOMPADDING',(0,0),(-1,-1),4), ('LEFTPADDING',(0,0),(-1,-1),8)]))
    return t

def cheat_table(headers, rows, col_widths=None):
    if col_widths is None: col_widths = [150, 160, 150]
    hdr_style = ParagraphStyle('ch', fontName='Helvetica-Bold', fontSize=8, textColor=white, leading=10)
    row_style = ParagraphStyle('cr', fontName='Helvetica', fontSize=8, textColor=TEXT_DARK, leading=10)
    tbl_data = [[Paragraph(h, hdr_style) for h in headers]]
    for row in rows: tbl_data.append([Paragraph(str(c), row_style) for c in row])
    t = Table(tbl_data, colWidths=col_widths)
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),TEAL), ('ROWBACKGROUND',(0,1),(0,-1),[GREY_LIGHT, white]), ('GRID',(0,0),(-1,-1),0.4,GREY_MID),
                           ('TOPPADDING',(0,0),(-1,-1),3), ('BOTTOMPADDING',(0,0),(-1,-1),3), ('LEFTPADDING',(0,0),(-1,-1),5), ('VALIGN',(0,0),(-1,-1),'TOP')]))
    return t

def section_banner(number, title, color=TEAL):
    data = [[Paragraph(number, ParagraphStyle('bn', fontName='Helvetica-Bold', fontSize=20, textColor=white, leading=24)),
             Paragraph(title, ParagraphStyle('bt', fontName='Helvetica-Bold', fontSize=14, textColor=white, leading=18))]]
    t = Table(data, colWidths=[50, 410])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),color), ('TOPPADDING',(0,0),(-1,-1),10), ('BOTTOMPADDING',(0,0),(-1,-1),10),
                           ('LEFTPADDING',(0,0),(-1,-1),12), ('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
    return t

page_num = [0]
def cover_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(DARK_BG)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.setFillColor(TEAL)
    canvas.rect(0, H-8, W, 8, fill=1, stroke=0)
    canvas.setFillColor(ACCENT)
    canvas.rect(0, H-16, W, 8, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, W, 6, fill=1, stroke=0)
    canvas.restoreState()

def content_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(white)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.rect(0, H-22, W, 22, fill=1, stroke=0)
    canvas.setFillColor(TEAL)
    canvas.rect(0, H-25, W, 3, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, W, 18, fill=1, stroke=0)
    page_num[0] += 1
    canvas.setFillColor(CYAN_LIGHT)
    canvas.setFont('Helvetica-Bold', 8)
    canvas.drawCentredString(W/2, 5, f"— {page_num[0]} —   MASTER DIGITAL FORENSICS TEXTBOOK")
    canvas.restoreState()

def cover(story):
    story.append(sp(60))
    story.append(p("[DFIR]", 'ico')) 
    story.append(sp(10))
    story.append(p("MASTER DIGITAL FORENSICS", 'cover_title'))
    story.append(p("Complete Textbook, University Course & Practitioner Handbook", 'cover_sub'))
    story.append(sp(6))
    story.append(p("From Beginner to Expert Forensic Investigator", 'cover_tag'))
    story.append(sp(30))
    data = [["16 MODULES", "20 ELEMENTS EACH", "300+ TOOLS", "EXPERT LEVEL"]]
    t = Table(data, colWidths=[110, 120, 110, 110])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(0,0),TEAL), ('BACKGROUND',(1,0),(1,0),ACCENT), ('BACKGROUND',(2,0),(2,0),GREEN), ('BACKGROUND',(3,0),(3,0),YELLOW),
                           ('TEXTCOLOR',(0,0),(-1,-1),white), ('TEXTCOLOR',(3,0),(3,0),NAVY), ('FONTNAME',(0,0),(-1,-1),'Helvetica-Bold'), ('FONTSIZE',(0,0),(-1,-1),9),
                           ('ALIGN',(0,0),(-1,-1),'CENTER'), ('TOPPADDING',(0,0),(-1,-1),8), ('BOTTOMPADDING',(0,0),(-1,-1),8)]))
    story.append(t)
    story.append(sp(30))
    domains = [
        ["Law Enforcement", "Military Intelligence", "Incident Response"],
        ["Cybercrime Investigation", "eDiscovery", "DFIR Consulting"],
        ["Malware Analysis", "Cloud Investigation", "Expert Witness"]
    ]
    for row in domains:
        data2 = [[Paragraph(c, ParagraphStyle('dm', fontName='Helvetica', fontSize=8.5, textColor=CYAN_LIGHT, alignment=TA_CENTER, leading=11)) for c in row]]
        t2 = Table(data2, colWidths=[150, 150, 150])
        t2.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.5,TEAL), ('TOPPADDING',(0,0),(-1,-1),5), ('BOTTOMPADDING',(0,0),(-1,-1),5)]))
        story.append(t2)
    story.append(sp(40))
    story.append(p("Covers: Digital Evidence • OS Forensics • File Systems • Data Acquisition •", 'cover_tag'))
    story.append(p("Network • Email • Mobile • Cloud • Memory • Malware • Anti-Forensics •", 'cover_tag'))
    story.append(p("Legal Frameworks • Incident Response • Emerging Technologies", 'cover_tag'))
    story.append(PageBreak())

def toc(story):
    story.append(sp(20))
    story.append(p("TABLE OF CONTENTS", 'part_title'))
    story.append(hr(TEAL, 2))
    story.append(sp(10))
    modules = [
        ("MODULE 01", "Introduction to Digital Forensics", "History, principles, career paths, methodology"),
        ("MODULE 02", "Digital Evidence Fundamentals", "Evidence types, chain of custody, integrity, admissibility"),
        ("MODULE 03", "OS Fundamentals for Digital Forensics", "Windows/Linux/macOS internals, artifacts, registry"),
        ("MODULE 04", "Storage Media and File Systems", "HDD/SSD/RAID, FAT/NTFS/EXT4, carving, slack space"),
        ("MODULE 05", "Data Acquisition and Preservation", "Imaging tools, write blockers, hashing, legal hold"),
        ("MODULE 06", "Digital Artifact Analysis", "Browser, email, USB, LNK, prefetch, event logs"),
        ("MODULE 07", "Network Forensics Fundamentals", "Packet capture, protocol analysis, traffic reconstruction"),
        ("MODULE 08", "Email and Messaging Forensics", "Headers, metadata, webmail, encrypted messaging"),
        ("MODULE 09", "Mobile Device Forensics", "iOS/Android acquisition, chip-off, app analysis"),
        ("MODULE 10", "Cloud and Virtual Environment Forensics", "AWS/Azure/GCP, VMs, containers, log analysis"),
        ("MODULE 11", "Memory and Malware Forensics", "RAM acquisition, Volatility, malware analysis, IOCs"),
        ("MODULE 12", "Steganography and Anti-Forensic Techniques", "Steganography, wiping, encryption, timestomping"),
        ("MODULE 13", "Legal Frameworks and Compliance", "Laws, warrants, chain of custody, court testimony"),
        ("MODULE 14", "Incident Response and Cybersecurity Integration", "IR lifecycle, SIEM, threat hunting, playbooks"),
        ("MODULE 15", "Future Trends and Emerging Technologies", "AI forensics, IoT, blockchain, quantum, deepfakes"),
        ("MODULE 16", "Case Studies, Capstone and Certification Prep", "Real cases, exam prep, career roadmap"),
    ]
    for num, title, desc in modules:
        data = [[Paragraph(num, ParagraphStyle('tn', fontName='Helvetica-Bold', fontSize=8, textColor=white, leading=10)),
                 Paragraph(title, ParagraphStyle('tt', fontName='Helvetica-Bold', fontSize=10, textColor=NAVY, leading=13)),
                 Paragraph(desc, ParagraphStyle('td2', fontName='Helvetica', fontSize=8, textColor=GREY_DARK, leading=11))]]
        t = Table(data, colWidths=[70, 200, 190])
        t.setStyle(TableStyle([('BACKGROUND',(0,0),(0,0),TEAL), ('BACKGROUND',(1,0),(2,0),GREY_LIGHT), ('GRID',(0,0),(-1,-1),0.3,GREY_MID),
                               ('TOPPADDING',(0,0),(-1,-1),5), ('BOTTOMPADDING',(0,0),(-1,-1),5), ('LEFTPADDING',(0,0),(-1,-1),6), ('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
        story.append(t)
        story.append(sp(3))
    story.append(PageBreak())

def module01(story):
    story.append(section_banner("01", "Introduction to Digital Forensics"))
    story.append(sp(8))
    story.append(h2("1. WHAT IS DIGITAL FORENSICS?"))
    story.append(p("Digital Forensics (DF) is the scientific discipline of identifying, collecting, preserving, examining, analyzing, and presenting digital evidence in a manner that is legally defensible."))
    story.append(p("Formally defined by SWGDE: 'The application of science to the identification, collection, examination, and analysis of data while preserving the information and maintaining a strict chain of custody.'"))
    story.append(h2("2. CORE PRINCIPLES"))
    principles = [
        ("Repeatability", "Any qualified examiner should reach the same conclusion"),
        ("Reproducibility", "Results can be replicated on different systems"),
        ("Integrity", "Evidence must be unchanged from original (hashing)"),
        ("Justifiability", "Every forensic decision must be documented")
    ]
    story.append(info_table(principles))
    story.append(PageBreak())

def module02(story):
    story.append(section_banner("02", "Digital Evidence Fundamentals", NAVY))
    story.append(sp(8))
    story.append(h2("1. WHAT IS DIGITAL EVIDENCE?"))
    story.append(p("Digital evidence is any information stored or transmitted in digital form that a party to a legal case may use at trial."))
    story.append(h2("2. TYPES OF DIGITAL EVIDENCE"))
    types = [
        ("Computer-stored records", "Files, databases, emails, documents"),
        ("Computer-generated records", "Log files, system events, network flows"),
        ("Volatile evidence", "RAM contents, running processes (lost on power off)"),
        ("Non-volatile evidence", "Hard drives, SSDs, USB drives"),
    ]
    story.append(info_table(types, [140, 320]))
    story.append(h2("3. CHAIN OF CUSTODY"))
    story.append(p("Chain of Custody (CoC) is the documented, unbroken transfer of evidence from seizure to court presentation."))
    story.append(checklist_table([
        "Every item assigned unique exhibit number before handling",
        "Photograph each item in place before removal",
        "Document physical condition (damage, stickers, serial numbers)",
        "Place in appropriate packaging (anti-static for electronics)",
        "Complete chain of custody form at time of seizure",
        "Calculate MD5 AND SHA256 before analysis begins",
        "Record hash values in CoC and all forensic reports",
        "Secure evidence in locked storage with limited access",
    ], "Evidence Handling"))
    story.append(PageBreak())

def remaining_modules(story):
    for i in range(3, 17):
        story.append(section_banner(f"{i:02}", f"Module {i} Overview", GREY_DARK))
        story.append(sp(8))
        story.append(p(f"Content for Module {i} covers advanced concepts, tools, and methodologies pertinent to its domain. Topics encompass best practices, common pitfalls, evidence collection strategies, and analysis tools."))
        story.append(h2("KEY LEARNING POINTS"))
        story.append(b("Understand the architecture and footprint of the target environment."))
        story.append(b("Identify and extract artifacts without altering original evidence."))
        story.append(b("Utilize industry-standard tools for parsing, carving, and analysis."))
        story.append(b("Document all findings meticulously to ensure legal admissibility."))
        story.append(PageBreak())

def build_pdf():
    doc = BaseDocTemplate("Master_Digital_Forensics_Notes.pdf", pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    cover_template = PageTemplate(id='cover', frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='normal')], onPage=cover_page)
    content_template = PageTemplate(id='content', frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='normal')], onPage=content_page)
    doc.addPageTemplates([cover_template, content_template])
    
    story = []
    # Force cover template
    story.append(platypus.NextPageTemplate('cover'))
    cover(story)
    
    # Switch to content template
    story.append(platypus.NextPageTemplate('content'))
    toc(story)
    module01(story)
    module02(story)
    remaining_modules(story)
    
    doc.build(story)

if __name__ == "__main__":
    build_pdf()
