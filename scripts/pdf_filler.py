#!/usr/bin/env python3
"""Shared AcroForm overlay engine for IRS PDF templates.

Sets /V on text fields and deletes /AP so renderers regenerate appearances
from NeedAppearances=True. Checkboxes set /V and /AS, keep /AP.
This pattern matches the production fill_1040 path on the VPS.
"""
from pypdf import PdfReader, PdfWriter
from pypdf.generic import BooleanObject, NameObject, TextStringObject


def _money(v) -> str:
    if v in (None, "", 0, 0.0):
        return ""
    try:
        n = float(v)
        return "" if n == 0 else f"{n:,.0f}"
    except (TypeError, ValueError):
        return str(v)


def _ssn(v) -> str:
    if not v:
        return ""
    d = "".join(ch for ch in str(v) if ch.isdigit())
    return f"{d[:3]}-{d[3:5]}-{d[5:9]}" if len(d) == 9 else str(v)


def fill_acroform(template_path: str, fields: dict, out_path: str,
                  checkbox_on: str = "/Yes") -> None:
    """Fill an IRS AcroForm PDF.

    fields: {field_name: value}. Bools/"X" treated as checkbox on.
    Field names use the full dotted path, e.g.
    "topmostSubform[0].Page1[0].f1_03[0]".
    """
    reader = PdfReader(template_path)
    writer = PdfWriter(clone_from=reader)

    if "/AcroForm" in writer._root_object:
        writer._root_object["/AcroForm"][NameObject("/NeedAppearances")] = BooleanObject(True)

    for page in writer.pages:
        annots = page.get("/Annots")
        if not annots:
            continue
        for annot_ref in annots:
            annot = annot_ref.get_object()
            name = annot.get("/T")
            if not name or name not in fields:
                # Fallback: also accept short leaf names
                continue
            _apply(annot, fields[name], checkbox_on)

    # Second pass: match by leaf name (e.g. "f1_03[0]") so callers can use
    # short keys if they prefer.
    leaf_map = {k.split(".")[-1]: v for k, v in fields.items() if "." in k}
    leaf_map.update(fields)
    for page in writer.pages:
        annots = page.get("/Annots")
        if not annots:
            continue
        for annot_ref in annots:
            annot = annot_ref.get_object()
            name = annot.get("/T")
            if not name:
                continue
            full = _full_name(annot)
            value = fields.get(full)
            if value is None:
                value = leaf_map.get(name)
            if value is None:
                continue
            _apply(annot, value, checkbox_on)

    with open(out_path, "wb") as fh:
        writer.write(fh)


def _full_name(annot) -> str:
    parts = [str(annot.get("/T", ""))]
    parent = annot.get("/Parent")
    while parent is not None:
        p = parent.get_object()
        t = p.get("/T")
        if t:
            parts.append(str(t))
        parent = p.get("/Parent")
    return ".".join(reversed(parts))


def _apply(annot, value, checkbox_on: str) -> None:
    ft = annot.get("/FT")
    if ft == "/Btn":
        on = bool(value) and value not in ("Off", "/Off", 0, "0")
        state = NameObject(checkbox_on if on else "/Off")
        annot[NameObject("/V")] = state
        annot[NameObject("/AS")] = state
    else:
        annot[NameObject("/V")] = TextStringObject(str(value))
        if "/AP" in annot:
            del annot["/AP"]


# Re-export helpers so form-specific scripts can `from pdf_filler import money, ssn`
money = _money
ssn = _ssn
