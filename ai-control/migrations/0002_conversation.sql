-- AI CONTROL (M-013) : titre de la conversation (ou session) à l'origine d'une ligne d'usage. Optionnel.
ALTER TABLE usages ADD COLUMN conversation TEXT;
