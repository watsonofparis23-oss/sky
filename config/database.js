const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            const dbPath = path.join(__dirname, '..', 'database', 'skyvoyage.db');
            
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error connecting to database:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database');
                    // Enable foreign keys
                    this.db.run("PRAGMA foreign_keys = ON");
                    resolve();
                }
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // Generic query method
    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Generic run method for INSERT, UPDATE, DELETE
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Get single row
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Begin transaction
    beginTransaction() {
        return this.run('BEGIN TRANSACTION');
    }

    // Commit transaction
    commitTransaction() {
        return this.run('COMMIT');
    }

    // Rollback transaction
    rollbackTransaction() {
        return this.run('ROLLBACK');
    }
}

// Create singleton instance
const database = new Database();

module.exports = database;