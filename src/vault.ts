import fs from 'fs';
import path from 'path';

export interface KeyEntry {
  id: string;
  service: string;
  key: string;
  permissions: string[];
  description?: string;
}

export class Vault {
  private storagePath: string;
  private keys: KeyEntry[] = [];

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
}
