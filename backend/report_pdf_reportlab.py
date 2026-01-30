# report_pdf_reportlab.py

from __future__ import annotations

from io import BytesIO
from typing import Any, Dict, List

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    Image as PlatypusImage
)
# Graphics for Charts
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.piecharts import Pie

def _severity_color_hex(sev: str) -> str:
    """Returns hex string for charts."""
    s = (sev or "").upper().strip()
    if s == "CRITICAL": return "#991b1b"  # Deep Red
    if s == "SEVERE": return "#9a3412"    # Rust
    if s == "HIGH": return "#ea580c"      # Orange
    if s == "MODERATE": return "#d97706"  # Amber
    if s == "MEDIUM": return "#d97706"    # Amber
    if s == "LOW": return "#166534"       # Green
    return "#374151"                      # Grey

def _severity_color_obj(sev: str):
    """Returns ReportLab Color object."""
    return colors.HexColor(_severity_color_hex(sev))

def create_severity_pie_chart(summary_counts: Dict[str, int]) -> Drawing:
    """
    Generates a Pie Chart for finding severity using ReportLab Graphics.
    """
    d = Drawing(200, 100)
    pc = Pie()
    pc.x = 50
    pc.y = 10
    pc.width = 80
    pc.height = 80
    
    # Data preparation
    labels = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    data = [summary_counts.get(l, 0) for l in labels]
    
    # If empty, show a grey placeholder
    if sum(data) == 0:
        data = [1]
        pc.data = data
        pc.labels = ["No Issues"]
        pc.slices[0].fillColor = colors.HexColor("#e5e7eb")
    else:
        pc.data = data
        pc.labels = [f"{l}" if d > 0 else "" for l, d in zip(labels, data)]
        
        # Colors
        pc.slices[0].fillColor = colors.HexColor("#991b1b") # Critical
        pc.slices[1].fillColor = colors.HexColor("#ea580c") # High
        pc.slices[2].fillColor = colors.HexColor("#d97706") # Medium
        pc.slices[3].fillColor = colors.HexColor("#166534") # Low

    d.add(pc)
    return d

