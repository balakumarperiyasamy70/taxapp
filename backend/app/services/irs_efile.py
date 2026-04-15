"""
IRS MeF (Modernized e-File) submission service.
Generates IRS-compliant XML and submits via SOAP to MeF gateway.

NOTE: Full MeF integration requires:
  - IRS EFIN (Electronic Filing Identification Number)
  - IRS e-Services registration
  - Approved Software ID from IRS
  - TLS client certificate from IRS
"""
from lxml import etree
from app.config import get_settings
import uuid

settings = get_settings()


def _build_4868_xml(tax_return, data) -> bytes:
    ns = "urn:us:gov:treasury:irs:ext:aca:air:ty24"
    root = etree.Element("IRS4868", nsmap={None: ns})

    etree.SubElement(root, "TaxYear").text = str(data.tax_year)
    etree.SubElement(root, "FirstName").text = data.first_name
    etree.SubElement(root, "LastName").text = data.last_name
    etree.SubElement(root, "SSN").text = data.ssn.replace("-", "")
    etree.SubElement(root, "AddressLine1").text = data.address
    etree.SubElement(root, "City").text = data.city
    etree.SubElement(root, "State").text = data.state
    etree.SubElement(root, "ZIPCode").text = data.zip_code
    etree.SubElement(root, "TotalProperTaxLiability").text = f"{data.estimated_tax:.2f}"
    etree.SubElement(root, "TotalPayments").text = f"{data.tax_payments:.2f}"
    etree.SubElement(root, "BalanceDue").text = f"{data.balance_due:.2f}"

    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", pretty_print=True)


def submit_4868(tax_return, data) -> dict:
    """Submit Form 4868 to IRS MeF. Returns submission tracking info."""
    xml_payload = _build_4868_xml(tax_return, data)
    submission_id = f"TEST-{uuid.uuid4().hex[:12].upper()}"

    # TODO: Replace with actual MeF SOAP call when IRS credentials available
    # soap_client = zeep.Client(settings.irs_mef_url)
    # response = soap_client.service.Submit(xml_payload)

    return {
        "submission_id": submission_id,
        "status": "submitted",
        "xml_payload": xml_payload.decode(),
    }


def submit_1040(tax_return, data) -> dict:
    """Submit Form 1040 to IRS MeF. Placeholder until full MeF schema implemented."""
    submission_id = f"TEST-{uuid.uuid4().hex[:12].upper()}"
    return {
        "submission_id": submission_id,
        "status": "submitted",
    }
