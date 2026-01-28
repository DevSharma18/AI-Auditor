# backend/report_pdf_reportlab.py

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
)


def _severity_color(sev: str):
    s = (sev or "").upper().strip()
    if s == "CRITICAL":
        return colors.HexColor("#991b1b")
    if s == "HIGH":
        return colors.HexColor("#9a3412")
    if s == "MEDIUM":
        return colors.HexColor("#92400e")
    if s == "LOW":
        return colors.HexColor("#166534")
    return colors.HexColor("#374151")


def generate_audit_pdf_bytes(structured_report: Dict[str, Any]) -> bytes:
    """
    Professional PDF:
    - Executive summary
    - Dynamic scoring (global + metric)
    - Metadata
    - Grouped findings only (deduped)
    - Occurrences count
    - Evidence references only (no raw prompt logs)
    """

    audit = structured_report.get("audit", {}) or {}
    summary = structured_report.get("summary", {}) or {}
    executive_summary = structured_report.get("executive_summary", []) or []

    global_risk = structured_report.get("global_risk", {}) or {}
    metric_scores: List[Dict[str, Any]] = structured_report.get("metric_scores", []) or []

    grouped_findings: List[Dict[str, Any]] = structured_report.get("grouped_findings", []) or []
    evidence_samples: List[Dict[str, Any]] = structured_report.get("evidence_samples", []) or []

    buf = BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        title="AI Auditor Executive Report",
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
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor("#111827"),
    )

    subtle_style = ParagraphStyle(
        "Subtle",
        parent=styles["BodyText"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#6b7280"),
    )

    story: List[Any] = []

    # =========================================
    # HEADER
    # =========================================
    story.append(Paragraph("AI Auditor Executive Report", title_style))
    story.append(Paragraph(f"Audit ID: <b>{audit.get('audit_id', '-')}</b>", subtle_style))
    story.append(Spacer(1, 10))

    # =========================================
    # EXECUTIVE SUMMARY
    # =========================================
    story.append(Paragraph("Executive Summary", section_style))
    if executive_summary:
        for line in executive_summary:
            story.append(Paragraph(f"• {line}", normal_style))
    else:
        story.append(Paragraph("No executive summary available.", normal_style))
    story.append(Spacer(1, 12))

    # =========================================
    # DYNAMIC SCORING
    # =========================================
    story.append(Paragraph("Dynamic Risk Scoring", section_style))

    gs = global_risk.get("score_100")
    gb = global_risk.get("band")

    story.append(
        Paragraph(
            f"<b>Global risk score:</b> {gs if gs is not None else '-'} / 100 "
            f"(<b>{gb or 'UNKNOWN'}</b>)",
            normal_style,
        )
    )
    story.append(Spacer(1, 8))

    if metric_scores:
        rows = [["Metric", "Score (0–100)", "Band", "L", "I", "R"]]
        for m in metric_scores:
            rows.append(
                [
                    str(m.get("metric", "-")).upper(),
                    str(m.get("score_100", "-")),
                    str(m.get("band", "-")),
                    str(round(float(m.get("L", 0.0) or 0.0), 2)),
                    str(round(float(m.get("I", 0.0) or 0.0), 2)),
                    str(round(float(m.get("R", 0.0) or 0.0), 2)),
                ]
            )

        tbl = Table(rows, colWidths=[3.0 * cm, 3.2 * cm, 2.6 * cm, 2.0 * cm, 2.0 * cm, 2.0 * cm])
        tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f9fafb")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 8.5),
                    ("FONTSIZE", (0, 1), (-1, -1), 8.0),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(tbl)
    else:
        story.append(Paragraph("No metric scoring available for this audit.", subtle_style))

    story.append(Spacer(1, 14))

    # =========================================
    # METADATA
    # =========================================
    story.append(Paragraph("Audit Metadata", section_style))

    meta_rows = [
        ["Model Name", str(audit.get("model_name", "-"))],
        ["Model ID", str(audit.get("model_frontend_id", "-"))],
        ["Audit Type", str(audit.get("audit_type", "-"))],
        ["Executed At", str(audit.get("executed_at", "-"))],
        ["Execution Status", str(audit.get("execution_status", "-"))],
        ["Audit Result", str(audit.get("audit_result", "-"))],
        ["Raw Findings", str(summary.get("total_findings_raw", 0))],
        ["Unique Issues", str(structured_report.get("unique_issue_count", 0))],
    ]

    meta_table = Table(meta_rows, colWidths=[5.0 * cm, 12.0 * cm])
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f9fafb")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
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

    # =========================================
    # GROUPED FINDINGS
    # =========================================
    story.append(Paragraph("Key Findings (Deduplicated)", section_style))

    if not grouped_findings:
        story.append(Paragraph("No findings recorded in this audit.", normal_style))
    else:
        rows = [["Category", "Severity", "Metric", "Occurrences", "Description"]]

        for f in grouped_findings:
            rows.append(
                [
                    str(f.get("category", "-")),
                    str(f.get("severity", "-")),
                    str(f.get("metric_name", "-")),
                    str(f.get("occurrences", 0)),
                    str(f.get("description", "-")),
                ]
            )

        tbl = Table(rows, colWidths=[2.4 * cm, 2.2 * cm, 3.0 * cm, 2.2 * cm, 7.2 * cm])
        style_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f9fafb")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8.5),
            ("FONTSIZE", (0, 1), (-1, -1), 7.8),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]

        for idx, f in enumerate(grouped_findings, start=1):
            sev_col = _severity_color(f.get("severity"))
            style_cmds.append(("TEXTCOLOR", (1, idx), (1, idx), sev_col))
            style_cmds.append(("FONTNAME", (1, idx), (1, idx), "Helvetica-Bold"))

        tbl.setStyle(TableStyle(style_cmds))
        story.append(tbl)

    story.append(PageBreak())

    # =========================================
    # GUIDANCE
    # =========================================
    story.append(Paragraph("Recommendations", section_style))

    if not grouped_findings:
        story.append(Paragraph("No issues to remediate.", normal_style))
    else:
        for f in grouped_findings:
            explain = f.get("explain") or {}
            remediation = f.get("remediation") or {}
            steps = remediation.get("fix_steps") or []

            story.append(
                Paragraph(
                    f"<b>{f.get('category','-')}</b> — <b>{f.get('metric_name','-')}</b> "
                    f"(Severity: <b>{f.get('severity','-')}</b>, Occurrences: <b>{f.get('occurrences',0)}</b>)",
                    normal_style,
                )
            )
            story.append(Spacer(1, 4))
            story.append(Paragraph(f"<b>Issue:</b> {f.get('description','-')}", normal_style))
            story.append(Spacer(1, 4))

            if explain:
                story.append(Paragraph(f"<b>What it means:</b> {explain.get('simple_definition','-')}", normal_style))
                story.append(Paragraph(f"<b>Why it matters:</b> {explain.get('why_it_matters','-')}", normal_style))

            owner = remediation.get("recommended_owner")
            priority = remediation.get("priority")
            if owner or priority:
                story.append(
                    Paragraph(
                        f"<b>Owner:</b> {owner or '-'} &nbsp;&nbsp; <b>Priority:</b> {priority or '-'}",
                        subtle_style,
                    )
                )

            if steps:
                story.append(Paragraph("<b>Recommended Fix Steps:</b>", normal_style))
                for s in steps[:8]:
                    story.append(Paragraph(f"• {s}", normal_style))

            story.append(Spacer(1, 10))

    story.append(PageBreak())

    # =========================================
    # EVIDENCE REFERENCES (LIMITED)
    # =========================================
    story.append(Paragraph("Evidence References (Limited)", section_style))
    story.append(
        Paragraph(
            "This report includes limited evidence references for traceability. Raw prompt/response logs are intentionally excluded.",
            subtle_style,
        )
    )
    story.append(Spacer(1, 10))

    if not evidence_samples:
        story.append(Paragraph("No evidence references available.", normal_style))
    else:
        rows = [["Finding ID", "Interaction ID", "Prompt ID", "Timestamp", "Latency (ms)"]]
        for e in evidence_samples:
            rows.append(
                [
                    str(e.get("finding_id", "-")),
                    str(e.get("interaction_id", "-")),
                    str(e.get("prompt_id", "-")),
                    str(e.get("created_at", "-")),
                    str(e.get("latency_ms", "-")),
                ]
            )

        tbl = Table(rows, colWidths=[3.4 * cm, 3.0 * cm, 3.0 * cm, 5.0 * cm, 2.5 * cm])
        tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f9fafb")),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 8.5),
                    ("FONTSIZE", (0, 1), (-1, -1), 8.0),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111827")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(tbl)

    doc.build(story)

    pdf_bytes = buf.getvalue()
    buf.close()
    return pdf_bytes
