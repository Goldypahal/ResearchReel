HEADERS = {"X-API-Key": "test-key"}


def _ingest(client, paper_id, data, **meta):
    return client.post(
        "/api/v1/papers",
        headers=HEADERS,
        files={"file": (f"{paper_id}.pdf", data, "application/pdf")},
        data={"paper_id": paper_id, **meta},
    )


def test_health_is_public(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["provider"] == "test"


def test_requires_api_key(client):
    assert client.get("/api/v1/papers").status_code == 401
    assert client.get("/api/v1/papers", headers={"X-API-Key": "wrong"}).status_code == 401


def test_rejects_bad_input(client, pdfs):
    assert _ingest(client, "../escape", pdfs[0]).status_code == 400
    assert _ingest(client, "not-a-pdf", b"hello world").status_code == 415
    r = client.post("/api/v1/query", headers=HEADERS, json={"query": "x", "paper_ids": []})
    assert r.status_code == 400


def test_ingest_query_and_delete(client, pdfs):
    r = _ingest(client, "gnn-paper", pdfs[0], title="Molecular GNNs", authors="Ada Lovelace, Alan Turing", year="2021")
    assert r.status_code == 200, r.text
    assert r.json()["paragraphs"] >= 1
    assert _ingest(client, "cafa-paper", pdfs[1], title="CAFA Evaluation", year="2019").status_code == 200

    # Re-ingesting is idempotent: the chunk count does not double.
    before = client.get("/api/v1/papers/gnn-paper", headers=HEADERS).json()["chunks"]
    assert _ingest(client, "gnn-paper", pdfs[0], title="Molecular GNNs").status_code == 200
    assert client.get("/api/v1/papers/gnn-paper", headers=HEADERS).json()["chunks"] == before

    r = client.post(
        "/api/v1/query",
        headers=HEADERS,
        json={"query": "Which dataset and learning rate were used for training?", "paper_ids": ["gnn-paper", "unknown-paper"]},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["missing_paper_ids"] == ["unknown-paper"]
    assert body["answer"]
    # Only the selected paper may be searched.
    assert {c["paper_id"] for c in body["chunks"]} == {"gnn-paper"}
    assert all(c["paper_id"] == "gnn-paper" for c in body["citations"])

    r = client.post("/api/v1/query", headers=HEADERS, json={"query": "anything", "paper_ids": ["unknown-paper"]})
    assert r.status_code == 409

    r = client.patch("/api/v1/papers/gnn-paper", headers=HEADERS, json={"title": "Renamed GNN Paper", "year": 2022})
    assert r.status_code == 200, r.text
    r = client.post("/api/v1/query", headers=HEADERS, json={"query": "learning rate", "paper_ids": ["gnn-paper"]})
    assert all(c["title"] == "Renamed GNN Paper" for c in r.json()["citations"])
    assert client.patch("/api/v1/papers/missing", headers=HEADERS, json={"title": "x"}).status_code == 404

    for tool in ("compare", "review", "gaps", "timeline", "contradictions"):
        r = client.post(f"/api/v1/intel/{tool}", headers=HEADERS, json={"paper_ids": ["gnn-paper", "cafa-paper"]})
        assert r.status_code == 200, (tool, r.text)
        assert r.json()["result"]

    r = client.post("/api/v1/intel/compare", headers=HEADERS, json={"paper_ids": ["gnn-paper"]})
    assert r.status_code == 400  # comparison needs two papers

    assert client.delete("/api/v1/papers/cafa-paper", headers=HEADERS).status_code == 200
    assert client.get("/api/v1/papers", headers=HEADERS).json() == ["gnn-paper"]
    assert client.get("/api/v1/papers/cafa-paper", headers=HEADERS).json()["indexed"] is False
