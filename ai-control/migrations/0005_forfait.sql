-- AI CONTROL (M-013) : relevés de la page « Utilisation » du forfait (claude.ai, Paramètres).
-- Un relevé par jour. Les parts par produit sont les % de la semaine (Claude Code, Conversations, Cowork, Autre).
CREATE TABLE IF NOT EXISTS forfait (
  date TEXT PRIMARY KEY,
  session_pct REAL,
  semaine_pct REAL,
  claude_code REAL,
  conversations REAL,
  cowork REAL,
  autre REAL,
  depense REAL,
  plafond REAL,
  cree_par TEXT NOT NULL,
  cree_le TEXT NOT NULL
);
