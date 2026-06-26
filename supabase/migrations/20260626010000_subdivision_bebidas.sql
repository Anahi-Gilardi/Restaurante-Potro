-- Migración para subdividir la categoría Bebidas en con y sin alcohol

UPDATE public.productos_menu
SET categoria = 'Bebidas con Alcohol'
WHERE categoria = 'Bebidas' AND (
    nombre ILIKE '%whisky%' OR
    nombre ILIKE '%gin%' OR
    nombre ILIKE '%fernet%' OR
    nombre ILIKE '%aperol%' OR
    nombre ILIKE '%cerveza%' OR
    nombre ILIKE '%campari%' OR
    nombre ILIKE '%trago%' OR
    nombre ILIKE '%coctel%' OR
    nombre ILIKE '%champagne%' OR
    nombre ILIKE '%sidra%' OR
    nombre ILIKE '%licor%'
);

UPDATE public.productos_menu
SET categoria = 'Bebidas sin Alcohol'
WHERE categoria = 'Bebidas';
