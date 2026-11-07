from __future__ import annotations
import sqlite3
import os
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class SQLiteGraphIndex:
    def __init__(self, db_path: str = "data/knowledge_graph.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _init_db(self):
        """Initializes tables for entities and relations in SQLite."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Table for Entities
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS entities (
                    entity_id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    paper_id TEXT,
                    UNIQUE(name, type, paper_id)
                )
            """)
            # Table for Relations
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS relations (
                    relation_id TEXT PRIMARY KEY,
                    source_id TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    relation_type TEXT NOT NULL,
                    description TEXT,
                    FOREIGN KEY (source_id) REFERENCES entities(entity_id) ON DELETE CASCADE,
                    FOREIGN KEY (target_id) REFERENCES entities(entity_id) ON DELETE CASCADE,
                    UNIQUE(source_id, target_id, relation_type)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS papers (
                    paper_id TEXT PRIMARY KEY,
                    title TEXT,
                    year INTEGER,
                    authors TEXT
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_entities_paper ON entities(paper_id)")
            conn.commit()

    def upsert_paper(self, paper_id: str, title: Optional[str], year: Optional[int], authors: Optional[List[str]] = None) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """INSERT INTO papers (paper_id, title, year, authors) VALUES (?, ?, ?, ?)
                   ON CONFLICT(paper_id) DO UPDATE SET title = excluded.title, year = excluded.year, authors = excluded.authors""",
                (paper_id, title, year, ", ".join(authors or [])),
            )
            conn.commit()

    def get_papers(self, paper_ids: List[str]) -> List[Dict[str, Any]]:
        if not paper_ids:
            return []
        placeholders = ",".join("?" for _ in paper_ids)
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(f"SELECT * FROM papers WHERE paper_id IN ({placeholders})", paper_ids).fetchall()
            return [dict(r) for r in rows]

    def delete_paper(self, paper_id: str) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """DELETE FROM relations WHERE source_id IN (SELECT entity_id FROM entities WHERE paper_id = ?)
                       OR target_id IN (SELECT entity_id FROM entities WHERE paper_id = ?)""",
                (paper_id, paper_id),
            )
            conn.execute("DELETE FROM entities WHERE paper_id = ?", (paper_id,))
            conn.execute("DELETE FROM papers WHERE paper_id = ?", (paper_id,))
            conn.commit()

    def add_entity(self, name: str, type: str, paper_id: Optional[str] = None) -> str:
        """Adds a new entity or returns the ID of an existing identical one."""
        name_clean = name.strip()
        type_clean = type.strip().capitalize()
        paper_clean = paper_id.strip() if paper_id else None
        
        # Create a deterministic key to avoid duplicates
        entity_key = f"{name_clean.lower()}::{type_clean.lower()}::{paper_clean.lower() if paper_clean else 'none'}"
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(
                    "INSERT INTO entities (entity_id, name, type, paper_id) VALUES (?, ?, ?, ?)",
                    (entity_key, name_clean, type_clean, paper_clean)
                )
                conn.commit()
            except sqlite3.IntegrityError:
                # Entity already exists
                pass
        return entity_key

    def add_relation(self, source_id: str, target_id: str, relation_type: str, description: Optional[str] = None):
        """Creates a relationship between two entities."""
        rel_type_clean = relation_type.strip().lower()
        relation_key = f"{source_id}::{target_id}::{rel_type_clean}"
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(
                    "INSERT INTO relations (relation_id, source_id, target_id, relation_type, description) VALUES (?, ?, ?, ?, ?)",
                    (relation_key, source_id, target_id, rel_type_clean, description)
                )
                conn.commit()
            except sqlite3.IntegrityError:
                # Relation already exists
                pass

    def get_entity(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single entity by its ID."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM entities WHERE entity_id = ?", (entity_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def search_entities(self, query: str, paper_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Case-insensitive match on entity names, optionally limited to some papers."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            q = query.lower()
            sql = "SELECT * FROM entities WHERE (LOWER(name) LIKE ? OR ? LIKE '%' || LOWER(name) || '%')"
            params: List[Any] = [f"%{q}%", q]
            if paper_ids is not None:
                if not paper_ids:
                    return []
                sql += f" AND paper_id IN ({','.join('?' for _ in paper_ids)})"
                params.extend(paper_ids)
            cursor.execute(sql, params)
            return [dict(r) for r in cursor.fetchall()]

    def get_entity_neighbors(self, entity_id: str) -> List[Dict[str, Any]]:
        """Returns direct neighbors and relationship descriptions for an entity."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Query outgoing relationships
            cursor.execute("""
                SELECT r.relation_type, r.description, e.entity_id, e.name, e.type, e.paper_id, 'outgoing' as direction
                FROM relations r
                JOIN entities e ON r.target_id = e.entity_id
                WHERE r.source_id = ?
            """, (entity_id,))
            outgoing = [dict(r) for r in cursor.fetchall()]

            # Query incoming relationships
            cursor.execute("""
                SELECT r.relation_type, r.description, e.entity_id, e.name, e.type, e.paper_id, 'incoming' as direction
                FROM relations r
                JOIN entities e ON r.source_id = e.entity_id
                WHERE r.target_id = ?
            """, (entity_id,))
            incoming = [dict(r) for r in cursor.fetchall()]

            return outgoing + incoming

    def get_graph_context_for_query(self, query: str, paper_ids: Optional[List[str]] = None) -> str:
        """
        Searches the entity graph for terms matching keywords in the query,
        retrieves their neighbors, and formats a context block for the LLM.
        """
        words = [w.strip("?,.!") for w in query.split() if len(w) > 3]
        matched_entities = []
        for word in words:
            matched_entities.extend(self.search_entities(word, paper_ids=paper_ids))

        if not matched_entities:
            return ""

        # Deduplicate matched entities
        seen_ids = set()
        unique_matches = []
        for ent in matched_entities:
            if ent["entity_id"] not in seen_ids:
                seen_ids.add(ent["entity_id"])
                unique_matches.append(ent)

        context_lines = ["Knowledge Graph Facts:"]
        # Retrieve neighbors for top 5 matched entities to keep context clean
        for ent in unique_matches[:5]:
            neighbors = self.get_entity_neighbors(ent["entity_id"])
            if paper_ids is not None:
                neighbors = [n for n in neighbors if n.get("paper_id") in paper_ids]
            if not neighbors:
                continue
            context_lines.append(f"- Entity '{ent['name']}' ({ent['type']}):")
            for n in neighbors:
                desc = f" ({n['description']})" if n["description"] else ""
                if n["direction"] == "outgoing":
                    context_lines.append(f"  * links to '{n['name']}' ({n['type']}) via relation '{n['relation_type']}'{desc}")
                else:
                    context_lines.append(f"  * is linked from '{n['name']}' ({n['type']}) via relation '{n['relation_type']}'{desc}")

        return "\n".join(context_lines) if len(context_lines) > 1 else ""
