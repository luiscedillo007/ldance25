// DatabaseManager.js - SQLite database operations
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const constants = require('./constants');

class DatabaseManager {
	constructor() {
		this.db = null;
		this.constants = constants; // Add this line to make constants accessible
		this.init();
	}

	// Initialize database and create tables
	init() {
		this.db = new sqlite3.Database(constants.DATABASE.PATH, (err) => {
			if (err) {
				console.error('❌ Error opening database:', err.message);
			} else {
				console.log('✅ Connected to SQLite database');
				this.createTables();
			}
		});
	}

	// Initialize database tables
	initializeTables() {
		const createUsersTable = `
			CREATE TABLE IF NOT EXISTS ${constants.DATABASE.TABLES.USERS} (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				unique_id TEXT UNIQUE NOT NULL,
				username TEXT UNIQUE NOT NULL,
				first_name TEXT NOT NULL,
				last_name TEXT NOT NULL,
				password_hash TEXT NOT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`;

		const createSessionsTable = `
			CREATE TABLE IF NOT EXISTS ${constants.DATABASE.TABLES.SESSIONS} (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				session_id TEXT UNIQUE NOT NULL,
				user_id INTEGER,
				test_type TEXT,
				test_site TEXT DEFAULT 'Unknown',
				score REAL,
				feedback TEXT,
				completed_at DATETIME,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (user_id) REFERENCES ${constants.DATABASE.TABLES.USERS} (id)
			)
		`;

		// Run users table first
		this.db.run(createUsersTable, (err) => {
			if (err) console.error('Error creating users table:', err);
		});

		// Run sessions table and handle migration
		this.db.run(createSessionsTable, (err) => {
			if (err) {
				console.error('Error creating sessions table:', err);
				// If table exists but missing column, add it
				this.db.run(`ALTER TABLE ${constants.DATABASE.TABLES.SESSIONS} ADD COLUMN test_site TEXT DEFAULT 'Unknown'`, (alterErr) => {
					if (alterErr && !alterErr.message.includes('duplicate column')) {
						console.error('Migration error:', alterErr);
					} else {
						console.log('✅ Added test_site column to existing table');
					}
				});
			} else {
				console.log('✅ Sessions table ready');
			}
		});
	}

	// Create necessary tables
	createTables() {
		const createUsersTable = `
			CREATE TABLE IF NOT EXISTS ${constants.DATABASE.TABLES.USERS} (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				unique_id TEXT UNIQUE NOT NULL,
				username TEXT UNIQUE NOT NULL,
				first_name TEXT NOT NULL,
				last_name TEXT NOT NULL,
				password_hash TEXT NOT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`;

		const createSessionsTable = `
			CREATE TABLE IF NOT EXISTS ${constants.DATABASE.TABLES.SESSIONS} (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				session_id TEXT UNIQUE NOT NULL,
				user_id INTEGER,
				test_type TEXT,
				score REAL,
				feedback TEXT,
				completed_at DATETIME,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (user_id) REFERENCES ${constants.DATABASE.TABLES.USERS} (id)
			)
		`;

		this.db.run(createUsersTable);
		this.db.run(createSessionsTable);
	}

	// Validate password requirements
	validatePassword(password) {
		const hasMinLength = password.length >= constants.PASSWORD.MIN_LENGTH;
		const specialChars = password.match(/[!@#$%^&*(),.?":{}|<>]/g) || [];
		const hasSpecialChars = specialChars.length >= constants.PASSWORD.REQUIRED_SPECIAL_CHARS;
		const numbers = password.match(/\d/g) || [];
		const hasNumbers = numbers.length >= constants.PASSWORD.REQUIRED_NUMBERS;
		
		return hasMinLength && hasSpecialChars && hasNumbers;
	}

	// Register new user
	async registerUser(userData) {
		const { firstName, lastName, username, password } = userData;

		// Validate required fields
		if (!firstName?.trim() || !lastName?.trim() || !username?.trim() || !password) {
			throw new Error('All fields are required');
		}

		// Validate password
		if (!this.validatePassword(password)) {
			throw new Error(`Password must be at least ${constants.PASSWORD.MIN_LENGTH} characters with ${constants.PASSWORD.REQUIRED_SPECIAL_CHARS} special character and ${constants.PASSWORD.REQUIRED_NUMBERS} numbers`);
		}

		// Normalize data
		const normalizedFirstName = firstName.trim().charAt(0).toUpperCase() + firstName.trim().slice(1).toLowerCase();
		const normalizedLastName = lastName.trim().charAt(0).toUpperCase() + lastName.trim().slice(1).toLowerCase();
		const normalizedUsername = username.trim().toLowerCase();

		return new Promise((resolve, reject) => {
			// Check if username already exists
			this.db.get(
				`SELECT username FROM ${constants.DATABASE.TABLES.USERS} WHERE username = ?`,
				[normalizedUsername],
				async (err, row) => {
					if (err) {
						reject(new Error('Database error'));
						return;
					}

					if (row) {
						reject(new Error('Username already exists'));
						return;
					}

					try {
						// Hash password
						const passwordHash = await bcrypt.hash(password, constants.PASSWORD.SALT_ROUNDS);
						const uniqueId = uuidv4();

						// Insert new user
						this.db.run(
							`INSERT INTO ${constants.DATABASE.TABLES.USERS} (unique_id, username, first_name, last_name, password_hash) VALUES (?, ?, ?, ?, ?)`,
							[uniqueId, normalizedUsername, normalizedFirstName, normalizedLastName, passwordHash],
							function(err) {
								if (err) {
									reject(new Error('Failed to create user'));
									return;
								}

								resolve({
									success: true,
									data: {
										user: {
											username: normalizedUsername,
											firstName: normalizedFirstName,
											lastName: normalizedLastName,
											uniqueId: uniqueId,
											createdAt: new Date().toISOString()
										}
									}
								});
							}
						);
					} catch (hashError) {
						reject(new Error('Password encryption failed'));
					}
				}
			);
		});
	}

	// Save session score
	async saveSessionScore(sessionData) {
		const { sessionId, score, feedback } = sessionData;
		
		return new Promise((resolve, reject) => {
			this.db.run(
				`UPDATE ${constants.DATABASE.TABLES.SESSIONS} SET score = ?, feedback = ?, completed_at = CURRENT_TIMESTAMP WHERE session_id = ?`,
				[score, feedback || '', sessionId],
				function(err) {
					if (err) {
						console.error('Database error saving score:', err);
						reject(new Error('Failed to save score'));
						return;
					}
					
					console.log(`✅ Score saved for session ${sessionId}: ${score}`);
					resolve({ success: true });
				}
			);
		});
	}

	// Close database connection
	close() {
		if (this.db) {
			this.db.close((err) => {
				if (err) {
					console.error('❌ Error closing database:', err.message);
				} else {
					console.log('✅ Database connection closed');
				}
			});
		}
	}

	// Delete session
	async deleteSession(sessionId) {
		return new Promise((resolve, reject) => {
			this.db.run(
				`DELETE FROM ${constants.DATABASE.TABLES.SESSIONS} WHERE session_id = ?`,
				[sessionId],
				function(err) {
					if (err) {
						console.error('Database error deleting session:', err);
						reject(new Error('Failed to delete session'));
						return;
					}
					
					if (this.changes === 0) {
						reject(new Error('Session not found'));
						return;
					}
					
					console.log(`✅ Session deleted: ${sessionId}`);
					resolve({ success: true });
				}
			);
		});
	}
}

module.exports = DatabaseManager; 