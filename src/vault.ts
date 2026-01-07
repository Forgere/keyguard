import fs from 'fs';
import path from 'path';

export interface KeyEntry {
  id: string;
  service: string;
  key: string;
  permissions: string[];
  description?: string;
}

export interface SessionEntry {
  token: string;
  keyId: string;
  service: string;
  permissions: string[];
  expiresAt: number;
}

export class Vault {
  private storagePath: string;
  private keys: KeyEntry[] = [];
  private sessions: Map<string, SessionEntry> = new Map();

  constructor(storagePath?: string) {
    this.storagePath = storagePath || process.env.KEYGUARD_STORAGE_PATH || path.join(process.cwd(), 'storage.json');
    this.load();
  }

  private load() {
    if (fs.existsSync(this.storagePath)) {
      try {
        const data = fs.readFileSync(this.storagePath, 'utf-8');
        this.keys = JSON.parse(data);
      } catch (e) {
        console.error('Failed to load vault storage:', e);
        this.keys = [];
      }
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.keys, null, 2));
    } catch (e) {
      console.error('Failed to save vault storage:', e);
    }
  }

  addKey(entry: KeyEntry) {
    this.keys.push(entry);
    this.save();
  }

  listKeys(service?: string) {
    if (service) {
      return this.keys.filter(k => k.service === service);
    }
    return this.keys;
  }

  getKey(id: string) {
    return this.keys.find(k => k.id === id);
  }

  removeKey(id: string) {
    this.keys = this.keys.filter(k => k.id !== id);
    this.save();
  }

  // 核心映射逻辑：根据请求的权限寻找最合适的 Key
  findBestKey(service: string, requiredPermissions: string[]): KeyEntry | null {
    const serviceKeys = this.listKeys(service);
    
    // 寻找包含所有所需权限且权限最少的 Key (最小权限原则)
    let bestKey: KeyEntry | null = null;
    
    for (const entry of serviceKeys) {
      const hasAll = requiredPermissions.every(p => entry.permissions.includes(p));
      if (hasAll) {
        if (!bestKey || entry.permissions.length < bestKey.permissions.length) {
          bestKey = entry;
        }
      }
    }
    
    return bestKey;
  }

  createSession(key: KeyEntry, permissions: string[], ttlMs: number = 3600000): string {
    const token = `kg_sess_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    const session: SessionEntry = {
      token,
      keyId: key.id,
      service: key.service,
      permissions,
      expiresAt: Date.now() + ttlMs,
    };
    this.sessions.set(token, session);
    return token;
  }

  getSession(token: string): SessionEntry | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }
    return session;
  }
}
