// UserService.js - User authentication and management
const DatabaseManager = require('./DatabaseManager');
const constants = require('./constants');

class UserService {
	constructor() {
		this.dbManager = new DatabaseManager();
	}

	// Register new user
	async register(userData) {
		try {
			const result = await this.dbManager.registerUser(userData);
			return result;
		} catch (error) {
			return {
				success: false,
				error: error.message
			};
		}
	}

	// Save session score
	async saveScore(sessionData) {
		try {
			const result = await this.dbManager.saveSessionScore(sessionData);
			return result;
		} catch (error) {
			return {
				success: false,
				error: error.message
			};
		}
	}

	// Verify account by unique ID
	async verifyAccount(uniqueId) {
		try {
			return new Promise((resolve, reject) => {
				this.dbManager.db.get(
					`SELECT unique_id, username, first_name, last_name, created_at FROM ${constants.DATABASE.TABLES.USERS} WHERE unique_id = ?`,
					[uniqueId.trim()],
					(err, row) => {
						if (err) {
							reject(new Error('Database error'));
							return;
						}

						if (!row) {
							resolve({
								success: false,
								error: 'Invalid account ID'
							});
							return;
						}

						resolve({
							success: true,
							data: {
								user: {
									username: row.username,
									firstName: row.first_name,
									lastName: row.last_name,
									uniqueId: row.unique_id,
									createdAt: row.created_at
								}
							}
						});
					}
				);
			});
		} catch (error) {
			return {
				success: false,
				error: error.message
			};
		}
	}

	// Reset password by unique ID
	async resetPassword(uniqueId, newPassword) {
		try {
			// Validate password
			if (!this.dbManager.validatePassword(newPassword)) {
				throw new Error(`Password must be at least ${constants.PASSWORD.MIN_LENGTH} characters with ${constants.PASSWORD.REQUIRED_SPECIAL_CHARS} special character and ${constants.PASSWORD.REQUIRED_NUMBERS} numbers`);
			}

			return new Promise(async (resolve, reject) => {
				try {
					// Hash new password
					const passwordHash = await bcrypt.hash(newPassword, constants.PASSWORD.SALT_ROUNDS);

					this.dbManager.db.run(
						`UPDATE ${constants.DATABASE.TABLES.USERS} SET password_hash = ? WHERE unique_id = ?`,
						[passwordHash, uniqueId.trim()],
						function(err) {
							if (err) {
								reject(new Error('Failed to reset password'));
								return;
							}

							if (this.changes === 0) {
								reject(new Error('Invalid account ID'));
								return;
							}

							resolve({ success: true });
						}
					);
				} catch (hashError) {
					reject(new Error('Password encryption failed'));
				}
			});
		} catch (error) {
			return {
				success: false,
				error: error.message
			};
		}
	}

	// Login user - Fixed version with better error handling
	async login(loginData) {
		const { username, password } = loginData;

		// Validate required fields
		if (!username?.trim() || !password) {
			return {
				success: false,
				error: 'Username and password are required'
			};
		}

		const normalizedUsername = username.trim().toLowerCase();

		try {
			return new Promise((resolve, reject) => {
				// Check for admin login
				if (normalizedUsername === constants.ADMIN.USERNAME && password === constants.ADMIN.PASSWORD) {
					resolve({
						success: true,
						data: {
							isAdmin: true,
							user: {
								username: 'admin',
								firstName: 'Admin',
								lastName: 'User',
								uniqueId: 'admin',
								createdAt: new Date().toISOString()
							}
						}
					});
					return;
				}

				// Get user from database
				this.dbManager.db.get(
					`SELECT unique_id, username, first_name, last_name, password_hash, created_at FROM ${constants.DATABASE.TABLES.USERS} WHERE username = ?`,
					[normalizedUsername],
					async (err, row) => {
						if (err) {
							console.error('Database query error:', err);
							resolve({
								success: false,
								error: 'Database error'
							});
							return;
						}

						if (!row) {
							resolve({
								success: false,
								error: 'Invalid credentials'
							});
							return;
						}

						try {
							// Verify password
							const bcrypt = require('bcrypt');
							const isValidPassword = await bcrypt.compare(password, row.password_hash);

							if (!isValidPassword) {
								resolve({
									success: false,
									error: 'Invalid credentials'
								});
								return;
							}

							resolve({
								success: true,
								data: {
									isAdmin: false,
									user: {
										username: row.username,
										firstName: row.first_name,
										lastName: row.last_name,
										uniqueId: row.unique_id,
										createdAt: row.created_at
									}
								}
							});
						} catch (compareError) {
							console.error('Password comparison error:', compareError);
							resolve({
								success: false,
								error: 'Authentication failed'
							});
						}
					}
				);
			});
		} catch (error) {
			console.error('Login method error:', error);
			return {
				success: false,
				error: 'Authentication failed'
			};
		}
	}

	// Get all active sessions for admin
	async getAllActiveSessions() {
		try {
			return new Promise((resolve, reject) => {
				// First check if test_site column exists
				this.dbManager.db.get("PRAGMA table_info(sessions)", [], (pragmaErr, pragmaResult) => {
					let hasTestSiteColumn = false;
					
					this.dbManager.db.all("PRAGMA table_info(sessions)", [], (err, columns) => {
						if (!err) {
							hasTestSiteColumn = columns.some(col => col.name === 'test_site');
						}
						
						// Build query based on column existence
						const siteSelect = hasTestSiteColumn ? 's.test_site as testSite,' : '';
						
						this.dbManager.db.all(
							`SELECT 
								s.session_id as sessionId,
								s.test_type as testType,
								${siteSelect}
								s.score,
								s.feedback,
								s.created_at as createdAt,
								s.completed_at as completedAt,
								u.username,
								u.first_name as firstName,
								u.last_name as lastName,
								u.unique_id as uniqueId,
								CASE WHEN s.score IS NOT NULL THEN 1 ELSE 0 END as hasScore
							FROM ${constants.DATABASE.TABLES.SESSIONS} s
							LEFT JOIN ${constants.DATABASE.TABLES.USERS} u ON s.user_id = u.id
							ORDER BY s.created_at DESC`,
							[],
							(err, rows) => {
								if (err) {
									console.error('Database error getting sessions:', err);
									reject(new Error('Failed to get sessions'));
									return;
								}

								const sessions = rows.map(row => ({
									sessionId: row.sessionId,
									testType: row.testType,
									testSite: row.testSite || 'Unknown', // Safe fallback
									score: row.score,
									feedback: row.feedback,
									createdAt: row.createdAt,
									completedAt: row.completedAt,
									hasScore: row.hasScore === 1,
									user: row.username ? {
										username: row.username,
										firstName: row.firstName,
										lastName: row.lastName,
										uniqueId: row.uniqueId
									} : null
								}));

								resolve({
									success: true,
									data: { sessions }
								});
							}
						);
					});
				});
			});
		} catch (error) {
			console.error('Get sessions error:', error);
			return {
				success: false,
				error: error.message
			};
		}
	}

	// Submit score for specific session
	async submitScoreToUser(sessionId, score, feedback) {
		try {
			const result = await this.saveScore({
				sessionId,
				score: parseFloat(score),
				feedback
			});
			return result;
		} catch (error) {
			return {
				success: false,
				error: error.message
			};
		}
	}

	// Delete session
	async deleteSession(sessionId) {
		try {
			const result = await this.dbManager.deleteSession(sessionId);
			return result;
		} catch (error) {
			return {
				success: false,
				error: error.message
			};
		}
	}
}

module.exports = UserService; 