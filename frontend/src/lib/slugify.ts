/** Normaliza texto livre para o formato de id de tenant (minúsculas, números e hífen). */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos (NFD separa a base da marca diacrítica)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
