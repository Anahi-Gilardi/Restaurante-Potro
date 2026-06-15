import { Usuario, Mesa, Insumo, ProductoMenu, RecetaEscandallo, Pedido } from '../types';

export const INITIAL_USUARIOS: Usuario[] = [
  { id_usuario: 1, nombre: 'Enzo', apellido: 'Fernández', username: 'enzo', password: '1234', rol: 'mozo' },
  { id_usuario: 2, nombre: 'Micaela', apellido: 'Gómez', username: 'micaela', password: '1234', rol: 'mozo' },
  { id_usuario: 3, nombre: 'Damián', apellido: 'Martínez', username: 'damian', password: '1234', rol: 'cocina' },
  { id_usuario: 4, nombre: 'Sofía', apellido: 'Alegre', username: 'sofia', password: '1234', rol: 'administrador' },
  { id_usuario: 5, nombre: 'Nuevo', apellido: 'Usuario', username: 'nuevo', password: 'clave', rol: 'mozo' },
];

export const INITIAL_MESAS: Mesa[] = [
  { id_mesa: 1, numero_mesa: 'Mesa 1', estado: 'libre' },
  { id_mesa: 2, numero_mesa: 'Mesa 2', estado: 'ocupada', comensales: 2 },
  { id_mesa: 3, numero_mesa: 'Mesa 3', estado: 'libre' },
  { id_mesa: 4, numero_mesa: 'Mesa 4', estado: 'ocupada', comensales: 3 },
  { id_mesa: 5, numero_mesa: 'Mesa 5', estado: 'libre' },
  { id_mesa: 6, numero_mesa: 'Mesa 6', estado: 'libre' },
  { id_mesa: 8, numero_mesa: 'Mesa 8', estado: 'ocupada', comensales: 1 },
  { id_mesa: 12, numero_mesa: 'Mesa 12', estado: 'ocupada', comensales: 4 },
  { id_mesa: 101, numero_mesa: 'VIP-1', estado: 'libre' },
  { id_mesa: 102, numero_mesa: 'Terraza-3', estado: 'libre' },
];

