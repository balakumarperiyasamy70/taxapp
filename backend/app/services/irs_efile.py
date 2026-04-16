"""
IRS e-file submission — routes through TaxBandits as transmitter.
TaxBandits handles IRS MeF submission on our behalf (no EFIN required).

When EFIN is approved, switch to direct IRS MeF (see commented code below).
"""
from app.services import taxbandits


def submit_4868(tax_return, data) -> dict:
    """Submit Form 4868 extension via TaxBandits."""
    result = taxbandits.submit_4868(data)
    return {
        "submission_id": result["submission_id"],
        "status": result["status"],
    }


def submit_1040(tax_return, data) -> dict:
    """Submit Form 1040 via TaxBandits. (Endpoint integration pending.)"""
    # TODO: implement taxbandits.submit_1040() once 1040 endpoint is confirmed
    raise NotImplementedError("1040 TaxBandits integration coming soon")