def generate_audit_pdf_bytes(structured_report: Dict[str, Any]) -> bytes:
    """
    Professional PDF Generator:
    - Executive summary with charts
    - Alternating table rows
    - Dynamic risk scoring
    - Grouped findings with remediation
    """

    audit = structured_report.get("audit", {}) or {}
    summary = structured_report.get("summary", {}) or {}
    executive_summary = structured_report.get("executive_summary", []) or []
    global_risk = structured_report.get("global_risk", {}) or {}
    metric_scores = structured_report.get("metric_scores", []) or []
    grouped_findings = structured_report.get("grouped_findings", []) or []
    evidence_samples = [
        sample 
        for group in grouped_findings 
        for sample in group.get("evidence_samples", [])
    ] # Flatten samples for the evidence section

    buf = BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        title=f"Audit Report - {audit.get('audit_id', 'Unknown')}",
        author="AI Auditor Platform",
    )

    styles = getSampleStyleSheet()

    # --- Custom Styles ---
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=12,
        textColor=colors.HexColor("#111827")
    )

    section_style = ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading2"],
        fontSize=13,
        spaceBefore=16,
        spaceAfter=8,
        textColor=colors.HexColor("#1f2937"),
        borderColor=colors.HexColor("#e5e7eb"),
        borderPadding=4,
        borderWidth=0,
        backColor=None
    )

    normal_style = ParagraphStyle(
        "NormalSmall",
        parent=styles["BodyText"],
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#374151"),
    )

    subtle_style = ParagraphStyle(
        "Subtle",
        parent=styles["BodyText"],
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#6b7280"),
    )

    story: List[Any] = []

    # =========================================
    # HEADER
    # =========================================
    story.append(Paragraph("AI Auditor Executive Report", title_style))
    story.append(Paragraph(f"Audit ID: <b>{audit.get('audit_id', '-')}</b>", subtle_style))
    story.append(Paragraph(f"Generated: {audit.get('executed_at', '-')}", subtle_style))
    story.append(Spacer(1, 14))

    # =========================================
    # EXECUTIVE SUMMARY & CHART
    # =========================================
    story.append(Paragraph("Executive Summary", section_style))
    
    # 2-Column Layout: Text Left, Chart Right
    summary_text = []
    if executive_summary:
        for line in executive_summary:
            summary_text.append(Paragraph(f"• {line}", normal_style))
    else:
        summary_text.append(Paragraph("No summary data available.", normal_style))

    # Create Chart
    pie_chart = create_severity_pie_chart(summary.get("by_severity", {}))
    
    # Table to hold text and chart side-by-side
    summary_table = Table(
        [[summary_text, pie_chart]], 
        colWidths=[11 * cm, 7 * cm]
    )
    summary_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, 0), 0),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 14))

    # =========================================
    # DYNAMIC SCORING TABLE
    # =========================================
    story.append(Paragraph("Risk Scoring & Metrics", section_style))

    gs = global_risk.get("score_100")
    gb = global_risk.get("band")
    
    # Global Score Banner
    story.append(
        Paragraph(
            f"Global Risk Score: <b>{gs if gs is not None else '-'} / 100</b> — Band: <b>{gb or 'N/A'}</b>",
            normal_style,
        )
    )
    story.append(Spacer(1, 8))

    if metric_scores:
        rows = [["Metric Family", "Score", "Band", "Likelihood", "Impact", "Regulatory"]]
        for m in metric_scores:
            rows.append([
                str(m.get("metric", "-")).title(),
                str(m.get("score_100", "-")),
                str(m.get("band", "-")),
                f"{float(m.get('L', 0) or 0):.2f}",
                f"{float(m.get('I', 0) or 0):.2f}",
                f"{float(m.get('R', 0) or 0):.2f}",
            ])

        tbl = Table(rows, colWidths=[4 * cm, 2 * cm, 3 * cm, 2.5 * cm, 2.5 * cm, 2.5 * cm])
        
        # Zebra striping style
        ts = TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")), # Header BG
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"), # Center scores
            ("ALIGN", (0, 0), (0, -1), "LEFT"),   # Left align Metric Name
        ])

        # Add zebra striping
        for i in range(1, len(rows)):
            if i % 2 == 0:
                ts.add("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f9fafb"))

        tbl.setStyle(ts)
        story.append(tbl)
    else:
        story.append(Paragraph("No metrics computed for this audit.", subtle_style))

    story.append(Spacer(1, 14))

    # =========================================
    # METADATA
    # =========================================
    story.append(Paragraph("Audit Metadata", section_style))
    
    meta_rows = [
        ["Model Name", str(audit.get("model_name", "-")), "Executed At", str(audit.get("executed_at", "-"))],
        ["Model ID", str(audit.get("model_frontend_id", "-")), "Result", str(audit.get("audit_result", "-"))],
        ["Type", str(audit.get("audit_type", "-")), "Total Findings", str(summary.get("total_findings_raw", 0))],
    ]
    
    meta_table = Table(meta_rows, colWidths=[3*cm, 6*cm, 3*cm, 6*cm])
    meta_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f9fafb")), # Label Col 1
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f9fafb")), # Label Col 3
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(PageBreak())

    # =========================================
    # FINDINGS & REMEDIATION
    # =========================================
    story.append(Paragraph("Detailed Findings & Remediation", section_style))

    if not grouped_findings:
        story.append(Paragraph("No findings to report. The model passed all checks.", normal_style))
    else:
        for f in grouped_findings:
            # Keep finding block together to prevent page breaks inside an issue
            content = []
            
            # Header line: Category | Severity | Occurrences
            sev_color = _severity_color_obj(f.get("severity"))
            header_text = f"<font color='{_severity_color_hex(f.get('severity'))}'><b>[{f.get('severity')}]</b></font> {f.get('category')} - {f.get('metric_name')}"
            
            content.append(Paragraph(header_text, ParagraphStyle("FindingHead", parent=normal_style, fontSize=11, spaceAfter=4)))
            
            # Description
            content.append(Paragraph(f"<b>Issue:</b> {f.get('description', '-')}", normal_style))
            content.append(Spacer(1, 4))
            
            # Context
            explain = f.get("explain") or {}
            if explain:
                content.append(Paragraph(f"<i>Context: {explain.get('simple_definition', '')}</i>", subtle_style))
            
            # Fix Steps
            remediation = f.get("remediation") or {}
            steps = remediation.get("fix_steps") or []
            if steps:
                content.append(Spacer(1, 4))
                content.append(Paragraph("<b>Recommended Remediation:</b>", normal_style))
                for s in steps[:5]: # Limit to top 5 steps
                    content.append(Paragraph(f"• {s}", ParagraphStyle("List", parent=normal_style, leftIndent=10)))

            content.append(Spacer(1, 12))
            content.append(Paragraph("_" * 50, subtle_style)) # Separator
            content.append(Spacer(1, 12))
            
            story.append(KeepTogether(content))

    story.append(PageBreak())

    # =========================================
    # EVIDENCE APPENDIX
    # =========================================
    story.append(Paragraph("Evidence Appendix (Sample)", section_style))
    story.append(Paragraph("A subset of failing interactions for verification.", subtle_style))
    story.append(Spacer(1, 10))

    if not evidence_samples:
        story.append(Paragraph("No evidence samples stored.", normal_style))
    else:
        # Show max 5 samples to avoid 50 page PDFs
        for i, sample in enumerate(evidence_samples[:5]):
            s_content = []
            s_content.append(Paragraph(f"<b>Sample #{i+1}</b> (Latency: {sample.get('latency_ms')}ms)", normal_style))
            
            # Grey box for prompt/response
            s_content.append(Spacer(1, 4))
            s_content.append(Paragraph(f"<b>Prompt:</b> {sample.get('prompt', '')[:500]}...", normal_style))
            s_content.append(Spacer(1, 4))
            s_content.append(Paragraph(f"<b>Response:</b> {sample.get('response', '')[:500]}...", normal_style))
            
            s_content.append(Spacer(1, 14))
            story.append(KeepTogether(s_content))

    doc.build(story)
    
    pdf_bytes = buf.getvalue()
    buf.close()
    return pdf_bytes