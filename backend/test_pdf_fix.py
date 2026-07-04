import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.db import SessionLocal
from modules.report_generator import generate_pdf_report

db = SessionLocal()
try:
    generate_pdf_report("AXON-W-1783145251-0x75A77d-480607", db)
    print("Success")
except Exception as e:
    import traceback
    traceback.print_exc()
