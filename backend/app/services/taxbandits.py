"""
TaxBandits API service.
Handles OAuth2 token acquisition and Form 4868 / 1040 submission.

Auth flow:
  1. Build JWS (JWT signed with client_secret, audience = user_token)
  2. GET https://testoauth.expressauth.net/v2/tbsauth  with JWS in Authorization header
  3. Use returned AccessToken as Bearer token for all API calls

Docs: https://developer.taxbandits.com/docs/OAuth2.0Authentication
"""
import time
import httpx
import jose.jwt as jwt
from app.config import get_settings

settings = get_settings()

_token_cache: dict = {"token": None, "expires_at": 0}


def _get_access_token() -> str:
    """Return a valid Bearer token, refreshing if expired."""
    now = time.time()
    if _token_cache["token"] and now < _token_cache["expires_at"] - 60:
        return _token_cache["token"]

    # Build JWS payload
    payload = {
        "iss": settings.taxbandits_client_id,
        "sub": settings.taxbandits_client_id,
        "aud": settings.taxbandits_user_token,
        "iat": int(now),
    }
    jws = jwt.encode(payload, settings.taxbandits_client_secret, algorithm="HS256")

    resp = httpx.get(
        settings.taxbandits_auth_url,
        headers={"Authentication": jws},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    if data.get("StatusCode") != 200:
        raise RuntimeError(f"TaxBandits auth failed: {data}")

    _token_cache["token"] = data["AccessToken"]
    _token_cache["expires_at"] = now + data.get("ExpiresIn", 3600)
    return _token_cache["token"]


def _api_post(path: str, body: dict) -> dict:
    token = _get_access_token()
    url = f"{settings.taxbandits_base_url}/{path.lstrip('/')}"
    resp = httpx.post(
        url,
        json=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )
    if not resp.is_success:
        raise RuntimeError(f"TaxBandits API error {resp.status_code}: {resp.text}")
    return resp.json()


def submit_4868(data) -> dict:
    """
    Create and transmit a Form 4868 extension via TaxBandits.
    Returns dict with submission_id and status.
    """
    is_joint = bool(data.spouse_ssn)
    body = {
        "SubmissionManifest": {
            "TaxYear": str(data.tax_year),
        },
        "ReturnHeader": {
            "TaxPayer": {
                "TaxPayerId": None,
                "FirstNm": data.first_name,
                "MiddleNm": None,
                "LastNm": data.last_name,
                "Suffix": None,
                "TaxTaxPayerRef": None,
                "TradeNm": None,
                "IsEIN": False,
                "EINorSSN": data.ssn.replace("-", ""),
                "IsForeign": False,
                "USAddress": {
                    "Address1": data.address,
                    "Address2": None,
                    "City": data.city,
                    "State": data.state,
                    "ZipCd": data.zip_code,
                },
                "ForeignAddress": None,
            }
        },
        "ReturnData": {
            "TypeOfFiling": "JOINT" if is_joint else "SINGLE",
            "SpouseDetails": None,
            "IsTaxPayerAbroad": False,
            "IsNonResNoWH": False,
            "TentativeTax": int(data.estimated_tax),
            "TotPayments": int(data.tax_payments),
            "BalanceDue": int(data.balance_due),
            "PaymentAmt": None,
            "IRSPaymentType": None,
            "IRSPayment": None,
            "TaxPayerSignatureDetails": {
                "PIN": data.pin,
                "DOB": data.dob,
                "PrevYrAdjGrossIncome": int(data.prev_year_agi),
                "PrevYrPIN": None,
            },
            "SpouseSignatureDetails": None,
        },
    }

    # Add spouse if joint filing
    if is_joint:
        body["ReturnData"]["SpouseDetails"] = {
            "FirstNm": data.spouse_first_name,
            "MiddleNm": None,
            "LastNm": data.spouse_last_name,
            "Suffix": None,
            "SSN": data.spouse_ssn.replace("-", ""),
            "Phone": data.spouse_phone,
        }
        body["ReturnData"]["SpouseSignatureDetails"] = {
            "PIN": data.spouse_pin,
            "DOB": data.spouse_dob,
            "PrevYrAdjGrossIncome": int(data.spouse_prev_year_agi),
            "PrevYrPIN": None,
        }

    result = _api_post("Form4868/Create", body)

    errors = result.get("Errors")
    if errors:
        raise RuntimeError(f"TaxBandits 4868 error: {errors}")

    return {
        "submission_id": result.get("SubmissionId"),
        "status": result.get("Form4868Status", "CREATED"),
        "taxbandits_payer_id": result.get("TaxPayerId"),
    }


def transmit_4868(submission_id: str) -> dict:
    """Transmit a previously created Form 4868 to the IRS."""
    result = _api_post("Form4868/Transmit", {
        "SubmissionIds": [submission_id]
    })
    return result


def get_4868_status(submission_id: str) -> dict:
    """Get the current IRS status of a Form 4868 submission."""
    token = _get_access_token()
    url = f"{settings.taxbandits_base_url}/Form4868/Status"
    resp = httpx.get(
        url,
        params={"SubmissionId": submission_id},
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()
