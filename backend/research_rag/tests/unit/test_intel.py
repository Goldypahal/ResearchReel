import pytest
from unittest.mock import MagicMock, patch
from app.services.paper_comparator import PaperComparator
from app.services.literature_reviewer import LiteratureReviewer
from app.services.contradiction_detector import ContradictionDetector
from app.services.gap_finder import ResearchGapFinder
from app.services.timeline_generator import ResearchTimelineGenerator

@pytest.fixture
def mock_bm25():
    mock = MagicMock()
    # Mock some chunks
    chunk_mock = MagicMock()
    chunk_mock.paper_id = "paper1"
    chunk_mock.text = "This is chunk text of paper 1"
    mock.chunks = [chunk_mock]
    return mock

@patch("app.services.paper_comparator.PaperComparator._call_llm")
@patch("app.services.paper_comparator.sqlite3.connect")
def test_paper_comparator(mock_connect, mock_call, mock_bm25):
    # Mock SQLite rows return values
    mock_conn = MagicMock()
    mock_connect.return_value.__enter__.return_value = mock_conn
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    
    mock_cursor.fetchall.side_effect = [
        # Entities for paper1
        [{"name": "Method A", "type": "Method"}, {"name": "Dataset B", "type": "Dataset"}],
        # Relationships for paper1
        [{"src": "Method A", "src_type": "Method", "target": "Dataset B", "target_type": "Dataset", "relation_type": "evaluated_on", "description": "evaluated on dataset B"}]
    ]

    mock_call.return_value = "| Paper | Method/Model | Dataset |\n|---|---|---|\n| paper1 | Method A | Dataset B |"

    comparator = PaperComparator(bm25=mock_bm25)
    result = comparator.compare_papers(["paper1"])
    
    assert "Method A" in result
    assert "Dataset B" in result
    mock_call.assert_called_once()

@patch("app.services.literature_reviewer.LiteratureReviewer._call_llm")
@patch("app.services.paper_comparator.PaperComparator._get_paper_facts_from_db")
def test_literature_reviewer(mock_get_facts, mock_call, mock_bm25):
    mock_get_facts.return_value = "Facts of paper1"
    mock_call.return_value = "# Literature Review\n\n1. Introduction..."

    reviewer = LiteratureReviewer(bm25=mock_bm25)
    result = reviewer.generate_review(["paper1"])
    
    assert "Introduction" in result
    mock_call.assert_called_once()

@patch("app.services.contradiction_detector.ContradictionDetector._call_llm")
@patch("app.services.paper_comparator.PaperComparator._get_paper_facts_from_db")
def test_contradiction_detector(mock_get_facts, mock_call, mock_bm25):
    mock_get_facts.return_value = "Facts of paper1"
    mock_call.return_value = "# Contradictions Found\n\nNo discrepancies found."

    detector = ContradictionDetector(bm25=mock_bm25)
    result = detector.detect_contradictions(["paper1"])
    
    assert "Contradictions" in result
    mock_call.assert_called_once()

@patch("app.services.gap_finder.ResearchGapFinder._call_llm")
@patch("app.services.gap_finder.sqlite3.connect")
def test_gap_finder(mock_connect, mock_call):
    mock_conn = MagicMock()
    mock_connect.return_value.__enter__.return_value = mock_conn
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor

    mock_cursor.fetchall.side_effect = [
        # Methods
        [{"name": "Method A", "paper_id": "paper1"}],
        # Datasets
        [{"name": "Dataset B", "paper_id": "paper2"}],
        # Evals
        [{"method": "Method A", "dataset": "Dataset B"}]
    ]
    mock_call.return_value = "Gap: Method A not yet tested on Dataset C."

    finder = ResearchGapFinder()
    result = finder.find_gaps()

    assert "Gap" in result
    mock_call.assert_called_once()

@patch("app.services.timeline_generator.ResearchTimelineGenerator._call_llm")
def test_timeline_generator(mock_call, tmp_path):
    from app.indexing.graph_index import SQLiteGraphIndex

    db_path = str(tmp_path / "graph.db")
    graph = SQLiteGraphIndex(db_path=db_path)
    graph.upsert_paper("paper2", "Paper Two", 2023)
    graph.upsert_paper("paper1", "Paper One", 2021)
    graph.add_entity("Method A", "Method", "paper1")
    mock_call.side_effect = lambda chain, facts: facts

    result = ResearchTimelineGenerator(db_path=db_path).generate_timeline(["paper1", "paper2"])

    assert result.index("Paper One") < result.index("Paper Two")  # chronological
    assert "Method A" in result
    mock_call.assert_called_once()


def test_timeline_requires_selected_papers(tmp_path):
    generator = ResearchTimelineGenerator(db_path=str(tmp_path / "graph.db"))
    assert generator.generate_timeline([]).startswith("None of the selected papers")


def test_graph_context_is_limited_to_selected_papers(tmp_path):
    from app.indexing.graph_index import SQLiteGraphIndex

    graph = SQLiteGraphIndex(db_path=str(tmp_path / "graph.db"))
    a = graph.add_entity("Transformer", "Method", "mine")
    b = graph.add_entity("ImageNet", "Dataset", "mine")
    graph.add_relation(a, b, "evaluated_on")
    c = graph.add_entity("Transformer", "Method", "someone-else")
    d = graph.add_entity("SecretData", "Dataset", "someone-else")
    graph.add_relation(c, d, "evaluated_on")

    context = graph.get_graph_context_for_query("How was the Transformer evaluated?", paper_ids=["mine"])
    assert "ImageNet" in context
    assert "SecretData" not in context

    graph.delete_paper("someone-else")
    assert graph.search_entities("SecretData") == []
