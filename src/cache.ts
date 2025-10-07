export interface CacheEntry {
  html: string;
  status: number;
  headers: Record<string, string>;
  expiresAt: number;
}

export class InMemoryTtlCache {
  private store = new Map<string, CacheEntry>();

  constructor(private readonly ttlSeconds: number) {}

  get(key: string): CacheEntry | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  set(key: string, value: Omit<CacheEntry, 'expiresAt'>): void {
    const expiresAt = Date.now() + this.ttlSeconds * 1000;
    this.store.set(key, { ...value, expiresAt });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}





