from __future__ import annotations

from typing import Dict, Any, List
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def _severity_color(sev: str):
    s = (sev or "").upper()
    if s == "CRITICAL":
        return colors.HexColor("#dc2626")
    if s == "HIGH":
        return colors.HexColor("#f97316")
    if s == "MEDIUM":
        return colors.HexColor("#f59e0b")
    if s == "LOW":
        return colors.HexColor("#16a34a")
    return colors.HexColor("#6b7280")


def generate_audit_pdf_bytes(structured_report: Dict[str, Any]) -> bytes:
    """
    Produces a professional PDF as bytes using ReportLab.
    No system libs required.
    """
    audit = structured_report.get("audit", {}) or {}
    counts = structured_report.get("counts", {}) or {}
    executive_summary = structured_report.get("executive_summary", []) or []
    findings: List[Dict[str, Any]] = structured_report.get("findings", []) or []
    interactions: List[Dict[str, Any]] = structured_report.get("interactions", []) or []

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        title="AI Auditor Report",
        author="AI Auditor Platform",
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontSize=16,
        spaceAfter=8,
    )

    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontSize=12,
        spaceBefore=12,
        spaceAfter=6,
    )

    normal_style = ParagraphStyle(
        "NormalSmall",
        parent=styles["BodyText"],
        fontSize=9,
        leading=12,
    )

    subtle_style = ParagraphStyle(
        "Subtle",
        parent=styles["BodyText"],
        fontSize=9,
        textColor=colors.HexColor("#6b7280"),
        leading=12,
    )

    story = []

    # ==========================
    # TITLE
    # ==========================
    story.append(Paragraph("AI Auditor Report", title_style))
    story.append(Paragraph(f"Audit ID: <b>{audit.get('audit_id', '-')}</b>", subtle_style))
    story.append(Spacer(1, 10))

    # ==========================
    # EXECUTIVE SUMMARY
    # ==========================
    story.append(Paragraph("Executive Summary", section_style))
    if executive_summary:
        for line in executive_summary:
            story.append(Paragraph(f"- {line}", normal_style))
    else:
        story.append(Paragraph("No executive summary available.", normal_style))
    story.append(Spacer(1, 10))

    # ==========================
    # METADATA TABLE
    # ==========================
    story.append(Paragraph("Audit Metadata", section_style))
    meta_data = [
        ["Model", f"{audit.get('model_name', '-') } ({audit.get('model_frontend_id', '-')})"],
        ["Executed At", str(audit.get("executed_at", "-"))],
        ["Audit Result", str(audit.get("audit_result", "-"))],
        ["Execution Status", str(audit.get("execution_status", "-"))],
        ["Total Findings", str(counts.get("findings_total", 0))],
        ["Evidence Interactions", str(counts.get("interactions_total", 0))],
    ]

    meta_table = Table(meta_data, colWidths=[5 * cm, 12 * cm])
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f9fafb")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # ==========================
    # FINDINGS TABLE
    # ==========================
    story.append(Paragraph("Findings", section_style))

    if not findings:
        story.append(Paragraph("No findings recorded in this audit.", normal_style))
    else:
        rows = [["Finding ID", "Category", "Severity", "Metric", "Description"]]

        for f in findings:
            rows.append(
                [
                    str(f.get("finding_id", "-")),
                    str(f.get("category", "-")).upper(),
                    str(f.get("severity", "-")).upper(),
                    str(f.get("metric_name", "-")),
                    str(f.get("description", "-")),
                ]
            )

        findings_table = Table(
            rows,
            colWidths=[3.0 * cm, 2.5 * cm, 2.5 * cm, 3.2 * cm, 7.8 * cm],
        )

        style_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f9fafb")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("FONTSIZE", (0, 1), (-1, -1), 7.5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]

        for idx, f in enumerate(findings, start=1):
            sev_col = _severity_color(f.get("severity"))
            style_cmds.append(("TEXTCOLOR", (2, idx), (2, idx), sev_col))
            style_cmds.append(("FONTNAME", (2, idx), (2, idx), "Helvetica-Bold"))

        findings_table.setStyle(TableStyle(style_cmds))
        story.append(findings_table)

        story.append(Spacer(1, 12))

        # ==========================
        # DETAILED GUIDANCE
        # ==========================
        story.append(Paragraph("Detailed Guidance", section_style))

        for f in findings:
            explain = f.get("explain", {}) or {}
            remediation = f.get("remediation", {}) or {}
            steps = remediation.get("fix_steps", []) or []

            story.append(
                Paragraph(
                    f"<b>{f.get('finding_id','-')}</b> — {explain.get('title','Risk Finding')}",
                    normal_style,
                )
            )
            story.append(Paragraph(f"<b>Meaning:</b> {explain.get('simple_definition','-')}", normal_style))
            story.append(Paragraph(f"<b>Why it matters:</b> {explain.get('why_it_matters','-')}", normal_style))

            owner = remediation.get("recommended_owner")
            if owner:
                story.append(Paragraph(f"<b>Recommended owner:</b> {owner}", normal_style))

            if steps:
                story.append(Paragraph("<b>Fix steps:</b>", normal_style))
                for s in steps[:8]:
                    story.append(Paragraph(f"- {s}", normal_style))

            story.append(Spacer(1, 8))

    story.append(PageBreak())

    # ==========================
    # EVIDENCE
    # ==========================
    story.append(Paragraph("Evidence (Prompt/Response Interactions)", section_style))

    if not interactions:
        story.append(Paragraph("No interactions recorded for this audit.", normal_style))
    else:
        for i in interactions[:25]:
            story.append(
                Paragraph(
                    f"<b>Prompt ID:</b> {i.get('prompt_id','-')}    <b>Latency:</b> {i.get('latency_ms','-')} ms",
                    subtle_style,
                )
            )
            story.append(Spacer(1, 4))
            story.append(Paragraph("<b>Prompt:</b>", normal_style))
            story.append(Paragraph(str(i.get("prompt", "")), normal_style))
            story.append(Spacer(1, 6))
            story.append(Paragraph("<b>Response:</b>", normal_style))
            story.append(Paragraph(str(i.get("response", "")), normal_style))
            story.append(Spacer(1, 12))

    doc.build(story)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
