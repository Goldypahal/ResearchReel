from __future__ import annotations
from .pymupdf_parser import PyMuPDFPaperParser
try:
    from .unstructured_parser import UnstructuredPaperParser
    HAS_UNSTRUCTURED = True
except ImportError:
    HAS_UNSTRUCTURED = False

def get_parser(parser_name: str = "pymupdf"):
    parser_name = parser_name.lower().strip()
    if parser_name == "unstructured":
        if not HAS_UNSTRUCTURED:
            print("Warning: Unstructured parser not available. Falling back to PyMuPDF.")
            return PyMuPDFPaperParser()
        return UnstructuredPaperParser()
    if parser_name == "pymupdf":
        return PyMuPDFPaperParser()
    raise ValueError(f"Unsupported parser: {parser_name}")
