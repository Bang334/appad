import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'appad_settings.db';

export const settingsDatabase = {
  init: async () => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    
    // Initialize default values if not exists
    const defaultSettings = [
      { key: 'notifications', value: 'true' },
      { key: 'highQuality', value: 'true' },
      { key: 'downloadOnWifi', value: 'true' },
      { key: 'darkMode', value: 'true' }
    ];

    for (const setting of defaultSettings) {
      await db.runAsync(
        'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
        [setting.key, setting.value]
      );
    }
  },

  getSetting: async (key, defaultValue) => {
    try {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      const row = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
      if (row) {
        // Handle boolean values stored as strings
        if (row.value === 'true') return true;
        if (row.value === 'false') return false;
        return row.value;
      }
      return defaultValue;
    } catch (error) {
      console.error('Error getting setting:', error);
      return defaultValue;
    }
  },

  updateSetting: async (key, value) => {
    try {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      const stringValue = String(value);
      await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [key, stringValue]
      );
      return true;
    } catch (error) {
      console.error('Error updating setting:', error);
      return false;
    }
  },

  getAllSettings: async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      const rows = await db.getAllAsync('SELECT * FROM settings');
      const settings = {};
      rows.forEach(row => {
        let value = row.value;
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        settings[row.key] = value;
      });
      return settings;
    } catch (error) {
      console.error('Error getting all settings:', error);
      return {};
    }
  }
};
