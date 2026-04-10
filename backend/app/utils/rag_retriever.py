import json
import os
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from typing import List, Dict, Any
from ..policies.models import Policy
from ..policies.scheme_rules import get_official_url_for_scheme, get_rule_for_scheme


class RAGRetriever:
    def __init__(self, kb_dir: str = "data/knowledge_base"):
        self.model = None
        try:
            self.model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            print(f"RAGRetriever: embedding model unavailable, using lexical fallback. {e}")
        self.policies: List[Dict[str, Any]] = []
        self._load_all_policies(kb_dir)
        self._harmonize_scope_for_duplicate_names()
        self.index = self._build_index()

    def _normalize_name_key(self, name: str) -> str:
        raw = (name or "").strip().lower()
        chars = []
        for ch in raw:
            chars.append(ch if ch.isalnum() else " ")
        tokens = [t for t in "".join(chars).split() if t not in {"scheme", "yojana"}]
        return " ".join(tokens)

    def _harmonize_scope_for_duplicate_names(self):
        """
        If a scheme appears multiple times and at least one copy has a concrete
        state scope, apply that same state scope to all duplicates by name.
        """
        groups: Dict[str, List[Dict[str, Any]]] = {}
        for policy in self.policies:
            key = self._normalize_name_key(policy.get("name", ""))
            if not key:
                continue
            groups.setdefault(key, []).append(policy)

        for _, items in groups.items():
            if len(items) < 2:
                continue

            concrete_states = set()
            for item in items:
                states = [
                    (s or "").strip()
                    for s in item.get("eligibility_criteria", {}).get("required_states", [])
                ]
                for st in states:
                    low = st.lower()
                    if low and low not in {"all", "central"}:
                        concrete_states.add(st)

            if len(concrete_states) == 1:
                winner = [next(iter(concrete_states))]
                for item in items:
                    item["eligibility_criteria"]["required_states"] = winner

    def _load_all_policies(self, root_dir: str):
        main_policies_path = "data/policies.json"

        if os.path.exists(main_policies_path):
            with open(main_policies_path, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                    if isinstance(data, list):
                        for p in data:
                            self.policies.append(self._normalize_policy(p))
                except Exception as e:
                    print(f"Error loading {main_policies_path}: {e}")

        if not os.path.exists(root_dir):
            return

        for root, dirs, files in os.walk(root_dir):
            for file in files:
                if file.endswith(".json"):
                    path = os.path.join(root, file)
                    with open(path, "r", encoding="utf-8") as f:
                        try:
                            data = json.load(f)
                            if isinstance(data, dict):
                                self.policies.append(
                                    self._normalize_policy(
                                        data,
                                        filename=file,
                                        file_path=path
                                    )
                                )
                        except Exception as e:
                            print(f"Error loading {path}: {e}")

    def _normalize_policy(
        self,
        p: Dict[str, Any],
        filename: str = "",
        file_path: str = ""
    ) -> Dict[str, Any]:

        name = p.get(
            "scheme_name",
            p.get("name", filename.replace(".json", "").replace("_", " ").title())
        )

        benefit_data = p.get("benefit", p.get("benefits", ""))

        if isinstance(benefit_data, list):
            description = ". ".join(benefit_data[:2])
            benefits_dict = {"details": benefit_data, "amount": 0}
        elif isinstance(benefit_data, dict):
            description = p.get("description", str(benefit_data))
            benefits_dict = benefit_data
        else:
            description = p.get("description", str(benefit_data))
            # Preserve raw text so downstream engines can still estimate value.
            benefits_dict = {"amount": 0, "details": str(benefit_data)}

        eligibility_data = p.get("eligibility", p.get("eligibility_criteria", {}))

        detected_states = ["all"]
        search_text = (name + " " + filename + " " + file_path).lower()

        indian_states = [
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
            "Chhattisgarh", "Goa", "Gujarat", "Haryana",
            "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
            "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
            "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
            "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
            "Uttar Pradesh", "Uttarakhand", "West Bengal"
        ]

        abbr_map = {
            "mjpjay": "Maharashtra",
            "mhis": "Meghalaya",
            "rythu": "Telangana",
            "ysr": "Andhra Pradesh",
            "kalaignar": "Tamil Nadu",
            "gruha": "Karnataka",
            "anna": "Karnataka",
            "ladli": "Madhya Pradesh",
            "tamil": "Tamil Nadu",
            "telangana": "Telangana",
            "andhra": "Andhra Pradesh",
            "karnataka": "Karnataka",
            "kerala": "Kerala",
            "odisha": "Odisha",
            "maharashtra": "Maharashtra",
            "gujarat": "Gujarat",
            "assam": "Assam",
            "bihar": "Bihar",
            "rajasthan": "Rajasthan",
            "punjab": "Punjab",
            "haryana": "Haryana",
            "arunachal": "Arunachal Pradesh",
            "himachal": "Himachal Pradesh",
            "madhya pradesh": "Madhya Pradesh",
            "uttar pradesh": "Uttar Pradesh",
            "uttarakhand": "Uttarakhand",
            "west bengal": "West Bengal"
        }

        for abbr, full_state in abbr_map.items():
            if abbr in search_text:
                detected_states = [full_state]
                break

        # Strong signal: if policy is under knowledge_base/states/<StateName>/...
        if detected_states == ["all"] and file_path:
            normalized_path = os.path.normpath(file_path)
            path_parts = normalized_path.split(os.sep)
            if "states" in path_parts:
                states_idx = path_parts.index("states")
                if states_idx + 1 < len(path_parts):
                    detected_states = [path_parts[states_idx + 1]]

        if detected_states == ["all"]:
            for state in indian_states:
                if state.lower() in search_text:
                    detected_states = [state]
                    break

        if isinstance(eligibility_data, list):
            criteria = {
                "min_age": 0,
                "max_age": 100,
                "income_limit": 1000000,
                "required_documents": eligibility_data,
                "required_occupations": ["any"],
                "required_states": detected_states
            }
        else:
            criteria = eligibility_data if isinstance(eligibility_data, dict) else {}
            if (
                "required_states" not in criteria
                or criteria.get("required_states") == ["all"]
            ):
                criteria["required_states"] = detected_states

        # Strongest scope signal: explicit scheme rule state.
        rule = get_rule_for_scheme(name)
        rule_state = (rule or {}).get("state")
        if rule_state:
            criteria["required_states"] = [rule_state]

        return {
            "policy_id": p.get("policy_id", f"KB-{np.random.randint(1000, 9999)}"),
            "name": name,
            "description": description or name,
            "ministry": p.get("ministry", "Various"),
            "category": p.get("category", "General"),
            "benefits": benefits_dict,
            "eligibility_criteria": criteria,
            "application_process": p.get(
                "application_process",
                ["Apply online via official portal"]
            ),
            "official_url": p.get("official_url") or get_official_url_for_scheme(name)
        }

    def _build_index(self):
        if not self.policies or self.model is None:
            return None

        texts = []
        for p in self.policies:
            name = p.get("scheme_name", p.get("name", "Unknown"))
            desc = p.get("description", p.get("benefit", ""))
            category = p.get("category", "")
            texts.append(f"{name} ({category}): {desc}")

        embeddings = self.model.encode(texts)
        dimension = embeddings.shape[1]

        index = faiss.IndexFlatL2(dimension)
        index.add(np.array(embeddings).astype('float32'))

        return index

    def retrieve(
        self,
        query: str,
        state: str = "all",
        top_k: int = 10
    ) -> List[Dict[str, Any]]:

        if not self.policies:
            return []

        if self.index is not None and self.model is not None:
            query_vector = self.model.encode([query])
            _, indices = self.index.search(
                np.array(query_vector).astype("float32"),
                max(top_k * 6, 30)
            )
            candidate_indices = indices[0]
        else:
            # Offline fallback when embedding model/index is unavailable.
            candidate_indices = list(range(len(self.policies)))

        state_matches: List[Dict[str, Any]] = []
        central_matches: List[Dict[str, Any]] = []
        seen_policy_ids = set()

        state_lower = (state or "all").lower()

        for idx in candidate_indices:
            if idx >= len(self.policies):
                continue

            policy = self.policies[idx]
            policy_id = policy.get("policy_id")
            if policy_id in seen_policy_ids:
                continue

            policy_states = [
                (s or "").lower()
                for s in policy
                .get("eligibility_criteria", {})
                .get("required_states", ["all"])
            ]

            is_central = ("all" in policy_states or "central" in policy_states)
            is_state = (state_lower != "all" and state_lower in policy_states)

            if is_state:
                state_matches.append(policy)
                seen_policy_ids.add(policy_id)
            elif is_central:
                central_matches.append(policy)
                seen_policy_ids.add(policy_id)

            if len(state_matches) + len(central_matches) >= top_k * 3:
                break

        if state_lower != "all":
            # Return a balanced mix of selected-state schemes + central schemes.
            target_state = max(1, top_k // 2)
            target_central = top_k - target_state

            results: List[Dict[str, Any]] = []
            results.extend(state_matches[:target_state])
            results.extend(central_matches[:target_central])

            if len(results) < top_k:
                remaining_state = state_matches[target_state:]
                remaining_central = central_matches[target_central:]
                results.extend(
                    (remaining_state + remaining_central)[: top_k - len(results)]
                )

            return results[:top_k]

        return (central_matches + state_matches)[:top_k]

    def retrieve_state_scope(self, state: str = "all") -> List[Dict[str, Any]]:
        """
        Returns all schemes that belong to the selected state or central/all-India.
        Used for deterministic eligibility evaluation.
        """
        state_lower = (state or "all").lower()
        results: List[Dict[str, Any]] = []
        seen = set()

        for policy in self.policies:
            policy_id = policy.get("policy_id")
            if policy_id in seen:
                continue

            policy_states = [
                (s or "").lower()
                for s in policy
                .get("eligibility_criteria", {})
                .get("required_states", ["all"])
            ]

            if (
                "all" in policy_states
                or "central" in policy_states
                or (state_lower != "all" and state_lower in policy_states)
            ):
                results.append(policy)
                seen.add(policy_id)

        return results


# Singleton
rag_retriever = RAGRetriever()
