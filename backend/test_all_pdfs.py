import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.db import SessionLocal
from modules.report_generator import generate_pdf_report
from database.models import VerificationReport

db = SessionLocal()
try:
    for etype in ["wallet", "contract", "bulk_batch"]:
        rep = db.query(VerificationReport).filter(VerificationReport.entity_type == etype).first()
        if rep:
            generate_pdf_report(rep.report_id, db)
            print(f"Success for {etype}: {rep.report_id}")
        else:
            print(f"No {etype} report found")
except Exception as e:
    import traceback
    traceback.print_exc()
