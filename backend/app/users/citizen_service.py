import json
from pathlib import Path
from typing import Optional, Dict, Any
from ..policies.models import UserProfile
from ..database import get_database


class CitizenService:
    @staticmethod
    async def get_by_aadhaar(aadhaar_no: str) -> Optional[UserProfile]:
        """
        Fetches a citizen profile from MongoDB and falls back to local JSON registry
        if DB is unavailable or record is missing.
        """
        aadhaar_str = str(aadhaar_no).strip()
        citizen_data = None

        db = get_database()
        if db is not None:
            # Aadhaar may be stored as int or string depending on ingestion path.
            query = {"Aadhaar_No": aadhaar_str}
            if aadhaar_str.isdigit():
                query = {
                    "$or": [
                        {"Aadhaar_No": aadhaar_str},
                        {"Aadhaar_No": int(aadhaar_str)},
                    ]
                }
            citizen_data = await db.citizens.find_one(query)

        # Fallback to local dataset so dashboard works even before Mongo import.
        if not citizen_data:
            citizen_data = CitizenService._find_in_local_registry(aadhaar_str)

        if not citizen_data:
            return None

        # Map registry fields to UserProfile
        docs = []
        if citizen_data.get("Aadhaar_No"):
            docs.append("Aadhar Card")
        if citizen_data.get("Voter_ID"):
            docs.append("Voter ID")
        if citizen_data.get("Driving_License"):
            docs.append("Driving License")
        if citizen_data.get("PAN_No"):
            docs.append("PAN Card")
        if citizen_data.get("Bank_Account"):
            docs.append("Bank Account Details")
        if citizen_data.get("Ration_Card_Type"):
            docs.append("Ration Card")

        profile_dict = {
            "user_id": citizen_data.get("Citizen_ID"),
            "aadhaar_no": str(citizen_data.get("Aadhaar_No", "")),
            "name": citizen_data.get("Full_Name"),
            "age": citizen_data.get("Age"),
            "income": float(citizen_data.get("Annual_Income", 0)),
            "occupation": citizen_data.get("Occupation", "").capitalize(),
            "state": citizen_data.get("State"),
            "caste": citizen_data.get("Caste_Category") or citizen_data.get("Caste"),
            "gender": citizen_data.get("Gender"),
            "residency_type": citizen_data.get("Rural_or_Urban"),
            "ration_card": True if citizen_data.get("Ration_Card_Type") else False,
            "ration_card_type": citizen_data.get("Ration_Card_Type"),
            "bpl_status": citizen_data.get("BPL_Status", False),
            "disability_status": citizen_data.get("Disability_Status", False),
            "senior_citizen": citizen_data.get("Senior_Citizen", False),
            "land_ownership": citizen_data.get("Land_Ownership"),
            "bank_account": citizen_data.get("Bank_Account"),
            "student_status": citizen_data.get("Student_Status"),
            "indian_citizen": True,
            "income_tax_payer": False,
            "institutional_landholder": False,
            "included_in_secc_2011": citizen_data.get("BPL_Status", False),
            "no_family_size_limit": True,
            "no_pucca_house": not bool(citizen_data.get("House_Ownership")),
            "first_time_home_buyer": not bool(citizen_data.get("House_Ownership")),
            "enrolled_in_recognized_institution": citizen_data.get("Student_Status", False),
            "head_of_family": True,
            "government_employee": (citizen_data.get("Occupation", "").lower() in ["govt employee", "government employee"]),
            "ration_card_holder": bool(citizen_data.get("Ration_Card_Type")),
            "electricity_connection": bool(citizen_data.get("House_Ownership")),
            "resident": True,
            "family_income": float(citizen_data.get("Annual_Income", 0)),
            "maximum_two_girl_children": False,
            "education_completed": citizen_data.get("Education_Level") not in [None, "", "No Schooling"],
            "female_head_of_family": (citizen_data.get("Gender", "").lower() == "female"),
            "informal_worker": (citizen_data.get("Employment_Type", "").lower() == "informal"),
            "no_lpg_connection": not bool(citizen_data.get("House_Ownership")),
            "uploaded_documents": docs,
            "is_complete": True,
        }

        return UserProfile(**profile_dict)

    @staticmethod
    def _find_in_local_registry(aadhaar_no: str) -> Optional[Dict[str, Any]]:
        data_path = Path(__file__).resolve().parents[2] / "data" / "citizens.json"
        if not data_path.exists():
            return None

        try:
            with data_path.open("r", encoding="utf-8") as f:
                citizens = json.load(f)
        except Exception:
            return None

        aadhaar_str = str(aadhaar_no).strip()
        for citizen in citizens:
            if str(citizen.get("Aadhaar_No", "")).strip() == aadhaar_str:
                return citizen

        return None
