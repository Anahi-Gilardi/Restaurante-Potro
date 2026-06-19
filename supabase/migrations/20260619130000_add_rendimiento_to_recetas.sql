-- Add rendimiento (yield percentage) to recetas_escandallo
ALTER TABLE recetas_escandallo 
ADD COLUMN IF NOT EXISTS rendimiento NUMERIC NOT NULL DEFAULT 100.0 CHECK (rendimiento > 0 AND rendimiento <= 100);
