const mockStore = {};

class MockStore {
  constructor(options) {
    this.name = options?.name || 'test-store';
    this.defaults = options?.defaults || {};
    this.store = { ...this.defaults };
  }

  get(key, defaultValue) {
    const keys = key.split('.');
    let value = this.store;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  set(key, value) {
    const keys = key.split('.');
    let target = this.store;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in target) || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }
    
    target[keys[keys.length - 1]] = value;
  }

  clear() {
    this.store = { ...this.defaults };
  }
}

module.exports = MockStore;
module.exports.default = MockStore;