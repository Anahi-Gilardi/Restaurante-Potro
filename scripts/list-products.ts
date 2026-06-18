import { INITIAL_PRODUCTOS_MENU } from '../src/data/initialData.js';
import * as fs from 'fs';
import * as path from 'path';

const data = INITIAL_PRODUCTOS_MENU.map(p => ({
  id_producto: p.id_producto,
  nombre: p.nombre,
  categoria: p.categoria,
  imagen: p.imagen
}));

fs.writeFileSync('./scripts/products.json', JSON.stringify(data, null, 2));
console.log('Saved to scripts/products.json. Total count:', data.length);
