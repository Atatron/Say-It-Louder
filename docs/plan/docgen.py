"""Small python-docx helpers shared by the paper and the plan builders."""
import re
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

INK = RGBColor(0x1B, 0x1F, 0x2A)
MUTED = RGBColor(0x55, 0x5B, 0x6B)
ACCENT = RGBColor(0x1F, 0x6F, 0x6B)
HEAD_FILL = "E6EFEE"
TOKEN = re.compile(r"(\*\*.+?\*\*|__.+?__)")


def new_document(body_font, body_size, margins_cm=2.0):
    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
    for side in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
        setattr(sec, side, Cm(margins_cm))
    normal = doc.styles["Normal"]
    normal.font.name = body_font
    normal.font.size = Pt(body_size)
    normal.font.color.rgb = INK
    normal.element.rPr.rFonts.set(qn("w:eastAsia"), body_font)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.12
    for name, size, before, after in (("Heading 1", 14, 16, 6), ("Heading 2", 11.5, 12, 4), ("Heading 3", 10.5, 8, 3)):
        st = doc.styles[name]
        st.font.name = body_font
        st.font.size = Pt(size)
        st.font.bold = True
        st.font.italic = False
        st.font.color.rgb = ACCENT if name == "Heading 1" else INK
        st.element.rPr.rFonts.set(qn("w:eastAsia"), body_font)
        st.element.rPr.rFonts.set(qn("w:ascii"), body_font)
        st.element.rPr.rFonts.set(qn("w:hAnsi"), body_font)
        st.paragraph_format.space_before = Pt(before)
        st.paragraph_format.space_after = Pt(after)
        st.paragraph_format.keep_with_next = True
    return doc


def add_runs(par, text, size=None, color=None, bold=None, italic=None):
    """Write text into a paragraph. **x** is bold and __x__ is italic."""
    for piece in TOKEN.split(text):
        if not piece:
            continue
        run_bold, run_italic = bold, italic
        if piece.startswith("**") and piece.endswith("**"):
            piece, run_bold = piece[2:-2], True
        elif piece.startswith("__") and piece.endswith("__"):
            piece, run_italic = piece[2:-2], True
        run = par.add_run(piece)
        if size:
            run.font.size = Pt(size)
        if color is not None:
            run.font.color.rgb = color
        if run_bold is not None:
            run.bold = run_bold
        if run_italic is not None:
            run.italic = run_italic
    return par


def para(doc, text, size=None, color=None, align=None, after=None, italic=None, bold=None):
    par = doc.add_paragraph()
    add_runs(par, text, size=size, color=color, italic=italic, bold=bold)
    if align == "center":
        par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif align == "justify":
        par.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    if after is not None:
        par.paragraph_format.space_after = Pt(after)
    return par


def heading(doc, text, level=1):
    return doc.add_heading(text, level=level)


def bullets(doc, items, numbered=False, size=None):
    """Bulleted list, or a manually numbered one (Word's List Number style never restarts at 1)."""
    for i, item in enumerate(items, 1):
        if numbered:
            par = doc.add_paragraph()
            par.paragraph_format.left_indent = Cm(0.9)
            par.paragraph_format.first_line_indent = Cm(-0.65)
            add_runs(par, f"{i}.  {item}", size=size)
        else:
            par = doc.add_paragraph(style="List Bullet")
            add_runs(par, item, size=size)
        par.paragraph_format.space_after = Pt(2)


def _shade(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def _repeat_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    el = OxmlElement("w:tblHeader")
    el.set(qn("w:val"), "true")
    tr_pr.append(el)


def table(doc, header, rows, widths_cm, size=8.5, caption=None):
    """A bordered table. widths_cm must have one entry per column."""
    if caption:
        cap = para(doc, caption, size=9, after=3)
        cap.paragraph_format.keep_with_next = True
    tbl = doc.add_table(rows=1, cols=len(header))
    tbl.style = "Table Grid"
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    for i, text in enumerate(header):
        cell = tbl.rows[0].cells[i]
        cell.width = Cm(widths_cm[i])
        _shade(cell, HEAD_FILL)
        cell.paragraphs[0].paragraph_format.space_after = Pt(1)
        add_runs(cell.paragraphs[0], text, size=size, bold=True)
    for i, w in enumerate(widths_cm):
        tbl.columns[i].width = Cm(w)
    _repeat_header(tbl.rows[0])
    for row in rows:
        cells = tbl.add_row().cells
        for i, text in enumerate(row):
            cells[i].width = Cm(widths_cm[i])
            cells[i].paragraphs[0].paragraph_format.space_after = Pt(1)
            add_runs(cells[i].paragraphs[0], str(text), size=size)
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(2)
    return tbl


def figure(doc, path, width_cm, caption):
    par = doc.add_paragraph()
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    par.paragraph_format.keep_with_next = True
    par.add_run().add_picture(path, width=Cm(width_cm))
    para(doc, caption, size=9, color=MUTED, after=8)


def boxed(doc, text, width_cm, size=9.5, fill="F3F6F6"):
    """A one-cell shaded note."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.style = "Table Grid"
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    cell = tbl.rows[0].cells[0]
    cell.width = Cm(width_cm)
    _shade(cell, fill)
    add_runs(cell.paragraphs[0], text, size=size)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def _field(par, instr, size, color):
    run = par.add_run()
    run.font.size = Pt(size)
    run.font.color.rgb = color
    for kind, body in (("begin", None), (None, instr), ("end", None)):
        if kind:
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), kind)
        else:
            el = OxmlElement("w:instrText")
            el.set(qn("xml:space"), "preserve")
            el.text = body
        run._r.append(el)


def header_footer(doc, header_text):
    sec = doc.sections[0]
    head = sec.header.paragraphs[0]
    add_runs(head, header_text, size=8, color=MUTED)
    foot = sec.footer.paragraphs[0]
    foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _field(foot, "PAGE", 8, MUTED)
