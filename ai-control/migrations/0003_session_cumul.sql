-- AI CONTROL (M-013) : suivi de la consommation par période.
-- session : identifiant de la session (conversation) à l'origine de la ligne.
-- cumul = 1 : total cumulé jusqu'à la date de la ligne, impossible à répartir sur des périodes.
-- cumul = 0 : consommation survenue depuis le relevé précédent (relevés réguliers).
ALTER TABLE usages ADD COLUMN session TEXT;
ALTER TABLE usages ADD COLUMN cumul INTEGER NOT NULL DEFAULT 0;
