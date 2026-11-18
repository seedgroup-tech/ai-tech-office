-- AI CONTROL (M-013) : relectures de cache, comptées à part.
-- valeur = tokens hors relectures de cache (entrée, sortie, écriture du cache) ;
-- cache  = tokens relus depuis le cache (très nombreux, très peu coûteux, non comparables aux autres).
ALTER TABLE usages ADD COLUMN cache INTEGER NOT NULL DEFAULT 0;
