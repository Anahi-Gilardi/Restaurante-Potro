import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isValidImageData,
  sanitizeImageData,
  saveMenuImage,
  getMenuImageSync,
  getMenuImage,
  getAllMenuImages,
  deleteMenuImage,
  memoryImageCache,
  MAX_IMAGE_CHARS,
  MAX_IMAGE_DIMENSION
} from './imageStorage';

test('constantes de límites de compresión son seguras para Google Sheets', () => {
  assert.ok(MAX_IMAGE_CHARS <= 12000, 'Límite de caracteres debe ser <= 12.000 para no superar los 20.000 de Google Sheets');
  assert.equal(MAX_IMAGE_DIMENSION, 240, 'Dimensión máxima debe ser 240px');
});

test('isValidImageData valida URLs legítimas y descarta cadenas truncadas o vacías', () => {
  assert.equal(isValidImageData('https://images.unsplash.com/photo-123'), true);
  assert.equal(isValidImageData('/logo-el-patron.jpeg'), true);
  assert.equal(isValidImageData('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGh8eHRYeHycjJy'), true);

  // Truncados por Google Apps Script
  assert.equal(isValidImageData('data:image/jpeg;base64,/9j/4AAQSkZJRg... [Recortado]'), false);
  assert.equal(isValidImageData('https://example.com/photo... [recortado]'), false);

  // Nulos, vacíos o tipos inválidos
  assert.equal(isValidImageData(''), false);
  assert.equal(isValidImageData('   '), false);
  assert.equal(isValidImageData(null), false);
  assert.equal(isValidImageData(undefined), false);
  assert.equal(isValidImageData(12345), false);
  assert.equal(isValidImageData('data:image/jpeg;base64,'), false); // Demasiado corto, sin base64
});

test('sanitizeImageData devuelve la cadena limpia o null si es inválida', () => {
  assert.equal(sanitizeImageData('  https://example.com/image.jpg  '), 'https://example.com/image.jpg');
  assert.equal(sanitizeImageData('corrupt_data... [Recortado]'), null);
  assert.equal(sanitizeImageData(''), null);
});

test('saveMenuImage almacena en memoria y se puede recuperar con getMenuImageSync y getMenuImage', async () => {
  const testId = 'prod_test_image_1';
  const testUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/test12345678901234567890';

  await saveMenuImage(testId, testUrl);

  assert.equal(memoryImageCache.get(testId), testUrl);
  assert.equal(getMenuImageSync(testId), testUrl);

  const asyncVal = await getMenuImage(testId);
  assert.equal(asyncVal, testUrl);

  const all = await getAllMenuImages();
  assert.equal(all[testId], testUrl);

  await deleteMenuImage(testId);
  assert.equal(getMenuImageSync(testId), null);
  assert.equal(await getMenuImage(testId), null);
});

test('saveMenuImage ignora imágenes corruptas o recortadas', async () => {
  const testId = 'prod_test_corrupt';
  const corruptUrl = 'data:image/jpeg;base64,part123... [Recortado]';

  await saveMenuImage(testId, corruptUrl);

  assert.equal(memoryImageCache.get(testId), undefined);
  assert.equal(getMenuImageSync(testId), null);
});
