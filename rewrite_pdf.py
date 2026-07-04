import io
import time
from sqlalchemy.orm import Session
from database.models import VerificationReport, InvestigationLog
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Will write python code to generate the file here
