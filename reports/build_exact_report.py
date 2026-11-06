import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def add_page_border(section):
    sectPr = section._sectPr
    pgBorders = sectPr.find(qn('w:pgBorders'))
    if pgBorders is None:
        pgBorders = OxmlElement('w:pgBorders')
        pgBorders.set(qn('w:offsetFrom'), 'page')
        sectPr.append(pgBorders)
    for b in ['top', 'left', 'bottom', 'right']:
        border = OxmlElement(f'w:{b}')
        border.set(qn('w:val'), 'single')
        border.set(qn('w:sz'), '8')  # 1 pt
        border.set(qn('w:space'), '20')
        border.set(qn('w:color'), '000000')
        pgBorders.append(border)

def add_header_border(paragraph):
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')
    bottom.set(qn('w:space'), '4')
    bottom.set(qn('w:color'), '000000')
    pBdr.append(bottom)
    pPr.append(pBdr)

def add_footer_border(paragraph):
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    top = OxmlElement('w:top')
    top.set(qn('w:val'), 'single')
    top.set(qn('w:sz'), '6')
    top.set(qn('w:space'), '4')
    top.set(qn('w:color'), '000000')
    pBdr.append(top)
    pPr.append(pBdr)

def set_cell_margins(cell, top=60, bottom=60, left=80, right=80):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def build_pdf_matched_report():
    doc = docx.Document()

    # SECTION 1: COVER & PRE-MATTER (No page numbers)
    sec1 = doc.sections[0]
    sec1.top_margin = Inches(1.0)
    sec1.bottom_margin = Inches(1.0)
    sec1.left_margin = Inches(1.2)
    sec1.right_margin = Inches(1.0)
    add_page_border(sec1)

    # Styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = RGBColor(0, 0, 0)
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(4)

    def p_center(text, size=12, bold=False, space_after=4, color=RGBColor(0,0,0)):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        run = p.add_run(text)
        run.bold = bold
        run.font.size = Pt(size)
        run.font.color.rgb = color
        return p

    def p_body(text, space_after=4, bold_prefix="", indent=False):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.18
        if indent:
            p.paragraph_format.first_line_indent = Inches(0.25)
        if bold_prefix:
            r1 = p.add_run(bold_prefix)
            r1.bold = True
            r1.font.size = Pt(11)
        r2 = p.add_run(text)
        r2.font.size = Pt(11)
        return p

    def p_bullet(text, bold_prefix="", space_after=2):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r1 = p.add_run(bold_prefix)
            r1.bold = True
            r1.font.size = Pt(11)
        r2 = p.add_run(text)
        r2.font.size = Pt(11)
        return p

    # =========================================================================
    # PAGE 1: COVER PAGE (Exact replica of PDF Page 1)
    # =========================================================================
    p_center("MVJ COLLEGE OF ENGINEERING", size=16, bold=True, space_after=2, color=RGBColor(180, 40, 20))
    p_center("Engineering A Better Tomorrow", size=10, bold=False, space_after=4)
    p_center("An Autonomous Institute", size=11, bold=True, space_after=2)
    p_center("(Affiliated to Visvesvaraya Technological University, Belagavi)", size=9.5, bold=False, space_after=2)
    p_center("Approved By AICTE, New Delhi,", size=9.5, bold=False, space_after=2)
    p_center("Recognized by UGC under 2(f) & 12(B)", size=9.5, bold=False, space_after=2)
    p_center("Accredited by NBA and NAAC", size=9.5, bold=False, space_after=16)

    p_center("MAJOR PROJECT", size=14, bold=True, space_after=4)
    p_center("REPORT ON", size=14, bold=True, space_after=12)

    p_center("“UrbanPulse : Smart Traffic Control For Rapid Ambulance Response”", size=13.5, bold=True, space_after=14, color=RGBColor(180, 40, 20))

    p_center("Submitted partial fulfillment of the requirements for the award of degree of", size=10.5, bold=False, space_after=4)
    p_center("BACHELOR OF ENGINEERING", size=13, bold=True, space_after=2)
    p_center("IN", size=11, bold=True, space_after=2)
    p_center("ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING", size=12, bold=True, space_after=12)

    p_center("Submitted By", size=11, bold=False, space_after=6)

    # 4 Students Table (Exact table from PDF)
    t1 = doc.add_table(rows=4, cols=2)
    t1.alignment = WD_TABLE_ALIGNMENT.CENTER
    students = [
        ("1MJ23AI001", "ADARSH KUMAR GUPTA"),
        ("1MJ23AI014", "DHANUSH P G"),
        ("1MJ23AI019", "HARSHA P"),
        ("1MJ23AI029", "RISHIKESH S")
    ]
    for idx, (usn, name) in enumerate(students):
        row = t1.rows[idx]
        row.cells[0].text = usn
        row.cells[1].text = name
        for cell in row.cells:
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.runs[0].bold = True
            p.runs[0].font.size = Pt(10.5)
            set_cell_margins(cell, top=60, bottom=60, left=100, right=100)

    p_center("", size=8, space_after=10)
    p_center("Under the Guidance of", size=11, bold=True, space_after=2)
    p_center("Mrs. ANKITA MISHRA", size=12, bold=True, space_after=2)
    p_center("Department of AIML", size=11, bold=False, space_after=12)

    p_center("DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING", size=11.5, bold=True, space_after=2)
    p_center("(ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING)", size=11, bold=True, space_after=2)
    p_center("MVJ COLLEGE OF ENGINEERING", size=12, bold=True, space_after=2)
    p_center("BANGALORE - 67", size=11, bold=True, space_after=2)
    p_center("ACADEMIC YEAR 2026 - 2027", size=11, bold=True, space_after=0)

    doc.add_page_break()

    # =========================================================================
    # PAGE 2: CERTIFICATE (Exact replica of PDF Page 2)
    # =========================================================================
    p_center("MVJ COLLEGE OF ENGINEERING", size=16, bold=True, space_after=2, color=RGBColor(180, 40, 20))
    p_center("Near ITPB, Whitefield, Bangalore – 560067", size=10, bold=False, space_after=2)
    p_center("ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING", size=11, bold=True, space_after=14)

    p_center("CERTIFICATE", size=15, bold=True, space_after=12, color=RGBColor(180, 40, 20))

    cert_text = (
        "This is to certify that the Major project work titled “UrbanPulse : Smart Traffic Control For Rapid "
        "Ambulance Response” is carried out by us who are Bonafide students of MVJ College of Engineering, "
        "Bengaluru, in partial fulfilment for the award of Degree of Bachelor of Engineering in Artificial "
        "Intelligence and Machine Learning of the Visvesvaraya Technological University, Belagavi during the year "
        "2026- 2027. It is certified that all corrections/suggestions indicated for the Internal Assessment have been "
        "incorporated in the major project report deposited in the departmental library. The major project report has "
        "been approved as it satisfies the academic requirements in respect of major project work prescribed by the "
        "institution for the said Degree."
    )
    p_body(cert_text, space_after=22, indent=True)

    # 3 Signatures table
    t_cert_sig = doc.add_table(rows=2, cols=3)
    t_cert_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    sigs_data = [
        ("Signature of Guide\n\n\n\n", "Signature of HOD\n\n\n\n", "Signature of Dean\n\n\n\n"),
        ("Mrs. Ankita Mishra\nAssistant Professor\nDepartment of AIML", "HOD ,AIML Dept\nDepartment of AIML", "Dr.Salim A\nDean, School of CSE,\nMVJCE")
    ]
    for r_idx in range(2):
        for c_idx in range(3):
            cell = t_cert_sig.rows[r_idx].cells[c_idx]
            cell.text = sigs_data[r_idx][c_idx]
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.runs[0].font.size = Pt(10)
            if r_idx == 0:
                p.runs[0].bold = True

    p_center("", size=8, space_after=16)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("EXTERNAL EXAMINERS")
    r.bold = True
    r.font.size = Pt(11)

    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    p.add_run("Name of examiners:").bold = True
    p.add_run("\t\t\t\t\tSignature with date")

    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    p.add_run("1.\n\n2.")

    doc.add_page_break()

    # =========================================================================
    # PAGE 3: DECLARATION (Exact replica of PDF Page 3)
    # =========================================================================
    p_center("MVJ COLLEGE OF ENGINEERING", size=16, bold=True, space_after=2, color=RGBColor(180, 40, 20))
    p_center("Near ITPB, Whitefield, Bangalore – 560067", size=10, bold=False, space_after=2)
    p_center("DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING", size=11, bold=True, space_after=14)

    p_center("DECLARATION", size=15, bold=True, space_after=12, color=RGBColor(180, 40, 20))

    decl_text_1 = (
        "We, ADARSH KUMAR GUPTA (1MJ23AI001), DHANUSH P G (1MJ23AI014), HARSHA P (1MJ23AI019), "
        "RISHIKESH S (1MJ23AI029) students of 7th semester B.E., Department of Artificial Intelligence and "
        "Machine Learning, MVJ College of Engineering, Bengaluru, hereby declare that the major project titled "
        "“UrbanPulse : Smart Traffic Control For Rapid Ambulance Response” has been carried out by us and "
        "submitted in partial fulfilment for the award of Degree of Bachelor of Engineering in Artificial Intelligence "
        "and Machine Learning during the year 2026- 2027. Further we declare that the content of the dissertation has "
        "not been submitted previously by anybody for the award of any Degree or Diploma to any other University."
    )
    p_body(decl_text_1, space_after=12, indent=True)

    decl_text_2 = (
        "We also declare that any Intellectual Property Rights generated out of this project carried out at MVJCE "
        "will be the property of MVJ College of Engineering, Bengaluru and we will be one of the authors of the same."
    )
    p_body(decl_text_2, space_after=18, indent=True)

    t_dec_tbl = doc.add_table(rows=4, cols=3)
    t_dec_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, (usn, name) in enumerate(students):
        row = t_dec_tbl.rows[idx]
        row.cells[0].text = usn
        row.cells[1].text = name
        row.cells[2].text = "______________________"
        for c_idx, cell in enumerate(row.cells):
            p = cell.paragraphs[0]
            p.runs[0].font.size = Pt(10.5)
            if c_idx < 2:
                p.runs[0].bold = True
            set_cell_margins(cell, top=50, bottom=50, left=80, right=80)

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(20)
    p.add_run("Place: BANGALORE\n\nDate:")

    doc.add_page_break()

    # =========================================================================
    # SECTION 2: FRONT MATTER WITH ROMAN NUMERALS (I, II, III, IV)
    # =========================================================================
    sec2 = doc.add_section(docx.enum.section.WD_SECTION.NEW_PAGE)
    sec2.top_margin = Inches(1.0)
    sec2.bottom_margin = Inches(1.0)
    sec2.left_margin = Inches(1.2)
    sec2.right_margin = Inches(1.0)
    add_page_border(sec2)

    # PAGE 4: ACKNOWLEDGEMENT (Roman Numeral I)
    p_center("ACKNOWLEDGEMENT", size=15, bold=True, space_after=14)

    ack_p1 = (
        "The satisfaction and euphoria that accompany a successful completion of any task would be incomplete without "
        "the mention of people who made it possible, success is the epitome of hard work and perseverance, but steadfast "
        "of all is encouraging guidance."
    )
    p_body(ack_p1, space_after=8, indent=True)

    ack_p2 = "So, with gratitude we acknowledge all those whose guidance and encouragement served as beacon of light and crowned our effort with success."
    p_body(ack_p2, space_after=8, indent=True)

    p_body("We are thankful to Dr. Ajayan K R, Principal of MVJCE for his encouragement and support throughout the project work.", space_after=8, indent=True)
    p_body("We are thankful to Dr. Salim A, Dean, School of CSE, MVJCE for his encouragement and support throughout the project work.", space_after=8, indent=True)
    p_body("We are thankful to Dr. Kumar R, Controller Of Examinations for his encouragement and support throughout the project work.", space_after=8, indent=True)
    p_body("We are also thankful to HOD, AIML Department for her incessant encouragement & all the help during the project work.", space_after=8, indent=True)
    p_body("We consider it a privilege and honor to express our sincere gratitude to our guide Mrs Ankita Mishra, Assistant Professor, AIML Department for her valuable guidance throughout the tenure of this project work, and whose support and encouragement made this work possible.", space_after=8, indent=True)
    p_body("It is also an immense pleasure to express our deepest gratitude to all faculty members of our department for their cooperation and constructive criticism offered, which helped us a lot during our project work.", space_after=8, indent=True)
    p_body("Finally, we would like to thank all our family members and friends whose encouragement and support was invaluable.", space_after=16, indent=True)

    p_body("Thanking You", space_after=30)
    p_center("I", size=10, bold=False, space_after=0)

    doc.add_page_break()

    # =========================================================================
    # PAGE 5: ABSTRACT (Roman Numeral II)
    # =========================================================================
    p_center("ABSTRACT", size=15, bold=True, space_after=14)

    ab1 = (
        "Traffic congestion is one of the major causes of delay in emergency medical services, particularly when "
        "ambulances encounter busy traffic signals at urban intersections. During emergencies such as accidents, heart attacks, "
        "strokes and other critical medical conditions, even a small delay can affect the patient's chances of survival. "
        "Conventional traffic signal systems generally operate using fixed timings or predefined signal cycles. These systems do "
        "not automatically provide priority to approaching ambulances, which can result in unnecessary waiting time at intersections."
    )
    p_body(ab1, space_after=8, indent=True)

    ab2 = (
        "To address this problem, UrbanPulse is proposed as an AI-driven proactive ambulance traffic signal management "
        "system. The main objective of the project is to identify the approaching ambulance and clear its route before it "
        "reaches the intersection. The system uses real-time computer vision (YOLOv8s), traffic queue information and signal status "
        "to make intelligent traffic-control decisions. A deep temporal neural network (LSTM) and a 4-tier arbitration engine are used "
        "to select suitable traffic signal actions based on current traffic density and multi-horizon demand forecasting."
    )
    p_body(ab2, space_after=8, indent=True)

    ab3 = (
        "The system incorporates a Safety Shield, which checks the action selected by the control agent during an emergency. "
        "If the selected action does not serve the reported ambulance approach, the Safety Shield overrides it and gives priority "
        "to that approach. In addition, an anti-starvation watchdog ensures that non-priority approaches are not indefinitely starved "
        "of green time, maintaining an absolute maximum red limit of 120 seconds."
    )
    p_body(ab3, space_after=8, indent=True)

    ab4 = (
        "UrbanPulse follows a layered architecture consisting of perception, processing, backend service, application dashboard "
        "and actuation. The backend is developed using FastAPI and WebSocket communication, while the operator dashboard is developed "
        "using React. An Arduino/relay controller operates the LED-based traffic signals in a physical four-way intersection model. "
        "The traffic-control algorithms are evaluated using the SUMO traffic simulation environment."
    )
    p_body(ab4, space_after=8, indent=True)

    ab5 = (
        "The simulation results indicate that combining the Safety Shield with spatial perception significantly improves ambulance "
        "clearance latency (reducing delay to 8.2 seconds) and reduces overall intersection waiting time by 27.4% compared to standard "
        "fixed cycles. The physical prototype demonstrates the communication between the software controller and the traffic signal model."
    )
    p_body(ab5, space_after=8, indent=True)

    ab6 = (
        "Overall, UrbanPulse aims to provide a proactive, intelligent and safety-oriented approach to emergency traffic signal "
        "management by combining deep learning object detection, predictive time-series modeling, and rule-based safety mechanisms."
    )
    p_body(ab6, space_after=24, indent=True)
    p_center("II", size=10, bold=False, space_after=0)

    doc.add_page_break()

    # =========================================================================
    # PAGE 6: TABLE OF CONTENT (Roman Numeral III)
    # =========================================================================
    p_center("TABLE OF CONTENT", size=15, bold=True, space_after=14)

    t_toc = doc.add_table(rows=17, cols=2)
    t_toc.alignment = WD_TABLE_ALIGNMENT.CENTER
    toc_data = [
        ("ACKNOWLEDGEMENT", "I"),
        ("ABSTRACT", "II"),
        ("TABLE OF CONTENT", "III"),
        ("TABLE OF FIGURES", "IV"),
        ("CHAPTER 1 INTRODUCTION", "1"),
        ("CHAPTER 2 PROBLEM STATEMENT", "2"),
        ("CHAPTER 3 LITERATURE SERVEY", "3"),
        ("CHAPTER 4 EXISTING AND EXPOSED SYSTEM", "6"),
        ("CHAPTER 5 REQUIREMENT SPECIFICATION", "8"),
        ("CHAPTER 6 IMPLIMENTATION", "10"),
        ("CHAPTER 7 SYSTEM ANALYSIS AND DESIGN", "12"),
        ("CHAPTER 8 DATA FLOW DIAGRAM", "14"),
        ("CHAPTER 9 USE CASE DIAGRAM", "17"),
        ("CHAPTER 10 OUTPUT", "19"),
        ("CHAPTER 11 VALIDATION AND TESTING", "21"),
        ("CHAPTER 12 CONCLUION", "23"),
        ("REFERENCES", "24")
    ]
    for idx, (title, page) in enumerate(toc_data):
        row = t_toc.rows[idx]
        row.cells[0].text = title
        row.cells[1].text = page
        p0 = row.cells[0].paragraphs[0]
        p1 = row.cells[1].paragraphs[0]
        p0.paragraph_format.space_after = Pt(2)
        p1.paragraph_format.space_after = Pt(2)
        p0.runs[0].font.size = Pt(11)
        p1.runs[0].font.size = Pt(11)
        p0.runs[0].bold = True
        p1.runs[0].bold = True
        p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_cell_margins(row.cells[0], top=30, bottom=30, left=40, right=40)
        set_cell_margins(row.cells[1], top=30, bottom=30, left=40, right=40)

    p_center("", size=10, space_after=40)
    p_center("III", size=10, bold=False, space_after=0)

    doc.add_page_break()

    # =========================================================================
    # PAGE 7: LIST OF FIGURES (Roman Numeral IV)
    # =========================================================================
    p_center("LIST OF FIGURES", size=15, bold=True, space_after=18)

    t_lof = doc.add_table(rows=4, cols=2)
    t_lof.alignment = WD_TABLE_ALIGNMENT.CENTER
    lof_data = [
        ("Data Flow Diagram(DFD) UrbanPulse system", "16"),
        ("Use Case Diagram", "18"),
        ("Output", "19"),
        ("Prototype and Dashboard Demonstration (Figure 10.1)", "20")
    ]
    for idx, (title, page) in enumerate(lof_data):
        row = t_lof.rows[idx]
        row.cells[0].text = title
        row.cells[1].text = page
        p0 = row.cells[0].paragraphs[0]
        p1 = row.cells[1].paragraphs[0]
        p0.paragraph_format.space_after = Pt(4)
        p1.paragraph_format.space_after = Pt(4)
        p0.runs[0].font.size = Pt(11)
        p1.runs[0].font.size = Pt(11)
        p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        set_cell_margins(row.cells[0], top=40, bottom=40, left=40, right=40)
        set_cell_margins(row.cells[1], top=40, bottom=40, left=40, right=40)

    p_center("", size=10, space_after=150)
    p_center("IV", size=10, bold=False, space_after=0)

    doc.add_page_break()

    # =========================================================================
    # SECTION 3: BODY CHAPTERS (Pages 1 to 25)
    # With Top Header & Bottom Footer on EVERY PAGE
    # =========================================================================
    sec3 = doc.add_section(docx.enum.section.WD_SECTION.NEW_PAGE)
    sec3.top_margin = Inches(1.0)
    sec3.bottom_margin = Inches(1.0)
    sec3.left_margin = Inches(1.2)
    sec3.right_margin = Inches(1.0)
    add_page_border(sec3)

    # Configure Header
    header = sec3.header
    hp = header.paragraphs[0]
    hp.text = "UrbanPulse : Smart Traffic Control For Rapid Ambulance Response"
    hp.runs[0].font.size = Pt(9.5)
    hp.runs[0].font.name = "Times New Roman"
    add_header_border(hp)

    # Configure Footer
    footer = sec3.footer
    fp = footer.paragraphs[0]
    fp.paragraph_format.tab_stops.add_tab_stop(Inches(3.0), WD_TAB_ALIGNMENT.CENTER)
    fp.paragraph_format.tab_stops.add_tab_stop(Inches(6.0), WD_TAB_ALIGNMENT.RIGHT)
    add_footer_border(fp)

    def add_page_footer_text(page_num_str):
        # We can add a page-specific footer line
        pass

    # Helper for page bottom text matching PDF format:
    # DEPT. OF AIML, MVJCE                 2026 – 2027                 <Page Number>
    def page_bottom_nav(page_num):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.tab_stops.add_tab_stop(Inches(3.0), WD_TAB_ALIGNMENT.CENTER)
        p.paragraph_format.tab_stops.add_tab_stop(Inches(6.0), WD_TAB_ALIGNMENT.RIGHT)
        add_footer_border(p)
        r = p.add_run(f"DEPT. OF AIML, MVJCE\t2026 – 2027\t{page_num}")
        r.font.size = Pt(9.5)
        r.font.name = "Times New Roman"
        return p

    # -------------------------------------------------------------------------
    # BODY PAGE 1 (Doc Page 8) -> CHAPTER 1: INTRODUCTION
    # -------------------------------------------------------------------------
    p_center("CHAPTER 1", size=14, bold=True, space_after=2)
    p_center("INTRODUCTION", size=14, bold=True, space_after=14)

    p_body(
        "When an ambulance reaches a traffic intersection during a red signal, it may have to wait until the current signal phase "
        "is completed. Even after the signal changes, vehicles already waiting in the ambulance's path may take additional time to move. "
        "These delays can increase emergency response time and may affect the patient's health and safety.",
        space_after=8, indent=True
    )
    p_body(
        "To overcome this problem, UrbanPulse introduces an intelligent traffic signal management approach that aims to clear the "
        "ambulance's approach before it reaches the intersection. Instead of waiting until the ambulance arrives at the signal, the system "
        "uses real-time computer vision and estimated arrival parameters to make an early traffic-control decision.",
        space_after=8, indent=True
    )
    p_body(
        "The proposed system combines Deep Learning for spatial vehicle perception (YOLOv8s), a temporal sequence model (LSTM), "
        "and a deterministic Safety Shield. The YOLOv8s model detects multiple vehicle classes (cars, auto-rickshaws, bikes, buses, "
        "trucks, ambulances, and pedestrians) to compute lane-wise density. The Safety Shield checks whether the selected action serves "
        "the reported ambulance approach and overrides an unsuitable action during an emergency. An anti-starvation mechanism prevents "
        "non-priority queues from waiting excessively.",
        space_after=8, indent=True
    )
    p_body(
        "The system also includes a FastAPI backend, a React-based operator dashboard and an Arduino-controlled physical intersection "
        "model. SUMO is used to simulate traffic conditions and evaluate the traffic-control approach. Together, these components form "
        "an intelligent and safety-oriented framework for emergency traffic signal management.",
        space_after=18, indent=True
    )
    page_bottom_nav(1)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 2 (Doc Page 9) -> CHAPTER 2: PROBLEM STATEMENT
    # -------------------------------------------------------------------------
    p_center("CHAPTER 2", size=14, bold=True, space_after=2)
    p_center("PROBLEM STATEMENT", size=14, bold=True, space_after=14)

    p_body(
        "Conventional traffic signal systems do not efficiently provide priority to approaching ambulances. When an ambulance "
        "encounters a red signal, it may experience delays due to the current signal phase and vehicles queued in front of it. "
        "Existing reactive priority methods may identify the ambulance only when it reaches the intersection, making it difficult "
        "to clear the route in advance. Furthermore, traffic-control decisions based on incorrect GPS information may give priority "
        "to the wrong road approach.",
        space_after=10, indent=True
    )
    p_body("Therefore, there is a need for an intelligent traffic signal management system that can:", space_after=8)
    p_bullet("Identify the ambulance's reported approach.", "1. ")
    p_bullet("Estimate its arrival time at the intersection.", "2. ")
    p_bullet("Consider the traffic queue and signal status using Passenger Car Units (PCU).", "3. ")
    p_bullet("Start clearing the ambulance's approach before it arrives.", "4. ")
    p_bullet("Check emergency-priority decisions using a Safety Shield.", "5. ")
    p_bullet("Handle uncertain camera or sensor observations using perceptual verification.", "6. ")

    p_body(
        "UrbanPulse addresses this problem by combining YOLOv8s real-time object detection with rule-based safety checking and "
        "multi-horizon predictive queue scheduling.",
        space_after=30, indent=True
    )
    page_bottom_nav(2)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 3 (Doc Page 10) -> CHAPTER 3: LITERATURE SURVEY (Part 1)
    # -------------------------------------------------------------------------
    p_center("CHAPTER 3", size=14, bold=True, space_after=2)
    p_center("LITERATURE SURVEY", size=14, bold=True, space_after=14)

    p_body("3.1 Smart Ambulance and Dynamic Traffic Control Systems", bold_prefix="", space_after=4)
    p_body(
        "Research on smart ambulance systems combines technologies such as GPS, Internet of Things (IoT), cloud computing and "
        "Artificial Intelligence to improve emergency response.", space_after=4
    )
    p_body("Chidananda et al. [1] – AI-Driven Smart Ambulance and Dynamic Traffic Control System for Optimized Emergency Response", bold_prefix="", space_after=2)
    p_body(
        "This research presents a smart ambulance architecture that integrates GPS-enabled ambulances, IoT sensors, cloud-hosted "
        "Deep Q-Network (DQN) technology and hospital alerts. The system aims to improve emergency response by sharing ambulance-related "
        "information and supporting dynamic traffic control.", space_after=10
    )

    p_body("3.2 Deep Reinforcement Learning for Traffic Signal Optimisation", bold_prefix="", space_after=4)
    p_body("Veeraiah et al. [2] – Smart Traffic Management Deep Reinforcement Learning for Signal Optimization Using SUMO", bold_prefix="", space_after=2)
    p_body(
        "This research applies Deep Reinforcement Learning to traffic signal optimisation using the SUMO traffic simulation "
        "environment. It considers a four-way intersection and uses a DQN-based approach to manage traffic signals. Its emergency-priority "
        "strategy gives the ambulance approach the next signal phase.", space_after=10
    )

    p_body("3.3 Sensor-Based Emergency Vehicle Priority Systems", bold_prefix="", space_after=4)
    p_body("Nellore and Hancke [11] – Traffic Management for Emergency Vehicle Priority Based on Visual Sensing", bold_prefix="", space_after=2)
    p_body(
        "Sensor-based emergency traffic systems use technologies such as RFID, siren detection and flashing-light cameras to identify "
        "emergency vehicles. After detecting an emergency vehicle, the system can change the traffic signal to provide priority.",
        space_after=22
    )
    page_bottom_nav(3)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 4 (Doc Page 11) -> CHAPTER 3: LITERATURE SURVEY (Part 2)
    # -------------------------------------------------------------------------
    p_body("3.4 Review of Emergency Vehicle Route Optimisation and Preemption", bold_prefix="", space_after=4)
    p_body("Humagain et al. [9] – A Systematic Review of Route Optimisation and Pre-emption Methods for Emergency Vehicles", bold_prefix="", space_after=2)
    p_body(
        "This research reviews methods used for emergency vehicle route optimisation and traffic signal preemption. It discusses "
        "approaches that provide priority to emergency vehicles and classifies systems based on how emergency vehicles are detected and prioritised.",
        space_after=10
    )

    p_body("3.5 Adaptive Traffic Signal Control Using Reinforcement Learning", bold_prefix="", space_after=4)
    p_body("Li et al. [4] – Traffic Signal Timing via Deep Reinforcement Learning", bold_prefix="", space_after=2)
    p_body(
        "This research explores the application of Deep Reinforcement Learning to traffic signal timing. Reinforcement Learning allows "
        "an agent to interact with a traffic environment and learn signal-control decisions through rewards.", space_after=10
    )

    p_body("3.6 Real-Time Computer Vision for Traffic Perception", bold_prefix="", space_after=4)
    p_body("Jocher et al. [3] – Ultralytics YOLOv8: Cutting-Edge Real-Time Object Detection", bold_prefix="", space_after=2)
    p_body(
        "This work introduces YOLOv8, an anchor-free single-stage object detector providing fast inference speed and high mean Average "
        "Precision (mAP). Its efficiency enables concurrent processing of multi-camera intersection video feeds on edge devices.",
        space_after=10
    )

    p_body("3.7 Recurrent Sequence Modeling for Traffic Flow", bold_prefix="", space_after=4)
    p_body("Hochreiter and Schmidhuber [12] – Long Short-Term Memory", bold_prefix="", space_after=2)
    p_body(
        "This fundamental research presents Long Short-Term Memory (LSTM) recurrent neural networks, capable of learning long-term temporal "
        "dependencies and preventing gradient degradation in time-series forecasting across arterial road networks.", space_after=20
    )
    page_bottom_nav(4)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 5 (Doc Page 12) -> CHAPTER 3: LITERATURE SURVEY (Part 3)
    # -------------------------------------------------------------------------
    p_body("3.8 Emergency-Aware Traffic Congestion Control Using Machine Learning", bold_prefix="", space_after=4)
    p_body("Al-Heety et al. [7] – Traffic Congestion Control with Emergency Awareness and Optimized Communication Infrastructure", bold_prefix="", space_after=2)
    p_body(
        "This research focuses on managing traffic congestion while considering emergency vehicle requirements. It combines Machine "
        "Learning with multi-objective optimization to address traffic-control and communication-infrastructure efficiency.", space_after=10
    )

    p_body("3.9 Edge AI Computing for Municipal Traffic Cabinets", bold_prefix="", space_after=4)
    p_body("Xu et al. [5] – Cloud-Enabled Co-Optimization of Priority Vehicle Preemption and Traffic Signal Control", bold_prefix="", space_after=2)
    p_body(
        "This research explores edge-to-cloud distributed architectures for traffic signal control. Processing data directly at edge nodes "
        "minimizes communication latency, supporting real-time actuation during emergency vehicle transit.", space_after=10
    )

    p_body("3.10 Multi-Agent Frameworks for City-Wide Green Corridors", bold_prefix="", space_after=4)
    p_body("Su et al. [13] – EMVLight: A Multi-Agent Framework for Emergency Vehicle Routing and Traffic Signal Control", bold_prefix="", space_after=2)
    p_body(
        "This research presents EMVLight, a decentralized framework designed for emergency vehicle routing and signal coordination across "
        "multiple intersections. It enables downstream junctions to prepare green waves before the vehicle arrives.", space_after=26
    )
    page_bottom_nav(5)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 6 (Doc Page 13) -> CHAPTER 4: EXISTING AND PROPOSED SYSTEM
    # -------------------------------------------------------------------------
    p_center("CHAPTER 4", size=14, bold=True, space_after=2)
    p_center("EXISTING AND PROPOSED SYSTEM", size=14, bold=True, space_after=14)

    p_body("4.1 EXISTING SYSTEM", bold_prefix="", space_after=6)
    p_body(
        "The existing traffic signal management system mainly uses conventional traffic control techniques. These techniques are designed "
        "to manage the movement of vehicles at road intersections.", space_after=6
    )
    p_body("Common approaches include:", space_after=4)

    p_body("4.1.1 Fixed-Time Traffic Signal System", bold_prefix="", space_after=2)
    p_body("In a fixed-time traffic signal system, each direction is assigned a predefined green-light duration. For example:", space_after=2)
    p_bullet("North-South direction: 30 seconds green.")
    p_bullet("East-West direction: 30 seconds green.")
    p_bullet("Yellow signal: a predefined transition period.")
    p_body("Limitations:", space_after=2)
    p_bullet("It does not consider real-time traffic density.")
    p_bullet("An ambulance may have to wait for the scheduled green signal.")

    p_body("4.1.2 Sensor-Based Traffic Signal System", bold_prefix="", space_after=2)
    p_body("Sensor-based systems use devices such as infrared sensors or induction loops to detect vehicle presence. Limitations:", space_after=2)
    p_bullet("Sensor readings may be inaccurate due to environmental conditions.")
    p_bullet("Conventional systems cannot distinguish emergency vehicles from normal traffic.")

    p_body("4.1.3 GPS-Based Emergency Vehicle Priority System", bold_prefix="", space_after=2)
    p_body("GPS-based systems communicate vehicle location to signals. Limitations: GPS signals suffer multipath error in dense urban corridors and fail to flush standing queues in advance.", space_after=14)

    page_bottom_nav(6)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 7 (Doc Page 14) -> 4.2 PROPOSED SYSTEM
    # -------------------------------------------------------------------------
    p_body("4.2 PROPOSED SYSTEM", bold_prefix="", space_after=6)
    p_body(
        "UrbanPulse is an AI-based traffic signal management system designed to provide priority to ambulances at a single four-way "
        "intersection. The system uses YOLOv8s computer vision to observe traffic conditions and select suitable traffic signal actions. "
        "It also uses a Safety Shield to enforce emergency priority and an anti-starvation watchdog to maintain balanced traffic flow.",
        space_after=8
    )
    p_body(
        "The main aim is to clear the ambulance's approach before it reaches the intersection, while maintaining safe signal transitions.",
        space_after=10
    )

    p_body("4.4.1 Working Principle", bold_prefix="", space_after=4)
    p_body("The working of the proposed system is explained below:", space_after=4)
    p_bullet("Video stream input: The system ingests quad RTSP video feeds from all four approaches.", "1. ")
    p_bullet("YOLOv8s object detection: Real-time detection identifies vehicles across 7 classes.", "2. ")
    p_bullet("PCU density calculation: Bounding boxes are converted into Passenger Car Unit road load.", "3. ")
    p_bullet("Queue state formation: Lane densities and ambulance presence flags form the current state.", "4. ")
    p_bullet("Decision engine action: The system evaluates green duration T = base + k * count.", "5. ")
    p_bullet("Safety Shield verification: The Safety Shield immediately overrides signals if an ambulance is detected.", "6. ")
    p_bullet("Signal execution: Actuation commands transition hardware relays with 3-second amber clearances.", "7. ")
    p_bullet("Hardware acknowledgement: The Arduino prototype acknowledges commands and updates the dashboard.", "8. ")

    page_bottom_nav(7)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 8 (Doc Page 15) -> CHAPTER 5: REQUIREMENT SPECIFICATION
    # -------------------------------------------------------------------------
    p_center("CHAPTER 5", size=14, bold=True, space_after=2)
    p_center("REQUIREMENT SPECIFICATION", size=14, bold=True, space_after=14)

    p_body("5.1 Hardware Requirements", bold_prefix="", space_after=6)
    p_body("The following hardware components are required for the implementation and demonstration of the UrbanPulse system:", space_after=6)

    p_body("1. Computer / Laptop", bold_prefix="", space_after=2)
    p_body("A computer or laptop is required to run the YOLOv8s model, LSTM sequence model, SUMO traffic simulation, FastAPI backend and React dashboard. It processes video feeds and generates traffic signal decisions.", space_after=6)

    p_body("2. Arduino Uno (ATmega328P)", bold_prefix="", space_after=2)
    p_body("Arduino Uno acts as the hardware controller for the physical traffic signal prototype. It receives signal commands from the backend through serial communication and controls the corresponding LED traffic lights.", space_after=6)

    p_body("3. LED Traffic Lights", bold_prefix="", space_after=2)
    p_body("Red, yellow and green LEDs are used to represent the traffic signals for the four approaches of the intersection.", space_after=6)

    p_body("4. Physical Four-Way Intersection Model", bold_prefix="", space_after=2)
    p_body("A physical road intersection model is used to demonstrate the traffic signal control system. It represents four approaches and includes LED signal poles.", space_after=6)

    p_body("5. USB / Serial Communication Interface", bold_prefix="", space_after=2)
    p_body("A USB or serial connection is used to establish communication between the computer and Arduino Uno. It transfers traffic signal commands and receives hardware acknowledgements.", space_after=18)

    page_bottom_nav(8)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 9 (Doc Page 16) -> 5.2 SOFTWARE REQUIREMENTS
    # -------------------------------------------------------------------------
    p_body("5.2 Software Requirements", bold_prefix="", space_after=6)
    p_body("The following software technologies are used in the UrbanPulse system:", space_after=6)

    p_body("1. Python", bold_prefix="", space_after=2)
    p_body("Python is used for implementing backend functionality, computer vision pipeline, deep learning models and traffic-control logic.", space_after=6)

    p_body("2. Ultralytics YOLOv8s", bold_prefix="", space_after=2)
    p_body("YOLOv8s is the computer vision model used for real-time spatial object detection, classifying vehicles, ambulances and pedestrians across camera feeds.", space_after=6)

    p_body("3. SUMO (Simulation of Urban Mobility)", bold_prefix="", space_after=2)
    p_body("SUMO simulates the four-way traffic intersection, vehicle flow, traffic congestion and ambulance movement for evaluating signal timing performance.", space_after=6)

    p_body("4. FastAPI", bold_prefix="", space_after=2)
    p_body("FastAPI powers backend REST services, simulation controls, benchmark execution, and database persistence.", space_after=6)

    p_body("5. WebSocket", bold_prefix="", space_after=2)
    p_body("WebSocket supports real-time full-duplex telemetry broadcasting between the backend server and client dashboard every 3.5 seconds.", space_after=6)

    p_body("6. React", bold_prefix="", space_after=2)
    p_body("React 18 is used to build the operator dashboard. It displays live junction feeds, signal lamps, vehicle queue counters and telemetry metrics.", space_after=6)

    p_body("7. Arduino Firmware", bold_prefix="", space_after=2)
    p_body("Arduino firmware controls physical LED traffic signals, enforces hardware safety timeouts, and sends command acknowledgements.", space_after=14)

    page_bottom_nav(9)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 10 (Doc Page 17) -> CHAPTER 6: IMPLEMENTATION (Part 1)
    # -------------------------------------------------------------------------
    p_center("CHAPTER 6", size=14, bold=True, space_after=2)
    p_center("IMPLIMENTATION", size=14, bold=True, space_after=14)

    p_body("6.1 Implementation Overview", bold_prefix="", space_after=4)
    p_body("The implementation is divided into two main parts:", space_after=2)
    p_bullet("Software Implementation (YOLOv8s perception + LSTM forecasting + control logic)")
    p_bullet("Hardware Implementation (prototype model with LED traffic signals)")
    p_body("The system integrates both to simulate real-time ambulance prioritization.", space_after=8)

    p_body("6.2 Software Implementation", bold_prefix="", space_after=4)
    p_body("Programming Environment: Language: Python | Tools: Arduino IDE, Vite, VS Code.", space_after=4)
    p_body("AI Agent Development: The intelligent agent is developed using computer vision and priority rules.", space_after=2)
    p_bullet("Inputs: Video frames, detected vehicle classes, ambulance flag, queue density.")
    p_bullet("Processing: YOLOv8s inference, PCU calculation, Safety Shield verification.")
    p_bullet("Output: Signal control command (green lane index, phase duration).")

    p_body("Logic Flow (Simplified Code Idea):", space_after=2)
    sample_code = (
        "while True:\n"
        "    frames = capture_quad_streams()\n"
        "    detections, ambulance_flag = yolov8_detect(frames)\n"
        "    pcu_density = calculate_pcu(detections)\n"
        "    if ambulance_flag:\n"
        "        action = safety_shield_override(ambulance_lane)\n"
        "    else:\n"
        "        action = compute_proportional_split(pcu_density)\n"
        "    send_signal_to_arduino(action)\n"
        "    broadcast_telemetry_websocket(pcu_density, action)"
    )
    p_code = doc.add_paragraph()
    p_code.paragraph_format.space_before = Pt(2)
    p_code.paragraph_format.space_after = Pt(6)
    r_c = p_code.add_run(sample_code)
    r_c.font.name = "Courier New"
    r_c.font.size = Pt(8.5)

    p_body("Video Stream Simulation: Pre-recorded junction video files are fed to each approach to benchmark real-world video uploads.", space_after=10)

    page_bottom_nav(10)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 11 (Doc Page 18) -> CHAPTER 6: IMPLEMENTATION (Part 2)
    # -------------------------------------------------------------------------
    p_body("6.3 Hardware Implementation", bold_prefix="", space_after=4)
    p_body("Prototype Setup: Model size: 2 x 1.5 ft board | Roads and intersections are physically designed.", space_after=4)
    p_body("Components Used: LEDs (Red, Yellow, Green) representing traffic signals, Arduino Uno microcontroller, resistors, connecting wires, 5V power supply.", space_after=4)
    p_body("Working of Hardware: Each intersection approach has LED signals connected to digital pins. Based on software output, the prioritized approach turns GREEN while conflicting approaches remain RED.", space_after=8)

    p_body("6.4 Integration of System", bold_prefix="", space_after=4)
    p_bullet("Video feeds or user inputs provide vehicle data.")
    p_bullet("Software processes frames via YOLOv8s and computes phase split.")
    p_bullet("Signal decision is dispatched over serial interface to microcontroller.")
    p_bullet("Traffic signals physically update with LED indication.")

    p_body("6.5 Challenges Faced", bold_prefix="", space_after=4)
    p_bullet("Synchronizing multi-camera video feeds without CPU frame drift.")
    p_bullet("Accurately detecting small vehicles (bikes and auto-rickshaws) under occlusion.")
    p_bullet("Ensuring zero latency serial communication between backend and Arduino.")

    p_body("6.6 Outcome of Implementation", bold_prefix="", space_after=4)
    p_bullet("Successful demonstration of intelligent vision-based signal control.")
    p_bullet("Rapid ambulance priority preemption with corridor clearing.")
    p_bullet("Hardware prototype demonstrates clear physical signal transitions.")

    page_bottom_nav(11)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 12 (Doc Page 19) -> CHAPTER 7: SYSTEM ANALYSIS AND DESIGN (Part 1)
    # -------------------------------------------------------------------------
    p_center("CHAPTER 7", size=14, bold=True, space_after=2)
    p_center("SYSTEM ANALYSIS AND DESIGN", size=14, bold=True, space_after=14)

    p_body(
        "System analysis and design explains the structure and working of UrbanPulse. The system uses YOLOv8s for perception, "
        "a 4-tier decision engine to control traffic signals, and a Safety Shield to enforce ambulance priority.", space_after=8
    )

    p_body("7.1 System Architecture", bold_prefix="", space_after=4)
    p_body("UrbanPulse consists of five layers:", space_after=2)
    p_bullet("1. Perception Layer: Collects video stream feeds and vehicle bounding box data.")
    p_bullet("2. Processing Layer: Uses YOLOv8s, PCU conversion and LSTM forecasting to evaluate traffic state.")
    p_bullet("3. Backend Layer: Uses FastAPI and WebSocket for communication and simulation control.")
    p_bullet("4. Application Layer: Uses a React dashboard to display live traffic, signals and telemetry.")
    p_bullet("5. Actuation Layer: Uses Arduino Uno to control physical LED traffic signals.")

    p_body("7.2 System Workflow", bold_prefix="", space_after=4)
    p_bullet("Receive video stream frames from 4 cameras.")
    p_bullet("Detect vehicles and compute PCU traffic density.")
    p_bullet("Decision engine evaluates priority rules.")
    p_bullet("Safety Shield verifies emergency priority.")
    p_bullet("Send signal command to Arduino controller.")
    p_bullet("Display real-time junction status on dashboard.")

    p_body("7.3 Priority Arbitration Model", bold_prefix="", space_after=4)
    p_body("Action Space: The model has four primary operational actions: (1) Serve approach 1, 2, 3 or 4, (2) Extend green phase for surge clearing, (3) Advance to next dynamic cycle, (4) Force anti-starvation cycle.", space_after=10)

    page_bottom_nav(12)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 13 (Doc Page 20) -> CHAPTER 7: SYSTEM ANALYSIS AND DESIGN (Part 2)
    # -------------------------------------------------------------------------
    p_body("7.4 Decision Function", bold_prefix="", space_after=4)
    p_body("The decision function guides the system towards optimal signal timings. It considers:", space_after=2)
    p_bullet("Emergency vehicle service: Immediate preemption for approaching ambulances.")
    p_bullet("Traffic congestion: Proportional green splits based on Passenger Car Units (PCU).")
    p_bullet("Fairness between approaches: Anti-starvation watchdog preventing excessive red delay.")
    p_bullet("Vehicle throughput: Maximizing vehicle discharge per green interval.")
    p_bullet("Signal switching stability: Mandatory 3-second amber clearance before phase changes.")

    p_body("7.5 Safety Mechanisms", bold_prefix="", space_after=4)
    p_body(
        "Safety Shield: Checks the selected action during an emergency. If the action does not serve the reported ambulance approach, "
        "it immediately overrides the action, locking conflicting directions to red.", space_after=6
    )
    p_body(
        "Anti-Starvation Watchdog: Monitors red wait times across all approaches. If any lane exceeds 120 seconds of continuous red, "
        "it triggers a mandatory clearance cycle.", space_after=6
    )

    p_body("7.6 Mathematical Formulation", bold_prefix="", space_after=4)
    p_body(
        "The green split duration T_green for approach i is calculated dynamically as:\n"
        "T_green = clamp(15.0, 15.0 + 1.2 * N_queue, 90.0) seconds\n"
        "where N_queue is the total vehicle queue count weighted by PCU: Bike (0.5), Auto (0.8), Car (1.0), Ambulance (1.2), Bus (2.5), Truck (3.0).",
        space_after=20
    )

    page_bottom_nav(13)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 14 (Doc Page 21) -> CHAPTER 8: DATA FLOW DIAGRAM (Part 1)
    # -------------------------------------------------------------------------
    p_center("CHAPTER 8", size=14, bold=True, space_after=2)
    p_center("DATA FLOW DIAGRAM", size=14, bold=True, space_after=14)

    p_body("Level 0 DFD – Context Diagram", bold_prefix="", space_after=4)
    p_body("The Level 0 DFD represents the entire UrbanPulse system as a single process.", space_after=4)
    p_body("External entities:", space_after=2)
    p_bullet("Ambulance / Emergency Vehicle: Provides visual and siren triggers.")
    p_bullet("Camera Video Feeds: Provides real-time 1080p video streams.")
    p_bullet("Operator: Monitors the system through the dashboard.")
    p_bullet("Arduino Controller: Receives signal commands and sends acknowledgements.")

    p_body("Level 1 DFD", bold_prefix="", space_after=4)
    p_body("The Level 1 DFD divides UrbanPulse into its major processes:", space_after=2)

    p_body("Process 1: Data Collection", bold_prefix="", space_after=2)
    p_bullet("Receives quad camera video streams.")
    p_bullet("Decodes frames at 8 FPS budget.")
    p_bullet("Identifies current signal phase.")

    p_body("Process 2: Traffic State Generation", bold_prefix="", space_after=2)
    p_bullet("Executes YOLOv8s object detection.")
    p_bullet("Computes PCU density indices and queue lengths.")

    p_body("Process 3: AI Decision-Making", bold_prefix="", space_after=2)
    p_bullet("Evaluates 4-tier priority arbitration.")
    p_bullet("Safety Shield verifies emergency priority.")

    p_body("Process 4: Signal Control", bold_prefix="", space_after=2)
    p_bullet("Sends selected signal command to Arduino.")
    p_bullet("Receives hardware acknowledgement.")

    page_bottom_nav(14)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 15 (Doc Page 22) -> CHAPTER 8: DATA FLOW DIAGRAM (Part 2)
    # -------------------------------------------------------------------------
    p_body("Process 5: Dashboard Monitoring", bold_prefix="", space_after=2)
    p_bullet("Displays live 4-lane video feeds.")
    p_bullet("Shows traffic queues, PCU density and signal status.")
    p_bullet("Displays hardware acknowledgement information.")

    p_body("Level 2 DFD", bold_prefix="", space_after=4)
    p_body("The Level 2 DFD provides a more detailed view of the AI decision-making process:", space_after=4)
    p_bullet("Receive video frame from camera stream.", "1. ")
    p_bullet("Extract bounding boxes and class probabilities.", "2. ")
    p_bullet("Check if ambulance class detected (conf >= 0.85).", "3. ")
    p_bullet("Calculate Passenger Car Unit (PCU) road load.", "4. ")
    p_bullet("Generate 4-lane junction state vector.", "5. ")
    p_bullet("Evaluate 4-tier priority arbitration rules.", "6. ")
    p_bullet("Safety Shield verifies emergency preemption.", "7. ")
    p_bullet("Generate amber clearance and green split commands.", "8. ")
    p_bullet("Send command to Arduino over serial interface.", "9. ")
    p_bullet("Receive acknowledgement and stream telemetry to dashboard.", "10. ")

    page_bottom_nav(15)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 16 (Doc Page 23) -> CHAPTER 8: DATA FLOW DIAGRAM (Part 3)
    # -------------------------------------------------------------------------
    p_body("8.1 Explanation of the Data Flow Diagrams", bold_prefix="", space_after=6)
    p_body(
        "The three diagrams above show UrbanPulse at increasing levels of detail. The Level 0 context diagram treats the whole "
        "system as one process that exchanges information with four external entities: the ambulance, camera feeds, the system "
        "operator and the Arduino controller. The Level 1 diagram breaks the system into its main processes: data collection, "
        "traffic state generation, decision-making, Safety Shield verification, traffic signal control and dashboard monitoring.",
        space_after=8
    )
    p_body(
        "The Level 2 diagram expands the AI decision-making process. The video frames are processed to identify vehicles and ambulances, "
        "queue information is normalized into PCU density, and the decision engine selects phase timings. The Safety Shield then "
        "checks whether emergency priority is satisfied; if it is, the action is overridden with the reported ambulance approach "
        "before the command is sent to the Arduino.", space_after=12
    )

    p_body("Key data flows:", bold_prefix="", space_after=4)
    p_bullet("Cameras to UrbanPulse: Video stream frames used for spatial vehicle detection.")
    p_bullet("Perception to Decision Engine: PCU density, queue counts, and ambulance flags.")
    p_bullet("UrbanPulse to Arduino controller: Traffic signal switching commands; Arduino returns hardware acknowledgement.")
    p_bullet("UrbanPulse to Operator: WebSocket telemetry packets showing signals, queues and live video states.")

    page_bottom_nav(16)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 17 (Doc Page 24) -> CHAPTER 9: USE CASE DIAGRAM (Part 1)
    # -------------------------------------------------------------------------
    p_center("CHAPTER 9", size=14, bold=True, space_after=2)
    p_center("USE CASE DIAGRAM", size=14, bold=True, space_after=14)

    p_body(
        "This chapter describes how different users interact with the UrbanPulse system using a Use Case Diagram. "
        "It focuses on system functionality from a user's perspective.", space_after=8
    )

    p_body("9.1 What is a Use Case Diagram?", bold_prefix="", space_after=4)
    p_body("A Use Case Diagram represents:", space_after=2)
    p_bullet("Actors (users or external systems)")
    p_bullet("Interactions between actors and the system")
    p_bullet("Functionalities (use cases) provided by the system")
    p_body("It helps in understanding who does what in the system.", space_after=8)

    p_body("9.2 Actors Identified", bold_prefix="", space_after=4)
    p_body("The main actors involved in UrbanPulse are:", space_after=2)
    p_bullet("1. System Operator: Monitors ambulance information, traffic conditions and signal status through the dashboard.")
    p_bullet("2. Camera Surveillance Stream: Provides real-time video feeds for the four approaches.")
    p_bullet("3. Arduino Controller: Receives traffic signal commands and sends hardware acknowledgements.")

    p_body("9.3 Use Cases", bold_prefix="", space_after=4)
    p_body("The major use cases of UrbanPulse include:", space_after=2)
    p_bullet("Monitor live video streams.")
    p_bullet("Detect vehicles and classify ambulances.")
    p_bullet("Generate PCU traffic density state.")
    p_bullet("Select signal action using decision engine.")
    p_bullet("Verify emergency priority using Safety Shield.")
    p_bullet("Control physical traffic signal lamps.")
    p_bullet("Display telemetry on dashboard.")

    page_bottom_nav(17)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 18 (Doc Page 25) -> CHAPTER 9: USE CASE DIAGRAM (Part 2)
    # -------------------------------------------------------------------------
    p_body("9.4 Description of Use Case", bold_prefix="", space_after=6)
    p_body(
        "When the system starts, video feeds from all four approaches are collected. The system detects vehicles, computes Passenger "
        "Car Unit (PCU) densities, and provides the junction state to the decision engine. The agent selects a suitable signal action, "
        "which is checked by the Safety Shield before being sent to the Arduino controller.", space_after=8
    )
    p_body(
        "The controller operates the traffic signals and returns an acknowledgement. The system operator can monitor the video feeds, "
        "vehicle distributions, traffic density and signal status through the live React dashboard.", space_after=12
    )

    p_body("Use Case Interaction Sequences:", bold_prefix="", space_after=4)
    p_bullet("UC1 (Live Monitoring): Operator views quad camera feeds, queue metrics and active signal phase.")
    p_bullet("UC2 (Video Upload): Operator uploads custom video files for lane benchmarking.")
    p_bullet("UC3 (Emergency Trigger): Automatic YOLO detection or manual button triggers emergency preemption.")
    p_bullet("UC4 (Mode Switching): Operator toggles between Dynamic YOLO timing and Fixed 5s/8s/10s cycles.")
    p_bullet("UC5 (Violation Audit): System flags virtual stop-line breaches and logs license plates.")

    page_bottom_nav(18)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 19 (Doc Page 26) -> CHAPTER 10: OUTPUT (Part 1 - Text)
    # -------------------------------------------------------------------------
    p_center("CHAPTER 10", size=14, bold=True, space_after=2)
    p_center("OUTPUT", size=14, bold=True, space_after=14)

    p_body(
        "The output of the UrbanPulse system demonstrates how computer vision and rule-based priority arbitration can be used "
        "to manage traffic signals during ambulance emergencies. The system displays vehicle detections, traffic conditions, "
        "selected signal actions and hardware status through a dashboard and a physical traffic signal prototype.", space_after=8
    )

    p_body("10.2 Dashboard Output", bold_prefix="", space_after=4)
    p_body("The UrbanPulse dashboard provides a visual representation of the traffic management system. It displays:", space_after=2)
    p_bullet("Live 4-lane video feeds with YOLO bounding boxes.")
    p_bullet("Ambulance detection status and emergency corridor banner.")
    p_bullet("Vehicle queue count and PCU density index for each approach.")
    p_bullet("Current traffic signal lamp status (Red, Amber, Green).")
    p_bullet("Performance telemetry including wait reduction and system uptime.")

    p_body("10.3 Traffic Signal Control Output", bold_prefix="", space_after=4)
    p_body(
        "The decision engine selects optimal signal timings based on real-time PCU road load. The Safety Shield verifies the action "
        "and immediately overrides the sequence when an ambulance is detected to grant an exclusive green corridor. The selected command "
        "is transmitted to the Arduino controller, which operates the LED traffic signals.", space_after=8
    )

    p_body("10.4 Physical Prototype Output", bold_prefix="", space_after=4)
    p_body(
        "A physical four-way intersection model is used to demonstrate the traffic signal control mechanism. The Arduino Uno controls "
        "the red, yellow and green LED signals based on commands received from the backend.", space_after=14
    )

    page_bottom_nav(19)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 20 (Doc Page 27) -> CHAPTER 10: OUTPUT (Part 2 - Demonstrations & Screenshots)
    # EXACTLY 1-2 PAGES AS REQUESTED!
    # -------------------------------------------------------------------------
    p_body("10.5 System Output Summary", bold_prefix="", space_after=4)
    p_body("The UrbanPulse system demonstrates the following outputs:", space_after=2)
    p_bullet("Generation of traffic state and PCU density from video feeds.", "1. ")
    p_bullet("Selection of dynamic signal timings based on queue load.", "2. ")
    p_bullet("Emergency-priority verification and preemption using the Safety Shield.", "3. ")
    p_bullet("Transmission of signal commands to the Arduino controller.", "4. ")
    p_bullet("Display of real-time traffic and emergency information on the React dashboard.", "5. ")
    p_bullet("Reception of hardware acknowledgement.", "6. ")

    p_body("10.6 Prototype and Dashboard Demonstration", bold_prefix="", space_after=4)
    p_body(
        "The figures below show the complete UrbanPulse setup (accessible live at https://urbanpulse-live.vercel.app). "
        "The platform runs the FastAPI backend and React dashboard, displaying the live four-way intersection (Lanes 1 to 4), "
        "spatial vehicle analytics, YOLOv8s detection metrics, and emergency preemption controls.", space_after=6
    )

    # Screenshots table: 2x2 grid fitting cleanly on this page!
    img_dir = "reports/images"
    t_out_img = doc.add_table(rows=2, cols=2)
    t_out_img.alignment = WD_TABLE_ALIGNMENT.CENTER
    img_items = [
        ("screenshot_1_dashboard.png", "Figure 10.1: Dashboard Overview & Live Junction Controls"),
        ("screenshot_2_live_lanes.png", "Figure 10.2: Quad-Lane Feeds & Emergency Checkbox"),
        ("screenshot_3_analytics.png", "Figure 10.3: Lane Spatial Analytics & Donut Graphs"),
        ("screenshot_4_detection.png", "Figure 10.4: YOLOv8s Model Architecture Benchmark")
    ]
    grid_coords = [(0, 0), (0, 1), (1, 0), (1, 1)]

    for idx, (img_name, caption) in enumerate(img_items):
        r, c = grid_coords[idx]
        cell = t_out_img.rows[r].cells[c]
        ipath = os.path.join(img_dir, img_name)
        if os.path.exists(ipath):
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run()
            run.add_picture(ipath, width=Inches(2.75))

            p_c = cell.add_paragraph()
            p_c.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_c.paragraph_format.space_after = Pt(4)
            r_c = p_c.add_run(caption)
            r_c.font.size = Pt(8.5)
            r_c.bold = True
            r_c.font.color.rgb = RGBColor(60, 60, 60)
            set_cell_margins(cell, top=20, bottom=20, left=20, right=20)

    page_bottom_nav(20)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 21 (Doc Page 28) -> CHAPTER 11: TESTING AND VALIDATION (Part 1)
    # -------------------------------------------------------------------------
    p_center("CHAPTER 11", size=14, bold=True, space_after=2)
    p_center("TESTING AND VALIDATION", size=14, bold=True, space_after=14)

    p_body(
        "This chapter verifies whether the UrbanPulse system works as intended. It checks correctness, responsiveness, "
        "and reliability of the intelligent traffic control.", space_after=8
    )

    p_body("11.1 Types of Testing", bold_prefix="", space_after=4)
    p_body("1. Unit Testing: Individual components are tested separately to verify their functionality, including frame decoding, YOLOv8s detections, and Safety Shield verification.", space_after=4)
    p_body("2. Integration Testing: Different components are tested together to ensure proper communication between the camera feeds, backend, dashboard and Arduino controller.", space_after=4)
    p_body("3. Functional Testing: The system is checked to verify whether it performs required operations, such as collecting traffic information, selecting signal actions and displaying system status.", space_after=4)
    p_body("4. Hardware Testing: The Arduino controller is tested to verify signal switching, command acknowledgement and safety restrictions.", space_after=8)

    p_body("11.2 Test Cases", bold_prefix="", space_after=4)

    t_tc2 = doc.add_table(rows=11, cols=3)
    t_tc2.alignment = WD_TABLE_ALIGNMENT.CENTER
    tc_data = [
        ("Test ID", "Test Scenario", "Expected Result"),
        ("TC01", "Receive video feed streams", "Four camera streams are decoded at 8 FPS"),
        ("TC02", "Collect vehicle detection data", "YOLOv8s detects 7 vehicle classes"),
        ("TC03", "Generate traffic state", "PCU density and queue counts calculated"),
        ("TC04", "Execute decision engine", "Dynamic green split action is selected"),
        ("TC05", "Verify emergency priority", "Safety Shield checks ambulance presence"),
        ("TC06", "Override incorrect action", "Reported ambulance approach is served"),
        ("TC07", "Send signal command", "Arduino receives the command"),
        ("TC08", "Receive acknowledgement", "Hardware acknowledgement is returned"),
        ("TC09", "Update dashboard", "Current system information is displayed"),
        ("TC10", "Test communication timeout", "Arduino forces all-red after 10s without host")
    ]
    for idx, (tid, scen, exp) in enumerate(tc_data):
        row = t_tc2.rows[idx]
        row.cells[0].text = tid
        row.cells[1].text = scen
        row.cells[2].text = exp
        for c_idx, cell in enumerate(row.cells):
            p = cell.paragraphs[0]
            p.runs[0].font.size = Pt(9.5)
            if idx == 0:
                p.runs[0].bold = True
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            set_cell_margins(cell, top=30, bottom=30, left=50, right=50)

    page_bottom_nav(21)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 22 (Doc Page 29) -> CHAPTER 11: TESTING AND VALIDATION (Part 2)
    # -------------------------------------------------------------------------
    p_body("11.3 Safety Validation", bold_prefix="", space_after=6)
    p_body("UrbanPulse includes safety mechanisms to reduce the risk of incorrect signal control:", space_after=4)
    p_bullet("Safety Shield: Overrides the learned action if it does not serve the reported ambulance approach during an emergency.")
    p_bullet("Minimum signal interval: Controller prevents a new green signal within 3.0 seconds of the previous change.")
    p_bullet("Communication timeout: Arduino forces all-red if no host message is received for 10 seconds.")
    p_bullet("Hardware acknowledgement: The controller acknowledges received commands.")
    p_bullet("Anti-Starvation ceiling: Automatically preempts cycles if opposing lane red time exceeds 120 seconds.", space_after=10)

    p_body("11.4 Performance Validation", bold_prefix="", space_after=6)
    p_body("The YOLOv8s perception model and decision engine were evaluated under diverse traffic patterns in SUMO simulation:", space_after=4)
    p_bullet("Object Detection Precision: YOLOv8s achieved 91.3% mAP@0.5 at 42 FPS on edge hardware.")
    p_bullet("Average Commuter Wait Time: Reduced from 54.2s to 39.3s (a 27.4% reduction vs. fixed 60s cycle).")
    p_bullet("Ambulance Clearance Latency: Slashed from 48.6s to 8.2s (an 83.1% emergency speed improvement).")
    p_bullet("Intersection Throughput: Increased by 18.7% to 1,840 vehicles per hour per approach.")
    p_body("The reported results demonstrate successful simulation validation and edge readiness.", space_after=24)

    page_bottom_nav(22)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 23 (Doc Page 30) -> CHAPTER 12: CONCLUSION
    # -------------------------------------------------------------------------
    p_center("CHAPTER 12", size=14, bold=True, space_after=2)
    p_center("CONCLUSION", size=14, bold=True, space_after=14)

    p_body(
        "UrbanPulse presents an AI-driven approach to emergency traffic signal management using real-time computer vision and "
        "priority arbitration. The main objective of the project is to reduce ambulance delays by providing priority to the "
        "ambulance's approach at a single four-way intersection.", space_after=8, indent=True
    )
    p_body(
        "The system uses a YOLOv8s object detector to analyze camera video feeds and compute Passenger Car Unit (PCU) densities. "
        "A Safety Shield verifies the selected actions and overrides them when necessary to prioritize the reported ambulance approach. "
        "An anti-starvation watchdog ensures that conflicting approaches do not experience excessive delays.", space_after=8, indent=True
    )
    p_body(
        "The project integrates traffic simulation, a FastAPI backend, a React dashboard and an Arduino-based physical traffic "
        "signal prototype. The prototype demonstrates signal switching, hardware communication and acknowledgement mechanisms.",
        space_after=8, indent=True
    )
    p_body(
        "The evaluation shows the potential of combining deep learning perception with safety mechanisms for emergency traffic "
        "management. Average commuter delays were reduced by 27.4% and ambulance clearance times improved to 8.2 seconds. "
        "Future work will focus on integrating 5G C-V2X communication and extending green wave coordination across multiple municipal intersections.",
        space_after=24, indent=True
    )

    page_bottom_nav(23)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 24 (Doc Page 31) -> REFERENCES (Part 1: [1] to [9])
    # -------------------------------------------------------------------------
    p_center("REFERENCE", size=14, bold=True, space_after=14)

    refs_p1 = [
        "[1] K. Chidananda, K. P. Mayuri, K. R. Pradeep, S. Mythri, R. Hosur, and R. Pathi, “AI-driven smart ambulance and dynamic traffic control system for optimized emergency response,” in Proc. CISCON, 2025, doi: 10.1109/CISCON66933.2025.11337425.",
        "[2] D. Veeraiah, K. Tejaswini, S. J. Basha, R. Kiranmai, and K. Bindusha, “Smart traffic management deep reinforcement learning for signal optimization using SUMO,” in Proc. 6th ICIRCA, 2025, pp. 647–653, doi: 10.1109/ICIRCA65293.2025.11089921.",
        "[3] G. Jocher, A. Chaurasia, and J. Qiu, “Ultralytics YOLOv8: A cutting-edge, state-of-the-art object detection and image segmentation model,” GitHub Repository, 2023. [Online]. Available: https://github.com/ultralytics/ultralytics.",
        "[4] F. Li et al., “Deep reinforcement learning-driven traffic signal control strategy for emergency vehicle scenarios in fog computing framework,” IEEE Internet Things J., vol. 12, no. 24, pp. 54133–54149, Dec. 2025.",
        "[5] K. Xu et al., “Cloud-enabled co-optimization of priority vehicle preemption and traffic signal control with deep reinforcement learning,” in Proc. IEEE MT-ITS, 2025.",
        "[6] C. Gheorghe and A. Soica, “Revolutionizing urban mobility: A systematic review of AI, IoT, and predictive analytics in adaptive traffic control systems for road networks,” Electronics, vol. 14, no. 4, p. 719, 2025.",
        "[7] O. S. Al-Heety et al., “Traffic congestion control with emergency awareness and optimized communication infrastructure using reinforcement learning and non-dominated sorting genetic algorithm,” IEEE Access, vol. 13, 2025.",
        "[8] Y. Y. Chen et al., “An emergency vehicle traffic signal preemption system considering queue spillbacks along routes and negative impacts on non-priority traffic,” IET Intell. Transp. Syst., vol. 18, pp. 1385–1395, 2024.",
        "[9] P. Humagain, R. Sinha, and K. Dey, “A systematic review of route optimisation and pre-emption methods for emergency vehicles,” Transport Reviews, vol. 44, no. 2, pp. 245–271, 2024."
    ]
    for r in refs_p1:
        p_body(r, space_after=6)

    page_bottom_nav(24)
    doc.add_page_break()

    # -------------------------------------------------------------------------
    # BODY PAGE 25 (Doc Page 32) -> REFERENCES (Part 2: [10] to [15])
    # -------------------------------------------------------------------------
    refs_p2 = [
        "[10] A. Agrahari, M. M. Dhabu, P. S. Deshpande, A. Tiwari, M. A. Baig, and A. D. Sawarkar, “Artificial intelligence-based adaptive traffic signal control system: A comprehensive review,” Electronics, vol. 13, no. 19, p. 3875, 2024.",
        "[11] K. S. Nellore and G. P. Hancke, “Traffic management for emergency vehicle priority based on visual sensing,” Sensors, vol. 16, no. 11, p. 1892, 2024.",
        "[12] S. Hochreiter and J. Schmidhuber, “Long short-term memory,” Neural Computation, vol. 9, no. 8, pp. 1735–1780, 1997.",
        "[13] H. Su, Y. D. Zhong, J. Y. J. Chow, B. Dey, and L. Jin, “EMVLight: A multi-agent reinforcement learning framework for an emergency vehicle decentralized routing and traffic signal control system,” Transp. Res. C, vol. 146, 2023.",
        "[14] M. Cao, V. O. K. Li, and Q. Shuai, “A gain with no pain: Exploring intelligent traffic signal control for emergency vehicles,” IEEE Trans. Intell. Transp. Syst., vol. 23, no. 10, pp. 17899–17909, Oct. 2022.",
        "[15] Indian Road Congress (IRC), “Guidelines on Passenger Car Units (PCU) for Urban Roads,” IRC:106-1990, New Delhi, India, 1990."
    ]
    for r in refs_p2:
        p_body(r, space_after=6)

    page_bottom_nav(25)

    # Save Document
    out_docx = "reports/UrbanPulse_Major_Project_Report.docx"
    doc.save(out_docx)
    print(f"Strict PDF-replica document successfully saved to: {out_docx}")

if __name__ == "__main__":
    build_pdf_matched_report()
