/**
 * Cache mémoire générique à une entrée par instance, TTL avec expiry
 * paresseuse (vérifiée à la lecture) — même principe que la blacklist JWT
 * de `AuthCacheService`, mais réutilisable pour n'importe quelle valeur.
 * Aucune invalidation à l'écriture : adapté aux données non sensibles
 * tolérant une fraîcheur de quelques dizaines de secondes.
 */
export class TtlCache<T> {
  private value: T | undefined;
  private expiresAt = 0;

  get(): T | undefined {
    if (this.value === undefined || Date.now() > this.expiresAt) {
      return undefined;
    }
    return this.value;
  }

  set(value: T, ttlMs: number): void {
    this.value = value;
    this.expiresAt = Date.now() + ttlMs;
  }
}
