from database.session import SessionLocal
from modules.report_generator import generate_pdf_report
from database.models import VerificationReport

db = SessionLocal()
report = db.query(VerificationReport).filter(VerificationReport.entity_type == "contract").first()
if report:
    print(f"Testing contract report: {report.report_id}")
    try:
        generate_pdf_report(report.report_id, db)
        print("Contract PDF generation successful.")
    except Exception as e:
        import traceback
        traceback.print_exc()
else:
    print("No contract report found.")
