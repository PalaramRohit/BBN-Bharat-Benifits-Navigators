import re
from typing import List, Dict, Any
from ..policies.models import EligibilityResult, Policy


class OptimizationEngine:
    def _is_non_cash_benefit(self, policy: Policy) -> bool:
        benefits = policy.benefits or {}
        text = " ".join(
            [
                str(policy.category or ""),
                str(policy.description or ""),
                str(benefits.get("coverage", "")),
                str(benefits.get("details", "")),
            ]
        ).lower()

        recurring_cash_markers = [
            "monthly pension",
            "per month",
            "monthly assistance",
            "cash transfer",
            "stipend",
            "allowance",
            "income support",
        ]
        if any(marker in text for marker in recurring_cash_markers):
            return False

        non_cash_markers = [
            "insurance",
            "coverage",
            "hospital",
            "hospitalization",
            "medical treatment",
            "sum insured",
            "reimbursement",
            "health cover",
            "claim",
        ]
        return any(marker in text for marker in non_cash_markers)

    def _parse_amount(self, text: str) -> float:
        if not text:
            return 0.0

        # Supports: "5000", "5 lakh", "1.2 crore", "Rs 6,000 per year"
        matches = re.findall(
            r"(\d[\d,]*(?:\.\d+)?)\s*(lakh|lakhs|lac|lacs|crore|crores|cr)?",
            text.lower(),
        )
        if not matches:
            return 0.0

        best_value = 0.0
        for raw_number, unit in matches:
            number = float(raw_number.replace(",", ""))
            multiplier = 1.0
            if unit in {"lakh", "lakhs", "lac", "lacs"}:
                multiplier = 100000.0
            elif unit in {"crore", "crores", "cr"}:
                multiplier = 10000000.0
            best_value = max(best_value, number * multiplier)

        return best_value

    def _extract_amount(self, policy: Policy) -> float:
        benefits = policy.benefits or {}

        direct_amount = benefits.get("amount", None)
        if isinstance(direct_amount, (int, float)) and float(direct_amount) > 0:
            return float(direct_amount)

        if isinstance(direct_amount, str):
            parsed = self._parse_amount(direct_amount)
            if parsed > 0:
                return parsed

        text_candidates = [
            str(benefits.get("coverage", "")),
            str(benefits.get("details", "")),
            policy.description or "",
        ]

        parsed_candidates = [self._parse_amount(text) for text in text_candidates]
        parsed_value = max(parsed_candidates) if parsed_candidates else 0.0
        if parsed_value > 0:
            return parsed_value

        return 0.0

    def _monthly_amount(self, amount: float, policy: Policy) -> float:
        if amount <= 0:
            return 0.0

        benefits = policy.benefits or {}
        frequency = str(benefits.get("frequency", "")).lower()
        reference_text = f"{frequency} {policy.description or ''} {benefits.get('details', '')}".lower()

        if any(token in reference_text for token in ["annual", "year", "yearly", "per year"]):
            return amount / 12.0
        if any(token in reference_text for token in ["monthly", "month", "per month"]):
            return amount
        if any(token in reference_text for token in ["one-time", "one time", "lump sum"]):
            return amount / 12.0

        # Safer default: treat unknown frequency as annual-equivalent.
        return amount / 12.0

    def run(self, eligibility_results: List[EligibilityResult], policies: List[Policy]) -> Dict[str, Any]:
        eligible_ids = {r.policy_id for r in eligibility_results if r.is_eligible}

        monthly_total = 0.0
        recommended_schemes = []

        for policy in policies:
            if policy.policy_id in eligible_ids:
                if self._is_non_cash_benefit(policy):
                    continue
                amount = self._extract_amount(policy)
                monthly_total += self._monthly_amount(amount, policy)

            recommended_schemes.append(policy.dict())

        monthly_total = round(monthly_total, 2)
        return {
            "recommended_schemes": recommended_schemes,
            "total_estimated_benefit": f"Rs {monthly_total:,.2f}",
        }
