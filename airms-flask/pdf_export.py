from datetime import datetime
from io import BytesIO

from flask import Response
from reportlab.pdfgen import canvas


def build_pdf_report(title, body):
    buf = BytesIO()
    pdf = canvas.Canvas(buf)
    pdf.setTitle(title)
    pdf.drawString(72, 800, title)
    pdf.drawString(72, 780, f"Generated: {datetime.utcnow().isoformat()}Z")
    pdf.drawString(72, 760, str(body)[:120])
    pdf.save()
    return Response(buf.getvalue(), mimetype="application/pdf")
