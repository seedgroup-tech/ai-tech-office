-- AI CONTROL (M-013) : schéma initial. Appliqué une fois sur la base D1 « ai-control ».
CREATE TABLE IF NOT EXISTS depenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  libelle TEXT NOT NULL,
  montant REAL NOT NULL CHECK (montant >= 0),
  source TEXT NOT NULL,
  cree_par TEXT NOT NULL,
  cree_le TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS depenses_date ON depenses (date);

CREATE TABLE IF NOT EXISTS usages (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  utilisateur TEXT NOT NULL,
  projet TEXT NOT NULL,
  nature TEXT NOT NULL,
  valeur REAL NOT NULL CHECK (valeur >= 0),
  cout REAL CHECK (cout IS NULL OR cout >= 0),
  source TEXT NOT NULL,
  cree_par TEXT NOT NULL,
  cree_le TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS usages_utilisateur ON usages (utilisateur, date);

CREATE TABLE IF NOT EXISTS config (
  cle TEXT PRIMARY KEY,
  valeur TEXT NOT NULL
);
