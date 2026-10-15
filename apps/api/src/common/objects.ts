/** Saca las claves `undefined` (campos opcionales no enviados) para no pisar valores por defecto. */
export function definedOnly<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