export const INITIAL_INSUMOS: Insumo[] = [
  // 1. Materias primas de Cocina - Entradas
  { id_insumo: 'ins_lomo_carne', nombre: 'Lomo de Ternera Curado / Lomo fresco', stock_actual: 15000.0, stock_minimo: 3000.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Carnes', proveedor: 'Frigorífico El Triunfo', costo_unitario: 12.5, es_bebida_directa: false },
  { id_insumo: 'ins_alcaparras', nombre: 'Alcaparras en salmuera', stock_actual: 1200.0, stock_minimo: 300.0, unidad_medida: 'g', categoria: 'secos', subcategoria: 'Conservas', proveedor: 'Distribuidora Altiplano', costo_unitario: 8.2, es_bebida_directa: false },
  { id_insumo: 'ins_parmesano', nombre: 'Queso Parmesano Madurado', stock_actual: 4500.0, stock_minimo: 1000.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Lácteos', proveedor: 'Lácteos La Bocha', costo_unitario: 10.5, es_bebida_directa: false },
  { id_insumo: 'ins_aceite_trufa', nombre: 'Aceite de oliva trufado', stock_actual: 1000.0, stock_minimo: 200.0, unidad_medida: 'ml', categoria: 'secos', subcategoria: 'Aceites', proveedor: 'Gourmet Imports', costo_unitario: 45.0, es_bebida_directa: false },
  { id_insumo: 'ins_burrata_fresca', nombre: 'Burrata di Andria artesanal', stock_actual: 35.0, stock_minimo: 8.0, unidad_medida: 'unidades', categoria: 'frescos', subcategoria: 'Lácteos', proveedor: 'Lácteos La Bocha', costo_unitario: 850.0, es_bebida_directa: false },
  { id_insumo: 'ins_tomates_confit', nombre: 'Tomates confitados', stock_actual: 3000.0, stock_minimo: 800.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Vegetales', proveedor: 'Mercado de Abasto', costo_unitario: 3.5, es_bebida_directa: false },
  { id_insumo: 'ins_pesto_albahaca', nombre: 'Pesto de albahaca fresca', stock_actual: 2000.0, stock_minimo: 500.0, unidad_medida: 'ml', categoria: 'frescos', subcategoria: 'Salsas', proveedor: 'Producción Propia', costo_unitario: 4.0, es_bebida_directa: false },
  { id_insumo: 'ins_aceto', nombre: 'Reducción de aceto balsámico', stock_actual: 1500.0, stock_minimo: 300.0, unidad_medida: 'ml', categoria: 'secos', subcategoria: 'Condimentos', proveedor: 'Distribuidora Altiplano', costo_unitario: 12.0, es_bebida_directa: false },
  { id_insumo: 'ins_mollejas', nombre: 'Mollejas de Corazón tiernas', stock_actual: 10000.0, stock_minimo: 2500.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Achuras', proveedor: 'Frigorífico El Triunfo', costo_unitario: 15.0, es_bebida_directa: false },
  { id_insumo: 'ins_verdeo', nombre: 'Cebolla de verdeo fresco', stock_actual: 5000.0, stock_minimo: 1200.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Vegetales', proveedor: 'Mercado de Abasto', costo_unitario: 1.8, es_bebida_directa: false },
  { id_insumo: 'ins_vino_blanco', nombre: 'Vino Blanco Chardonnay cocina', stock_actual: 5000.0, stock_minimo: 1000.0, unidad_medida: 'ml', categoria: 'secos', subcategoria: 'Vinos', proveedor: 'Distribuidora Altiplano', costo_unitario: 2.2, es_bebida_directa: false },
  { id_insumo: 'ins_provolone', nombre: 'Queso Provolone Hilado de Campo', stock_actual: 12000.0, stock_minimo: 3000.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Lácteos', proveedor: 'Lácteos La Bocha', costo_unitario: 7.5, es_bebida_directa: false },
  { id_insumo: 'ins_empanada_relleno', nombre: 'Relleno El Patrón cortado a cuchillo', stock_actual: 15000.0, stock_minimo: 4000.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Rellenos', proveedor: 'Cocina Central', costo_unitario: 6.8, es_bebida_directa: false },

  // 2. Insumos - Pastas, salsas, rellenos
  { id_insumo: 'ins_cabrito', nombre: 'Cabrito desmechado tiernísimo', stock_actual: 8000.0, stock_minimo: 2000.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Carnes', proveedor: 'Granja Las Alturas', costo_unitario: 14.5, es_bebida_directa: false },
  { id_insumo: 'ins_tinta_sepia', nombre: 'Tinta de Sepia natural importada', stock_actual: 800.0, stock_minimo: 150.0, unidad_medida: 'g', categoria: 'secos', subcategoria: 'Especialidades', proveedor: 'Gourmet Imports', costo_unitario: 42.0, es_bebida_directa: false },
  { id_insumo: 'ins_mariscos_mix', nombre: 'Mix Mariscos del Atlántico', stock_actual: 18000.0, stock_minimo: 5000.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Pescadería', proveedor: 'Puerto Mar', costo_unitario: 18.0, es_bebida_directa: false },
  { id_insumo: 'ins_cordero_braseado', nombre: 'Cordero Patagónico braseado', stock_actual: 12000.0, stock_minimo: 3000.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Carnes', proveedor: 'Granja Las Alturas', costo_unitario: 16.5, es_bebida_directa: false },
  { id_insumo: 'ins_calabaza', nombre: 'Calabaza dulce andina', stock_actual: 30000.0, stock_minimo: 6000.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Vegetales', proveedor: 'Mercado de Abasto', costo_unitario: 1.2, es_bebida_directa: false },
  { id_insumo: 'ins_queso_azul', nombre: 'Queso Azul Premium', stock_actual: 5000.0, stock_minimo: 1000.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Lácteos', proveedor: 'Lácteos La Bocha', costo_unitario: 9.8, es_bebida_directa: false },
  { id_insumo: 'ins_almendras_to', nombre: 'Almendras fileteadas', stock_actual: 2500.0, stock_minimo: 500.0, unidad_medida: 'g', categoria: 'secos', subcategoria: 'Frutos Secos', proveedor: 'Distribuidora Altiplano', costo_unitario: 22.0, es_bebida_directa: false },
  { id_insumo: 'ins_harina_trigo', nombre: 'Harina de Trigo sémola', stock_actual: 40000.0, stock_minimo: 10000.0, unidad_medida: 'g', categoria: 'secos', subcategoria: 'Harinas', proveedor: 'Molino Cañuelas', costo_unitario: 0.8, es_bebida_directa: false },

  // 3. Insumos - Carnes, guarnición aligot
  { id_insumo: 'ins_aligot_queso', nombre: 'Mezcla Queso Fontina y Mozzarella', stock_actual: 6000.0, stock_minimo: 1500.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Lácteos', proveedor: 'Lácteos La Bocha', costo_unitario: 8.5, es_bebida_directa: false },
  { id_insumo: 'ins_bife_madurado', nombre: 'Bife de Chorizo Madurado 45 días', stock_actual: 22000.0, stock_minimo: 5000.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Carnes', proveedor: 'Frigorífico El Triunfo', costo_unitario: 24.0, es_bebida_directa: false },
  { id_insumo: 'ins_costillar', nombre: 'Costillar de Ternera seleccionado', stock_actual: 28000.0, stock_minimo: 6000.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Carnes', proveedor: 'Frigorífico El Triunfo', costo_unitario: 18.0, es_bebida_directa: false },
  { id_insumo: 'ins_entrana', nombre: 'Entraña Fina de Exportación', stock_actual: 20000.0, stock_minimo: 4000.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Carnes', proveedor: 'Frigorífico El Triunfo', costo_unitario: 25.0, es_bebida_directa: false },
  { id_insumo: 'ins_matambrito_cerdo', nombre: 'Matambrito de Cerdo fresco', stock_actual: 15000.0, stock_minimo: 3500.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Carnes', proveedor: 'Granja Las Alturas', costo_unitario: 14.0, es_bebida_directa: false },

  // 4. Insumos - Pescadería
  { id_insumo: 'ins_salmon_rosado', nombre: 'Filet de Salmón Rosado del Pacífico', stock_actual: 12000.0, stock_minimo: 3000.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Pescadería', proveedor: 'Puerto Mar', costo_unitario: 32.0, es_bebida_directa: false },
  { id_insumo: 'ins_abadejo_filet', nombre: 'Filet de Abadejo premium', stock_actual: 11000.0, stock_minimo: 2500.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Pescadería', proveedor: 'Puerto Mar', costo_unitario: 18.5, es_bebida_directa: false },
  { id_insumo: 'ins_trucha_fresca', nombre: 'Trucha Patagónica deshuesada', stock_actual: 10000.0, stock_minimo: 2500.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Pescadería', proveedor: 'Puerto Mar', costo_unitario: 21.0, es_bebida_directa: false },
  { id_insumo: 'ins_merluza_filet', nombre: 'Filet de Merluza premium', stock_actual: 18000.0, stock_minimo: 4000.0, unidad_medida: 'g', categoria: 'frescos', subcategoria: 'Pescadería', proveedor: 'Puerto Mar', costo_unitario: 11.0, es_bebida_directa: false },

  // 5. Insumos - Postres, panadería, masas
  { id_insumo: 'ins_dulce_leche', nombre: 'Dulce de Leche repostero', stock_actual: 16000.0, stock_minimo: 4000.0, unidad_medida: 'g', categoria: 'secos', subcategoria: 'Dulces', proveedor: 'Lácteos La Bocha', costo_unitario: 3.5, es_bebida_directa: false },
  { id_insumo: 'ins_chocolate_belga', nombre: 'Chocolate amargo belga 70%', stock_actual: 5000.0, stock_minimo: 1500.0, unidad_medida: 'g', categoria: 'secos', subcategoria: 'Especialidades', proveedor: 'Gourmet Imports', costo_unitario: 16.0, es_bebida_directa: false },
  { id_insumo: 'ins_helado_crema', nombre: 'Helado Crema Americana', stock_actual: 30.0, stock_minimo: 5.0, unidad_medida: 'unidades', categoria: 'frescos', subcategoria: 'Postres', proveedor: 'Gourmet Imports', costo_unitario: 350.0, es_bebida_directa: false },
  { id_insumo: 'ins_peras_und', nombre: 'Peras frescas premium', stock_actual: 80.0, stock_minimo: 15.0, unidad_medida: 'unidades', categoria: 'frescos', subcategoria: 'Vegetales', proveedor: 'Mercado de Abasto', costo_unitario: 90.0, es_bebida_directa: false },

  // 6. Insumos de Bodega (Vinos de Excel / Directos)
  // La Rural
  { id_insumo: 'ins_vin_trumpeter', nombre: 'Trumpeter Malbec Botella', stock_actual: 24.0, stock_minimo: 6.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'La Rural Winery', costo_unitario: 3200.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_encuentro', nombre: 'Encuentro CS Botella', stock_actual: 15.0, stock_minimo: 4.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'La Rural Winery', costo_unitario: 4800.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_rutini', nombre: 'Rutini Cabernet Malbec Botella', stock_actual: 18.0, stock_minimo: 5.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'La Rural Winery', costo_unitario: 6500.0, es_bebida_directa: true },
  
  // Escorihuela Gascón
  { id_insumo: 'ins_vin_escorihuela', nombre: 'Escorihuela Gascón Malbec Botella', stock_actual: 20.0, stock_minimo: 5.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Escorihuela S.A.', costo_unitario: 4200.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_eg_gran_reserva', nombre: 'E.G Gran Reserva Red Blend', stock_actual: 12.0, stock_minimo: 3.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Escorihuela S.A.', costo_unitario: 6800.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_pequenas_prod', nombre: 'Pequeñas Producciones CF', stock_actual: 10.0, stock_minimo: 2.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Escorihuela S.A.', costo_unitario: 9500.0, es_bebida_directa: true },

  // Ruca Malén
  { id_insumo: 'ins_vin_ruca_cap2', nombre: 'Ruca Malén Capítulo 2 Malbec', stock_actual: 15.0, stock_minimo: 4.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Ruca Malén', costo_unitario: 3800.0, es_bebida_directa: true },

  // Catena Zapata
  { id_insumo: 'ins_vin_alamos', nombre: 'Álamos Red Blend Botella', stock_actual: 30.0, stock_minimo: 8.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Catena S.A.', costo_unitario: 2400.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_st_felicien', nombre: 'Saint Felicien SB Botella', stock_actual: 16.0, stock_minimo: 4.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos blancos', proveedor: 'Catena S.A.', costo_unitario: 5200.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_nicasia', nombre: 'Nicasia Malbec Botella', stock_actual: 18.0, stock_minimo: 5.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Catena S.A.', costo_unitario: 4500.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_padrillo', nombre: 'Padrillo CS Botella', stock_actual: 15.0, stock_minimo: 4.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Catena S.A.', costo_unitario: 3100.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_dv_catena', nombre: 'D.V. Catena Malbec-Malbec Botella', stock_actual: 12.0, stock_minimo: 4.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Catena S.A.', costo_unitario: 8900.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_enemigo', nombre: 'El Enemigo Malbec Botella', stock_actual: 10.0, stock_minimo: 3.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Catena S.A.', costo_unitario: 9800.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_tikal', nombre: 'Tikal Natural Organic Blend', stock_actual: 12.0, stock_minimo: 3.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Catena S.A.', costo_unitario: 7500.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_angelica', nombre: 'Angélica Zapata Malbec Alta Botella', stock_actual: 8.0, stock_minimo: 2.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Catena S.A.', costo_unitario: 14500.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_argentino', nombre: 'Catena Zapata Argentino Botella', stock_actual: 6.0, stock_minimo: 1.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Catena S.A.', costo_unitario: 28000.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_luca', nombre: 'Luca Pinot Noir Botella', stock_actual: 14.0, stock_minimo: 3.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Luca Wines', costo_unitario: 8200.0, es_bebida_directa: true },

  // Las Perdices
  { id_insumo: 'ins_vin_perdices', nombre: 'Las Perdices Malbec Botella', stock_actual: 22.0, stock_minimo: 5.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Las Perdices S.A.', costo_unitario: 3400.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_perdices_reserva', nombre: 'Las Perdices Reserva Malbec Botella', stock_actual: 18.0, stock_minimo: 5.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Las Perdices S.A.', costo_unitario: 4800.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_don_juan', nombre: 'Don Juan Blend Botella', stock_actual: 8.0, stock_minimo: 2.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Las Perdices S.A.', costo_unitario: 16000.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_exploracion', nombre: 'Exploración Pinot Noir Botella', stock_actual: 10.0, stock_minimo: 3.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Las Perdices S.A.', costo_unitario: 6500.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_ala_colorada', nombre: 'Ala Colorada Cabernet Franc Botella', stock_actual: 12.0, stock_minimo: 3.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'Las Perdices S.A.', costo_unitario: 7200.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_ala_viognier', nombre: 'Ala Viognier Blanco Botella', stock_actual: 15.0, stock_minimo: 4.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos blancos', proveedor: 'Las Perdices S.A.', costo_unitario: 4100.0, es_bebida_directa: true },

  // Salentein
  { id_insumo: 'ins_vin_portillo', nombre: 'Portillo Malbec Botella', stock_actual: 25.0, stock_minimo: 6.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'B. Salentein S.A.', costo_unitario: 2100.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_salentein_reserva', nombre: 'Salentein Reserva Chardonnay', stock_actual: 14.0, stock_minimo: 4.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos blancos', proveedor: 'B. Salentein S.A.', costo_unitario: 4400.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_pyros', nombre: 'Pyros Single Vineyard Syrah', stock_actual: 10.0, stock_minimo: 3.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'B. Salentein S.A.', costo_unitario: 6900.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_numina', nombre: 'Numina Cabernet Franc Botella', stock_actual: 12.0, stock_minimo: 3.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'B. Salentein S.A.', costo_unitario: 8100.0, es_bebida_directa: true },
  { id_insumo: 'ins_vin_primus', nombre: 'Primus Malbec Botella de Culto', stock_actual: 6.0, stock_minimo: 1.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Vinos tintos', proveedor: 'B. Salentein S.A.', costo_unitario: 22000.0, es_bebida_directa: true },

  // Champagne / Espumantes
  { id_insumo: 'ins_champ_baron_b', nombre: 'Baron B Extra Brut Champagne Botella', stock_actual: 12.0, stock_minimo: 3.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Espumantes / Champagne', proveedor: 'Moët Hennessy', costo_unitario: 12000.0, es_bebida_directa: true },
  { id_insumo: 'ins_champ_aluda', nombre: 'Áluda Brut Nature Botella', stock_actual: 8.0, stock_minimo: 2.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Espumantes / Champagne', proveedor: 'Distribuidora Altiplano', costo_unitario: 8500.0, es_bebida_directa: true },
  { id_insumo: 'ins_champ_encuentro_ros', nombre: 'Encuentro Rosé La Rural Botella', stock_actual: 14.0, stock_minimo: 3.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Espumantes / Champagne', proveedor: 'La Rural Winery', costo_unitario: 5800.0, es_bebida_directa: true },
  { id_insumo: 'ins_champ_salentein', nombre: 'Salentein Extra Brut Champagne', stock_actual: 16.0, stock_minimo: 4.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Espumantes / Champagne', proveedor: 'B. Salentein S.A.', costo_unitario: 4600.0, es_bebida_directa: true },
  { id_insumo: 'ins_champ_chandon', nombre: 'Chandon Extra Brut Champagne Botella', stock_actual: 20.0, stock_minimo: 5.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Espumantes / Champagne', proveedor: 'Moët Hennessy', costo_unitario: 5400.0, es_bebida_directa: true },

  // Spirits & Direct drinks
  { id_insumo: 'ins_whisky_maca', nombre: 'Whisky Macallan 12 Años Botella', stock_actual: 5.0, stock_minimo: 1.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Whisky', proveedor: 'Spirits Global', costo_unitario: 45000.0, es_bebida_directa: true },
  { id_insumo: 'ins_gin_heraclito', nombre: 'Gin Heráclito Botella 750ml', stock_actual: 8.0, stock_minimo: 2.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Gin', proveedor: 'Spirits Global', costo_unitario: 3500.0, es_bebida_directa: true },
  { id_insumo: 'ins_fernet_branca', nombre: 'Fernet Branca Botella 750ml', stock_actual: 24.0, stock_minimo: 6.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Fernet', proveedor: 'Distribuidora Altiplano', costo_unitario: 3800.0, es_bebida_directa: true },
  { id_insumo: 'ins_aperitivo_aperol', nombre: 'Aperol Botella 750ml', stock_actual: 12.0, stock_minimo: 3.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Aperitivos', proveedor: 'Distribuidora Altiplano', costo_unitario: 2900.0, es_bebida_directa: true },
  { id_insumo: 'ins_beb_gaseosa', nombre: 'Lata Gaseosa Cola 354ml', stock_actual: 120.0, stock_minimo: 30.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Gaseosas', proveedor: 'Coca-Cola Andina', costo_unitario: 650.0, es_bebida_directa: true },
  { id_insumo: 'ins_beb_agua', nombre: 'Botella Agua de Manantial 500ml', stock_actual: 150.0, stock_minimo: 40.0, unidad_medida: 'unidades', categoria: 'bodega', subcategoria: 'Agua', proveedor: 'Cervecería Quilmes', costo_unitario: 450.0, es_bebida_directa: true },
  { id_insumo: 'ins_cafe_grano', nombre: 'Café de especialidad grano tostado', stock_actual: 10000.0, stock_minimo: 2000.0, unidad_medida: 'g', categoria: 'secos', subcategoria: 'Cafetería', proveedor: 'Caffé Zatti', costo_unitario: 15.0, es_bebida_directa: false },
];

export const INITIAL_PRODUCTOS_MENU: ProductoMenu[] = [
  // ================= 1. ENTRADAS =================
  {
    id_producto: 'prod_ent_carpaccio',
    nombre: 'Carpaccio de lomo curado',
    descripcion: 'Finas láminas de lomo, alcaparras, lascas de parmesano y aceite de oliva trufado.',
    precio_venta: 7600.00,
    categoria: 'Entradas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1511181642675-9312b3e201c5?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 8,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_ent_burrata',
    nombre: 'Burrata di Andria',
    descripcion: 'Con tomates confitados, pesto de albahaca fresca y reducción de aceto balsámico.',
    precio_venta: 8200.00,
    categoria: 'Entradas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 6,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_ent_mollejas',
    nombre: 'Mollejas al verdeo con chardonnay',
    descripcion: 'Crocantes mollejas salteadas con crema de verdeo y vino blanco selecto.',
    precio_venta: 9550.00,
    categoria: 'Entradas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 15,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_ent_provoleta',
    nombre: 'Provoleta de campo crocante',
    descripcion: 'Queso provolone fundido con costra de hierbas, orégano fresco y tomates secos.',
    precio_venta: 6900.00,
    categoria: 'Entradas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1582231317502-d45089c25373?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 12,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_ent_empanadas',
    nombre: 'Empanadas cortadas a cuchillo "El Patrón"',
    descripcion: 'Tradicionales de carne suave, horneadas a la leña (porción de 2 unidades).',
    precio_venta: 4300.00,
    categoria: 'Entradas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 10,
    requiere_cocina: true
  },

  // ================= 2. PASTAS =================
  {
    id_producto: 'prod_pas_rotolo',
    nombre: 'Rotolo di tata',
    descripcion: 'Pasta rellena de cabrito desmechado y verduras asadas en su propio jugo.',
    precio_venta: 11200.00,
    categoria: 'Pastas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 18,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_pas_cintas_sepia',
    nombre: 'Cintas anchas en tinta de sepia',
    descripcion: 'Pasta negra salteada con mariscos seleccionados y tomates cherry.',
    precio_venta: 13800.00,
    categoria: 'Pastas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 14,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_pas_sorrentinos_cordero',
    nombre: 'Sorrentinos de cordero patagónico',
    descripcion: 'Rellenos de cordero braseado, servidos con salsa suave de hongos de pino.',
    precio_venta: 14500.00,
    categoria: 'Pastas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 15,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_pas_ravioles_calabaza',
    nombre: 'Ravioles de calabaza y almendras',
    descripcion: 'Con una suave crema de queso azul y nueces tostadas.',
    precio_venta: 11900.00,
    categoria: 'Pastas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 12,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_pas_gnocchis',
    nombre: 'Gnocchis de papa andina al fierrito',
    descripcion: 'Con salsa pomodoro de la casa y stracciatella fresca.',
    precio_venta: 10500.00,
    categoria: 'Pastas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1551183053-f57a3e72c842?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 12,
    requiere_cocina: true
  },

  // ================= 3. CARNES =================
  {
    id_producto: 'prod_car_ojo_bife',
    nombre: 'Ojo de bife con aligot de papa',
    descripcion: 'Corte de exportación a las brasas, servido con puré elástico de papas y queso fontina (Salsa Patrón).',
    precio_venta: 22500.00,
    categoria: 'Carnes',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 22,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_car_bife_madurado',
    nombre: 'Bife de chorizo madurado (45 días)',
    descripcion: '400 gramos de carne con maduración en seco, acompañado de vegetales asados.',
    precio_venta: 24800.00,
    categoria: 'Carnes',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 25,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_car_costillar',
    nombre: 'Costillar braseado texturado',
    descripcion: 'Costillar de ternera cocido a baja temperatura por 12 horas, se desarma al tacto.',
    precio_venta: 26500.00,
    categoria: 'Carnes',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 10,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_car_entrana',
    nombre: 'Entraña fina grillada',
    descripcion: 'Servida con chimichurri de la casa y papas rústicas al romero.',
    precio_venta: 19800.00,
    categoria: 'Carnes',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 18,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_car_matambrito',
    nombre: 'Matambrito de cerdo al verdeo',
    descripcion: 'Tiernizado a la parrilla, cubierto con salsa de crema y cebolla de verdeo.',
    precio_venta: 15800.00,
    categoria: 'Carnes',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1602489114881-2244463dfde3?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 16,
    requiere_cocina: true
  },

  // ================= 4. PESCADOS =================
  {
    id_producto: 'prod_pes_salmon',
    nombre: 'Salmón rosado en costra de sésamo',
    descripcion: 'Sellado al hierro, servido sobre colchón de espárragos y emulsión de limón.',
    precio_venta: 23500.00,
    categoria: 'Pescados',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 16,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_pes_abadejo',
    nombre: 'Abadejo al ajillo norteño',
    descripcion: 'Filet grueso de abadejo con láminas de ajo crocantes, ají panca y papas al vapor.',
    precio_venta: 18900.00,
    categoria: 'Pescados',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 15,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_pes_trucha',
    nombre: 'Trucha patagónica a la manteca de almendras',
    descripcion: 'Cocida a la plancha, terminada con almendras fileteadas tostadas.',
    precio_venta: 19500.00,
    categoria: 'Pescados',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 14,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_pes_cazuela',
    nombre: 'Cazuela de mariscos del Atlántico',
    descripcion: 'Combinación premium de pulpo, calamar, langostinos y mejillones en salsa de tomate rústica.',
    precio_venta: 24900.00,
    categoria: 'Pescados',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1534080391025-44799e9d6ea7?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 18,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_pes_merluza',
    nombre: 'Filet de merluza premium a la romana',
    descripcion: 'Clásico rebozado dorado, súper liviano, servido con puré de calabaza.',
    precio_venta: 12500.00,
    categoria: 'Pescados',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1560684352-8497838a2229?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 12,
    requiere_cocina: true
  },

  // ================= 5. COMIDAS CRIOLLAS =================
  {
    id_producto: 'prod_cri_milanesa',
    nombre: 'Milanesa con guarnición (Estilo Patrón)',
    descripcion: 'Milanesa gigante de bola de lomo o bife de chorizo, rebozado crocante con papas fritas.',
    precio_venta: 14200.00,
    categoria: 'Comidas Criollas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1594212699903-ec8a3cee50f6?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 15,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_cri_hamburguesa',
    nombre: 'Hamburguesa Clásica Gourmet',
    descripcion: 'Medallón de carne seleccionado (200g), queso cheddar, lechuga, tomate y aderezo especial de la casa.',
    precio_venta: 10500.00,
    categoria: 'Comidas Criollas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 10,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_cri_pastel_papa',
    nombre: 'Pastel de papa de lomo cortado a cuchillo',
    descripcion: 'Capas de carne sazonada y puré de papa gratinado al horno de barro con queso reggianito.',
    precio_venta: 12800.00,
    categoria: 'Comidas Criollas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 14,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_cri_locro',
    nombre: 'Locro pulsudo tradicional',
    descripcion: 'Maíz blanco, porotos, patitas de cerdo, chorizo colorado y falda, servido con su salsa picante de verdeo.',
    precio_venta: 11500.00,
    categoria: 'Comidas Criollas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 8,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_cri_humita',
    nombre: 'Humita en cazuela de barro',
    descripcion: 'Choclo rallado fresco, zapallo, queso cuartirolo fundido y albahaca.',
    precio_venta: 8900.00,
    categoria: 'Comidas Criollas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=500&q=80&auto=format&fit=crop',
    tipo: 'plato',
    tiempo_preparacion_estimado: 8,
    requiere_cocina: true
  },

  // ================= 6. POSTRES =================
  {
    id_producto: 'prod_pos_flan',
    nombre: 'Flan casero con dulce de leche y crema',
    descripcion: 'El clásico infaltable, textura sedosa con dulce de leche familiar.',
    precio_venta: 4300.00,
    categoria: 'Postres',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?w=500&q=80&auto=format&fit=crop',
    tipo: 'postre',
    tiempo_preparacion_estimado: 5,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_pos_volcan',
    nombre: 'Volcán de chocolate amargo',
    descripcion: 'Con centro líquido caliente, acompañado de una bocha de helado de crema americana.',
    precio_venta: 5500.00,
    categoria: 'Postres',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&q=80&auto=format&fit=crop',
    tipo: 'postre',
    tiempo_preparacion_estimado: 12,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_pos_peras',
    nombre: 'Peras al Malbec Reserva',
    descripcion: 'Cocidas lentamente en vino tinto aromático, especiadas con canela y clavo de olor.',
    precio_venta: 4800.00,
    categoria: 'Postres',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=500&q=80&auto=format&fit=crop',
    tipo: 'postre',
    tiempo_preparacion_estimado: 5,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_pos_tiramisu',
    nombre: 'Tiramisú de la casa',
    descripcion: 'Mascarpone premium, vainillas humedecidas en café expreso y licor de café, espolvoreado con cacao amargo.',
    precio_venta: 5200.00,
    categoria: 'Postres',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&q=80&auto=format&fit=crop',
    tipo: 'postre',
    tiempo_preparacion_estimado: 4,
    requiere_cocina: true
  },
  {
    id_producto: 'prod_pos_panqueque',
    nombre: 'Panqueque de dulce de leche quemado',
    descripcion: 'Dorado a la plancha con azúcar impalpable caramelizada.',
    precio_venta: 4500.00,
    categoria: 'Postres',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1504113888839-1c8003672044?w=500&q=80&auto=format&fit=crop',
    tipo: 'postre',
    tiempo_preparacion_estimado: 8,
    requiere_cocina: true
  },

  // ================= 7. BODEGA & BEBIDAS GENERALES =================
  // La Rural
  {
    id_producto: 'prod_vin_trumpeter_botella',
    nombre: 'Trumpeter Malbec (Botella)',
    descripcion: 'Bodega La Rural. Robusto con aromas a frutos silvestres y madurado en roble.',
    precio_venta: 12500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_rutini_botella',
    nombre: 'Rutini Cab-Malbec 750ml',
    descripcion: 'Bodega La Rural. Un clásico de gran cuerpo y complejidad.',
    precio_venta: 21500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_encuentro_botella',
    nombre: 'Encuentro CS Botella La Rural',
    descripcion: 'Bodega La Rural. Exquisito Cabernet Sauvignon especiado.',
    precio_venta: 15500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },

  // Escorihuela Gascón
  {
    id_producto: 'prod_vin_escorihuela_gascon',
    nombre: 'Escorihuela Gascón Malbec 750ml',
    descripcion: 'Bodega Escorihuela. Notas florales y frutales muy equilibradas.',
    precio_venta: 14500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_eg_gran_reserva',
    nombre: 'E.G Gran Reserva Red Blend',
    descripcion: 'Bodega Escorihuela Gascón. Ensamble tinto premium madurado en barricas.',
    precio_venta: 24000.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_pequenas_prod_cf',
    nombre: 'Pequeñas Producciones Cabernet Franc',
    descripcion: 'Bodega Escorihuela Gascón. Edición ultra-limitada muy elegante.',
    precio_venta: 32000.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },

  // Ruca Malén
  {
    id_producto: 'prod_vin_ruca_cap2',
    nombre: 'Ruca Malén Capítulo 2 Malbec',
    descripcion: 'Espíritu joven y frutado, taninos redondos excelentes para carnes.',
    precio_venta: 11500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },

  // Catena Zapata
  {
    id_producto: 'prod_vin_alamos_botella',
    nombre: 'Alamos Red Blend 750ml',
    descripcion: 'Bodega Catena Zapata. Blend equilibrado y complejo.',
    precio_venta: 8500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_st_felicien_botella',
    nombre: 'Saint Felicien Sauvignon Blanc',
    descripcion: 'Bodega Catena Zapata. Fresco, cítrico y mineral.',
    precio_venta: 16500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_nicasia_malbec',
    nombre: 'Nicasia Malbec 750ml',
    descripcion: 'Bodega Catena Zapata. Notas de frutos negros maduros y chocolate.',
    precio_venta: 13900.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_padrillo_cs',
    nombre: 'Padrillo Cabernet Sauvignon',
    descripcion: 'Bodega Catena Zapata. Excelente balance y notas ahumadas.',
    precio_venta: 10500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_dv_catena_botella',
    nombre: 'D.V. Catena Malbec-Malbec 750ml',
    descripcion: 'Bodega Catena Zapata. Blend de altura, untuoso, persistente e impecable.',
    precio_venta: 21800.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_el_enemigo_botella',
    nombre: 'El Enemigo Malbec 750ml',
    descripcion: 'Bodega Catena Zapata. De Alejandro Vigil. Elegancia extrema.',
    precio_venta: 24500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_tikal_natural',
    nombre: 'Tikal Natural Organic Blend',
    descripcion: 'Bodega Catena Zapata. Orgánico certificado con excelente tipicidad.',
    precio_venta: 21900.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_angelica_zapata',
    nombre: 'Angélica Zapata Malbec Alta',
    descripcion: 'Bodega Catena Zapata. El estandarte del vino argentino fino.',
    precio_venta: 38500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_catena_argentino',
    nombre: 'Catena Zapata Argentino Malbec',
    descripcion: 'Bodega Catena Zapata. Obra de arte, complejo, frutos negros concentrados y persistencia.',
    precio_venta: 75000.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_luca_pinot',
    nombre: 'Luca Pinot Noir',
    descripcion: 'De Laura Catena. Aromas a frambuesas silvestres con sotobosque elegante.',
    precio_venta: 22800.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },

  // Las Perdices
  {
    id_producto: 'prod_vin_perdices_malbec',
    nombre: 'Las Perdices Malbec 750ml',
    descripcion: 'Notas suaves de ciruelas rojas y chocolate de roble.',
    precio_venta: 9500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_perdices_reserva',
    nombre: 'Las Perdices Reserva Malbec 750ml',
    descripcion: 'Envejecido 12 meses en roble francés y americano.',
    precio_venta: 11950.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_don_juan_blend',
    nombre: 'Don Juan Blend Las Perdices',
    descripcion: 'Vino ícono de la bodega. Concentrado, complejo y súper elegante.',
    precio_venta: 36000.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_perdices_exploracion',
    nombre: 'Exploración Pinot Noir Gualtallary',
    descripcion: 'Estilo fresco y mineral de los microclimas de Valle de Uco.',
    precio_venta: 15800.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_ala_colorada_cf',
    nombre: 'Ala Colorada Cabernet Franc',
    descripcion: 'De viñedos seleccionados en Agrelo. Mineralidad y de taninos sedosos.',
    precio_venta: 16800.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_ala_viognier',
    nombre: 'Las Perdices Ala Viognier',
    descripcion: 'Elegancia aromática con notas de damascos frescos.',
    precio_venta: 11200.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },

  // Salentein
  {
    id_producto: 'prod_vin_portillo_sb_botella',
    nombre: 'Portillo Sauvignon Blanc 750ml',
    descripcion: 'Fresco, herbáceo con acidez crujiente súper refrescante.',
    precio_venta: 7200.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_portillo_malbec',
    nombre: 'Portillo Malbec 750ml',
    descripcion: 'Rojo violáceo con ricos aromas a ciruelas rojas frescas.',
    precio_venta: 7500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_salentein_res_ch',
    nombre: 'Salentein Reserva Chardonnay',
    descripcion: 'Intenso, con notas a piña y sutil vainilla aportada por la madera.',
    precio_venta: 12500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos blancos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_salentein_pyros',
    nombre: 'Pyros Single Vineyard Syrah',
    descripcion: 'De Valle de Pedernal. Aromas ahumados y de pimienta negra.',
    precio_venta: 19500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_salentein_numina',
    nombre: 'Salentein Numina Cabernet Franc',
    descripcion: 'Gran estructura con taninos dulces y persistentes.',
    precio_venta: 21500.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_salentein_primus',
    nombre: 'Salentein Primus Malbec',
    descripcion: 'Ícono del Valle de Uco, elaborado en barricas especiales foudres.',
    precio_venta: 48000.00,
    categoria: 'Bodega',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },

  // Champagne
  {
    id_producto: 'prod_vin_baron_b_extra_brut',
    nombre: 'Baron B Extra Brut Champagne',
    descripcion: 'El gran espumante clásico nacional, elegante y burbujeante.',
    precio_venta: 28500.00,
    categoria: 'Bodega',
    subcategoria: 'Espumantes / Champagne',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_aluda_brut',
    nombre: 'Áluda Brut Nature Champagne',
    descripcion: 'Espumante de especialidad con excelente frescura mineral.',
    precio_venta: 22000.00,
    categoria: 'Bodega',
    subcategoria: 'Espumantes / Champagne',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_encuentro_rose',
    nombre: 'Encuentro Rosé Pinot Noir',
    descripcion: 'De La Rural. Finas burbujas, frutos rojos marcados.',
    precio_venta: 16500.00,
    categoria: 'Bodega',
    subcategoria: 'Espumantes / Champagne',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_salentein_champagne',
    nombre: 'Salentein Extra Brut Champagne',
    descripcion: 'Espumante elaborado con uvas costeras de gran acidez.',
    precio_venta: 14200.00,
    categoria: 'Bodega',
    subcategoria: 'Espumantes / Champagne',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_vin_chandon_extra_brut',
    nombre: 'Chandon Extra Brut Champagne',
    descripcion: 'El favorito indiscutible de las celebraciones argentinas.',
    precio_venta: 17500.00,
    categoria: 'Bodega',
    subcategoria: 'Espumantes / Champagne',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },

  // Copa para Trumpeter (Copa de vino)
  {
    id_producto: 'prod_vin_trumpeter_copa',
    nombre: 'Trumpeter Malbec (Copa)',
    descripcion: 'Porción individual para acompañar carnes o pastas.',
    precio_venta: 3200.00,
    categoria: 'Bebidas',
    subcategoria: 'Vinos tintos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400&q=80&auto=format&fit=crop',
    tipo: 'vino',
    requiere_cocina: false
  },

  // Spirits & Non-alcohol drinks
  {
    id_producto: 'prod_beb_whisky',
    nombre: 'Whisky Macallan 12 Años (Medida)',
    descripcion: 'Single malt Scotch whisky escocés servido con hielo premium.',
    precio_venta: 9500.00,
    categoria: 'Bebidas',
    subcategoria: 'Whisky',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=400&q=80',
    tipo: 'bebida',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_beb_gin',
    nombre: 'Gin Tonic Heráclito',
    descripcion: 'Gin nacional Heráclito, agua tónica premium y rodaja de pomelo.',
    precio_venta: 5400.00,
    categoria: 'Bebidas',
    subcategoria: 'Gin',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80',
    tipo: 'bebida',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_beb_fernet',
    nombre: 'Fernet Branca Estilo Patrón',
    descripcion: 'Un clásico argentino de Fernet Fratelli Branca y Coca Cola.',
    precio_venta: 4800.00,
    categoria: 'Bebidas',
    subcategoria: 'Fernet',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80',
    tipo: 'bebida',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_beb_aperol',
    nombre: 'Aperol Spritz',
    descripcion: 'Refrescante copón con Aperol, espumante Chandon y rodaja de naranja.',
    precio_venta: 4900.00,
    categoria: 'Bebidas',
    subcategoria: 'Aperitivos',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80',
    tipo: 'bebida',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_gaseosa',
    nombre: 'Gaseosa Línea Cola Fría',
    descripcion: 'Lata de Coca-Cola original de 354ml bien helada.',
    precio_venta: 2500.00,
    categoria: 'Bebidas',
    subcategoria: 'Gaseosas',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80&auto=format&fit=crop',
    tipo: 'bebida',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_agua',
    nombre: 'Agua Mineral Glaciar Con/Sin Gas',
    descripcion: 'Agua mineral de vertiente natural de 500ml.',
    precio_venta: 2200.00,
    categoria: 'Bebidas',
    subcategoria: 'Agua',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1608885898957-a599fb18ec3f?w=400&q=80&auto=format&fit=crop',
    tipo: 'bebida',
    requiere_cocina: false
  },
  {
    id_producto: 'prod_cafe_espresso',
    nombre: 'Café Espresso Doble',
    descripcion: 'Intenso café espresso de grano de especialidad colombiano.',
    precio_venta: 2400.00,
    categoria: 'Bebidas',
    subcategoria: 'Cafetería',
    activo: true,
    imagen: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80',
    tipo: 'bebida',
    requiere_cocina: false
  }
];

export const INITIAL_RECETAS_ESCANDALLO: RecetaEscandallo[] = [
  // Carpaccio de lomo
  { id_receta: 'esc_carp_lomo_cur', id_producto: 'prod_ent_carpaccio', id_insumo: 'ins_lomo_carne', cantidad_a_descontar: 120.00, unidad_medida: 'g' },
  { id_receta: 'esc_carp_alcaparras', id_producto: 'prod_ent_carpaccio', id_insumo: 'ins_alcaparras', cantidad_a_descontar: 15.00, unidad_medida: 'g' },
  { id_receta: 'esc_carp_parmesano', id_producto: 'prod_ent_carpaccio', id_insumo: 'ins_parmesano', cantidad_a_descontar: 25.00, unidad_medida: 'g' },
  { id_receta: 'esc_carp_aceite', id_producto: 'prod_ent_carpaccio', id_insumo: 'ins_aceite_trufa', cantidad_a_descontar: 10.00, unidad_medida: 'ml' },

  // Burrata di Andria
  { id_receta: 'esc_burr_unidad', id_producto: 'prod_ent_burrata', id_insumo: 'ins_burrata_fresca', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_burr_tomat', id_producto: 'prod_ent_burrata', id_insumo: 'ins_tomates_confit', cantidad_a_descontar: 80.00, unidad_medida: 'g' },
  { id_receta: 'esc_burr_pesto', id_producto: 'prod_ent_burrata', id_insumo: 'ins_pesto_albahaca', cantidad_a_descontar: 25.00, unidad_medida: 'ml' },
  { id_receta: 'esc_burr_aceto', id_producto: 'prod_ent_burrata', id_insumo: 'ins_aceto', cantidad_a_descontar: 10.00, unidad_medida: 'ml' },

  // Mollejas al verdeo
  { id_receta: 'esc_mollejas_base', id_producto: 'prod_ent_mollejas', id_insumo: 'ins_mollejas', cantidad_a_descontar: 200.00, unidad_medida: 'g' },
  { id_receta: 'esc_mollejas_verd', id_producto: 'prod_ent_mollejas', id_insumo: 'ins_verdeo', cantidad_a_descontar: 40.00, unidad_medida: 'g' },
  { id_receta: 'esc_mollejas_vino', id_producto: 'prod_ent_mollejas', id_insumo: 'ins_vino_blanco', cantidad_a_descontar: 30.00, unidad_medida: 'ml' },

  // Provoleta
  { id_receta: 'esc_provo_base', id_producto: 'prod_ent_provoleta', id_insumo: 'ins_provolone', cantidad_a_descontar: 180.00, unidad_medida: 'g' },
  { id_receta: 'esc_provo_tomat', id_producto: 'prod_ent_provoleta', id_insumo: 'ins_tomates_confit', cantidad_a_descontar: 20.00, unidad_medida: 'g' },

  // Empanadas
  { id_receta: 'esc_empa_patron', id_producto: 'prod_ent_empanadas', id_insumo: 'ins_empanada_relleno', cantidad_a_descontar: 160.00, unidad_medida: 'g' },

  // Rotolo di tata
  { id_receta: 'esc_rot_cabrito', id_producto: 'prod_pas_rotolo', id_insumo: 'ins_cabrito', cantidad_a_descontar: 150.00, unidad_medida: 'g' },
  { id_receta: 'esc_rot_harina', id_producto: 'prod_pas_rotolo', id_insumo: 'ins_harina_trigo', cantidad_a_descontar: 80.00, unidad_medida: 'g' },

  // Cintas sepia
  { id_receta: 'esc_cin_tinta', id_producto: 'prod_pas_cintas_sepia', id_insumo: 'ins_tinta_sepia', cantidad_a_descontar: 15.00, unidad_medida: 'g' },
  { id_receta: 'esc_cin_mariscos', id_producto: 'prod_pas_cintas_sepia', id_insumo: 'ins_mariscos_mix', cantidad_a_descontar: 120.00, unidad_medida: 'g' },
  { id_receta: 'esc_cin_harina', id_producto: 'prod_pas_cintas_sepia', id_insumo: 'ins_harina_trigo', cantidad_a_descontar: 100.00, unidad_medida: 'g' },

  // Sorrentinos cordero
  { id_receta: 'esc_sor_cordero', id_producto: 'prod_pas_sorrentinos_cordero', id_insumo: 'ins_cordero_braseado', cantidad_a_descontar: 140.00, unidad_medida: 'g' },
  { id_receta: 'esc_sor_harina', id_producto: 'prod_pas_sorrentinos_cordero', id_insumo: 'ins_harina_trigo', cantidad_a_descontar: 90.00, unidad_medida: 'g' },

  // Ravioles calabaza
  { id_receta: 'esc_rav_calabaza', id_producto: 'prod_pas_ravioles_calabaza', id_insumo: 'ins_calabaza', cantidad_a_descontar: 120.00, unidad_medida: 'g' },
  { id_receta: 'esc_rav_almendras', id_producto: 'prod_pas_ravioles_calabaza', id_insumo: 'ins_almendras_to', cantidad_a_descontar: 15.00, unidad_medida: 'g' },
  { id_receta: 'esc_rav_harina', id_producto: 'prod_pas_ravioles_calabaza', id_insumo: 'ins_harina_trigo', cantidad_a_descontar: 80.00, unidad_medida: 'g' },
  { id_receta: 'esc_rav_quesoazul', id_producto: 'prod_pas_ravioles_calabaza', id_insumo: 'ins_queso_azul', cantidad_a_descontar: 20.00, unidad_medida: 'g' },

  // Gnocchis
  { id_receta: 'esc_gno_harina', id_producto: 'prod_pas_gnocchis', id_insumo: 'ins_harina_trigo', cantidad_a_descontar: 120.00, unidad_medida: 'g' },

  // Ojo de bife con aligot
  { id_receta: 'esc_ojo_premium', id_producto: 'prod_car_ojo_bife', id_insumo: 'ins_lomo_carne', cantidad_a_descontar: 400.00, unidad_medida: 'g' },
  { id_receta: 'esc_ojo_aligot', id_producto: 'prod_car_ojo_bife', id_insumo: 'ins_aligot_queso', cantidad_a_descontar: 80.00, unidad_medida: 'g' },

  // Bife madurado
  { id_receta: 'esc_bif_base', id_producto: 'prod_car_bife_madurado', id_insumo: 'ins_bife_madurado', cantidad_a_descontar: 400.00, unidad_medida: 'g' },

  // Costillar
  { id_receta: 'esc_cos_base', id_producto: 'prod_car_costillar', id_insumo: 'ins_costillar', cantidad_a_descontar: 550.00, unidad_medida: 'g' },

  // Entraña
  { id_receta: 'esc_ent_base', id_producto: 'prod_car_entrana', id_insumo: 'ins_entrana', cantidad_a_descontar: 320.00, unidad_medida: 'g' },

  // Matambrito
  { id_receta: 'esc_mat_base', id_producto: 'prod_car_matambrito', id_insumo: 'ins_matambrito_cerdo', cantidad_a_descontar: 300.00, unidad_medida: 'g' },
  { id_receta: 'esc_mat_verd', id_producto: 'prod_car_matambrito', id_insumo: 'ins_verdeo', cantidad_a_descontar: 30.00, unidad_medida: 'g' },

  // Salmon rosado
  { id_receta: 'esc_sal_base', id_producto: 'prod_pes_salmon', id_insumo: 'ins_salmon_rosado', cantidad_a_descontar: 220.00, unidad_medida: 'g' },

  // Abadejo
  { id_receta: 'esc_aba_base', id_producto: 'prod_pes_abadejo', id_insumo: 'ins_abadejo_filet', cantidad_a_descontar: 250.00, unidad_medida: 'g' },

  // Trucha
  { id_receta: 'esc_tru_base', id_producto: 'prod_pes_trucha', id_insumo: 'ins_trucha_fresca', cantidad_a_descontar: 240.00, unidad_medida: 'g' },
  { id_receta: 'esc_tru_alm', id_producto: 'prod_pes_trucha', id_insumo: 'ins_almendras_to', cantidad_a_descontar: 25.00, unidad_medida: 'g' },

  // Cazuela mariscos
  { id_receta: 'esc_caz_mix', id_producto: 'prod_pes_cazuela', id_insumo: 'ins_mariscos_mix', cantidad_a_descontar: 280.00, unidad_medida: 'g' },

  // Filet de merluza
  { id_receta: 'esc_mer_base', id_producto: 'prod_pes_merluza', id_insumo: 'ins_merluza_filet', cantidad_a_descontar: 200.00, unidad_medida: 'g' },

  // Milanesa Estilo Patrón
  { id_receta: 'esc_mil_carne', id_producto: 'prod_cri_milanesa', id_insumo: 'ins_lomo_carne', cantidad_a_descontar: 250.00, unidad_medida: 'g' },

  // Hamburguesa Gourmet
  { id_receta: 'esc_ham_beef', id_producto: 'prod_cri_hamburguesa', id_insumo: 'ins_hamburguesa_und', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_ham_bread', id_producto: 'prod_cri_hamburguesa', id_insumo: 'ins_pan_hamburguesa', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_ham_cheddar', id_producto: 'prod_cri_hamburguesa', id_insumo: 'ins_cheddar_fetas', cantidad_a_descontar: 2.00, unidad_medida: 'unidades' },

  // Pastel de papa
  { id_receta: 'esc_pas_lomo', id_producto: 'prod_cri_pastel_papa', id_insumo: 'ins_lomo_carne', cantidad_a_descontar: 180.00, unidad_medida: 'g' },
  { id_receta: 'esc_pas_queso', id_producto: 'prod_cri_pastel_papa', id_insumo: 'ins_parmesano', cantidad_a_descontar: 30.00, unidad_medida: 'g' },

  // Locro tradicional
  { id_receta: 'esc_loc_car', id_producto: 'prod_cri_locro', id_insumo: 'ins_lomo_carne', cantidad_a_descontar: 100.00, unidad_medida: 'g' },

  // Humita
  { id_receta: 'esc_hum_queso', id_producto: 'prod_cri_humita', id_insumo: 'ins_parmesano', cantidad_a_descontar: 45.00, unidad_medida: 'g' },

  // Postres
  { id_receta: 'esc_pos_flan_dl', id_producto: 'prod_pos_flan', id_insumo: 'ins_dulce_leche', cantidad_a_descontar: 40.00, unidad_medida: 'g' },
  { id_receta: 'esc_pos_vol_choc', id_producto: 'prod_pos_volcan', id_insumo: 'ins_chocolate_belga', cantidad_a_descontar: 60.00, unidad_medida: 'g' },
  { id_receta: 'esc_pos_vol_ice', id_producto: 'prod_pos_volcan', id_insumo: 'ins_helado_crema', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_pos_per_pera', id_producto: 'prod_pos_peras', id_insumo: 'ins_peras_und', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_pos_tir_choc', id_producto: 'prod_pos_tiramisu', id_insumo: 'ins_chocolate_belga', cantidad_a_descontar: 15.00, unidad_medida: 'g' },
  { id_receta: 'esc_pos_pan_dl', id_producto: 'prod_pos_panqueque', id_insumo: 'ins_dulce_leche', cantidad_a_descontar: 80.00, unidad_medida: 'g' },

  // Bebidas directas
  { id_receta: 'esc_beb_trump_bot_dir', id_producto: 'prod_vin_trumpeter_botella', id_insumo: 'ins_vin_trumpeter', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_rutini_bot_dir', id_producto: 'prod_vin_rutini_botella', id_insumo: 'ins_vin_rutini', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_encu_bot_dir', id_producto: 'prod_vin_encuentro_botella', id_insumo: 'ins_vin_encuentro', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_escor_bot_dir', id_producto: 'prod_vin_escorihuela_gascon', id_insumo: 'ins_vin_escorihuela', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_eg_bot_dir', id_producto: 'prod_vin_eg_gran_reserva', id_insumo: 'ins_vin_eg_gran_reserva', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_peq_bot_dir', id_producto: 'prod_vin_pequenas_prod_cf', id_insumo: 'ins_vin_pequenas_prod', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_ruca_bot_dir', id_producto: 'prod_vin_ruca_cap2', id_insumo: 'ins_vin_ruca_cap2', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_alam_bot_dir', id_producto: 'prod_vin_alamos_botella', id_insumo: 'ins_vin_alamos', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_st_bot_dir', id_producto: 'prod_vin_st_felicien_botella', id_insumo: 'ins_vin_st_felicien', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_nica_bot_dir', id_producto: 'prod_vin_nicasia_malbec', id_insumo: 'ins_vin_nicasia', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_pad_bot_dir', id_producto: 'prod_vin_padrillo_cs', id_insumo: 'ins_vin_padrillo', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_dv_bot_dir', id_producto: 'prod_vin_dv_catena_botella', id_insumo: 'ins_vin_dv_catena', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_ene_bot_dir', id_producto: 'prod_vin_el_enemigo_botella', id_insumo: 'ins_vin_enemigo', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_tik_bot_dir', id_producto: 'prod_vin_tikal_natural', id_insumo: 'ins_vin_tikal', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_ang_bot_dir', id_producto: 'prod_vin_angelica_zapata', id_insumo: 'ins_vin_angelica', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_arg_bot_dir', id_producto: 'prod_vin_catena_argentino', id_insumo: 'ins_vin_argentino', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_luc_bot_dir', id_producto: 'prod_vin_luca_pinot', id_insumo: 'ins_vin_luca', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  
  { id_receta: 'esc_beb_perd_bot_dir', id_producto: 'prod_vin_perdices_malbec', id_insumo: 'ins_vin_perdices', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_pres_bot_dir', id_producto: 'prod_vin_perdices_reserva', id_insumo: 'ins_vin_perdices_reserva', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_don_bot_dir', id_producto: 'prod_vin_don_juan_blend', id_insumo: 'ins_vin_don_juan', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_exp_bot_dir', id_producto: 'prod_vin_perdices_exploracion', id_insumo: 'ins_vin_exploracion', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_ala_color_dir', id_producto: 'prod_vin_ala_colorada_cf', id_insumo: 'ins_vin_ala_colorada', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_ala_viog_dir', id_producto: 'prod_vin_ala_viognier', id_insumo: 'ins_vin_ala_viognier', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },

  { id_receta: 'esc_beb_portsb_bot_dir', id_producto: 'prod_vin_portillo_sb_botella', id_insumo: 'ins_vin_portillo', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_portmb_bot_dir', id_producto: 'prod_vin_portillo_malbec', id_insumo: 'ins_vin_portillo', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_salch_bot_dir', id_producto: 'prod_vin_salentein_res_ch', id_insumo: 'ins_vin_salentein_reserva', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_salpy_bot_dir', id_producto: 'prod_vin_salentein_pyros', id_insumo: 'ins_vin_pyros', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_salnu_bot_dir', id_producto: 'prod_vin_salentein_numina', id_insumo: 'ins_vin_numina', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_salpr_bot_dir', id_producto: 'prod_vin_salentein_primus', id_insumo: 'ins_vin_primus', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },

  { id_receta: 'esc_beb_baronb_champ_dir', id_producto: 'prod_vin_baron_b_extra_brut', id_insumo: 'ins_champ_baron_b', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_aluda_champ_dir', id_producto: 'prod_vin_aluda_brut', id_insumo: 'ins_champ_aluda', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_encrose_champ_dir', id_producto: 'prod_vin_encuentro_rose', id_insumo: 'ins_champ_encuentro_ros', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_salchamp_champ_dir', id_producto: 'prod_vin_salentein_champagne', id_insumo: 'ins_champ_salentein', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_beb_chand_champ_dir', id_producto: 'prod_vin_chandon_extra_brut', id_insumo: 'ins_champ_chandon', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },

  // Copa
  { id_receta: 'esc_beb_trump_copa_recipe', id_producto: 'prod_vin_trumpeter_copa', id_insumo: 'ins_vin_trumpeter', cantidad_a_descontar: 0.20, unidad_medida: 'unidades' },

  // Drinks
  { id_receta: 'esc_whisky_medida', id_producto: 'prod_beb_whisky', id_insumo: 'ins_whisky_maca', cantidad_a_descontar: 0.05, unidad_medida: 'unidades' }, // descarta fracción de botella
  { id_receta: 'esc_gin_medida', id_producto: 'prod_beb_gin', id_insumo: 'ins_gin_heraclito', cantidad_a_descontar: 0.08, unidad_medida: 'unidades' },
  { id_receta: 'esc_fernet_medida', id_producto: 'prod_beb_fernet', id_insumo: 'ins_fernet_branca', cantidad_a_descontar: 0.08, unidad_medida: 'unidades' },
  { id_receta: 'esc_aperol_medida', id_producto: 'prod_beb_aperol', id_insumo: 'ins_aperitivo_aperol', cantidad_a_descontar: 0.10, unidad_medida: 'unidades' },
  { id_receta: 'esc_gaseosa_lata', id_producto: 'prod_gaseosa', id_insumo: 'ins_beb_gaseosa', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_agua_botella', id_producto: 'prod_agua', id_insumo: 'ins_beb_agua', cantidad_a_descontar: 1.00, unidad_medida: 'unidades' },
  { id_receta: 'esc_cafe_espresso_rec', id_producto: 'prod_cafe_espresso', id_insumo: 'ins_cafe_grano', cantidad_a_descontar: 18.00, unidad_medida: 'g' } // g de café sémola
];

export const INITIAL_PEDIDOS: Pedido[] = [
  {
    id_pedido: 1021,
    id_mesa: 2,
    numero_mesa: 'Mesa 2',
    mozo: 'Enzo',
    estado_comanda: 'listo',
    items: [
      { id_producto: 'prod_ent_burrata', nombre: 'Burrata di Andria', cantidad: 1, categoria: 'Entradas' },
      { id_producto: 'prod_pas_sorrentinos_cordero', nombre: 'Sorrentinos de cordero patagónico', cantidad: 1, categoria: 'Pastas' },
      { id_producto: 'prod_agua', nombre: 'Agua Mineral Glaciar Con/Sin Gas', cantidad: 2, categoria: 'Bebidas' }
    ],
    observaciones: 'El agua sin gas, por favor.',
    fecha_hora: new Date(Date.now() - 30 * 60 * 1000), // Hace 30 min
    minutos_transcurridos: 30,
    segundos_en_listo: 360,
    origen: 'Mozo',
    tiempo_despacho_minutos: 15
  },
  {
    id_pedido: 1022,
    id_mesa: 12,
    numero_mesa: 'Mesa 12',
    mozo: 'Enzo',
    estado_comanda: 'en_cocina',
    items: [
      { id_producto: 'prod_pas_gnocchis', nombre: 'Gnocchis de papa andina al fierrito', cantidad: 2, categoria: 'Pastas' },
      { id_producto: 'prod_car_entrana', nombre: 'Entraña fina grillada', cantidad: 1, categoria: 'Carnes' }
    ],
    observaciones: 'Entraña bien jugosa.',
    fecha_hora: new Date(Date.now() - 12 * 60 * 1000),
    minutos_transcurridos: 12,
    origen: 'Mozo'
  },
  {
    id_pedido: 1023,
    id_mesa: 4,
    numero_mesa: 'Mesa 4',
    mozo: 'Micaela',
    estado_comanda: 'pendiente',
    items: [
      { id_producto: 'prod_car_ojo_bife', nombre: 'Ojo de bife con aligot de papa', cantidad: 1, categoria: 'Carnes' },
      { id_producto: 'prod_vin_rutini_botella', nombre: 'Rutini Cab-Malbec 750ml', cantidad: 1, categoria: 'Bodega' }
    ],
    observaciones: 'Ojo de bife bien a punto (jugoso por dentro).',
    fecha_hora: new Date(Date.now() - 2 * 60 * 1000),
    minutos_transcurridos: 2,
    origen: 'Mozo'
  },
  {
    id_pedido: 1024,
    id_mesa: 8,
    numero_mesa: 'Mesa 8',
    mozo: 'Enzo',
    estado_comanda: 'pendiente',
    items: [
      { id_producto: 'prod_cri_hamburguesa', nombre: 'Hamburguesa Clásica Gourmet', cantidad: 1, categoria: 'Comidas Criollas' },
      { id_producto: 'prod_gaseosa', nombre: 'Gaseosa Línea Cola Fría', cantidad: 1, categoria: 'Bebidas' }
    ],
    observaciones: 'Sin aderezos extras.',
    fecha_hora: new Date(Date.now() - 1 * 60 * 1000),
    minutos_transcurridos: 1,
    origen: 'Mozo'
  },
  {
    id_pedido: 1025,
    id_mesa: 3,
    numero_mesa: 'Mesa 3',
    mozo: 'PedidosYa Delivery',
    estado_comanda: 'pendiente',
    items: [
      { id_producto: 'prod_car_ojo_bife', nombre: 'Ojo de bife con aligot de papa', cantidad: 2, categoria: 'Carnes' }
    ],
    observaciones: 'Enviar cubiertos descartables.',
    fecha_hora: new Date(Date.now() - 0.2 * 60 * 1000),
    minutos_transcurridos: 0,
    origen: 'PedidosYa'
  }
];
