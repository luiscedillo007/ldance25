// OptitrackManager.js - Handles starting, stopping, and managing the Python Optitrack script
const { spawn } = require('child_process');
const constants = require('./constants');

class OptitrackManager {
	constructor() {
		this.pythonProcess = null;
		this.isRunning = false;
		this.dataListeners = []; // Array to store functions that want to receive data
		this.statusListeners = []; // Array to store functions that want to receive status updates
		this.lastDataSent = 0; // Add this
		this.dataThrottleMs = 16; // ~60fps (1000ms/60 = 16ms)
	}

	// Add a listener for data updates
	addDataListener(callback) {
		this.dataListeners.push(callback);
	}

	// Add a listener for status updates
	addStatusListener(callback) {
		this.statusListeners.push(callback);
	}

	// Remove a data listener
	removeDataListener(callback) {
		this.dataListeners = this.dataListeners.filter(listener => listener !== callback);
	}

	// Remove a status listener
	removeStatusListener(callback) {
		this.statusListeners = this.statusListeners.filter(listener => listener !== callback);
	}

	// Start the Optitrack Python script
	async startOptitrack() {
		if (this.isRunning) {
			throw new Error("Optitrack is already running");
		}

		return new Promise((resolve, reject) => {
			try {
				// Configuration to send to Python script
				const config = {
					server_ip: constants.OPTITRACK.SERVER_IP,
					use_multicast: constants.OPTITRACK.USE_MULTICAST
				};

				// Spawn the Python process
				this.pythonProcess = spawn('python', ['-u', constants.OPTITRACK.PYTHON_SCRIPT_PATH], {
					cwd: __dirname // Run from the backend directory
				});

				// Send configuration to Python script via stdin
				this.pythonProcess.stdin.write(JSON.stringify(config));
				this.pythonProcess.stdin.end();

				// Handle data from Python script (stdout = tracking data)
				this.pythonProcess.stdout.on('data', (data) => {
					try {
						const lines = data.toString().split('\n').filter(line => line.trim());
						lines.forEach(line => {
							// Only try to parse lines that look like JSON (start with {)
							if (line.trim().startsWith('{')) {
								try {
									const trackingData = JSON.parse(line);
									
									// Throttle data to prevent overwhelming frontend
									const now = Date.now();
									if (now - this.lastDataSent >= this.dataThrottleMs) {
										this.dataListeners.forEach(callback => callback(trackingData));
										this.lastDataSent = now;
									}
								} catch (jsonError) {
									console.log('Non-JSON stdout:', line);
								}
							} else {
								// Log non-JSON stdout output (debug messages, etc.)
								// console.log('Python stdout:', line);  // Comment this out
							}
						});
					} catch (error) {
						console.error('Error handling stdout:', error);
					}
				});

				// Handle status messages from Python script (stderr = status messages)
				this.pythonProcess.stderr.on('data', (data) => {
					try {
						const lines = data.toString().split('\n').filter(line => line.trim());
						lines.forEach(line => {
							// Only try to parse lines that look like JSON (start with {)
							if (line.trim().startsWith('{')) {
								try {
									const statusMessage = JSON.parse(line);
									console.log('Optitrack Status:', statusMessage);
									
									// Send status to all listeners
									this.statusListeners.forEach(callback => callback(statusMessage));

									// If we get a "Connected" status, resolve the promise
									if (statusMessage.type === 'status' && statusMessage.message === 'Connected') {
										this.isRunning = true;
										resolve();
									}
								} catch (jsonError) {
									// console.log('Non-JSON stderr:', line); // Silenced
								}
							} else {
								// Log non-JSON stderr output (Python errors, debug info, etc.)
								// console.log('Python stderr:', line); // Comment out this line to silence Python stderr
							}
						});
					} catch (error) {
						console.error('Error handling stderr:', error);
					}
				});

				// Handle process exit
				this.pythonProcess.on('close', (code) => {
					console.log(`Optitrack process exited with code ${code}`);
					this.isRunning = false;
					this.pythonProcess = null;
					
					// Notify status listeners
					this.statusListeners.forEach(callback => 
						callback({ type: 'status', message: 'Disconnected', code })
					);
					
					// Auto-restart if it was running (crashed)
					if (code === null || code !== 0) {
						console.log('Process crashed, attempting restart in 2 seconds...');
						setTimeout(() => {
							if (!this.isRunning) {
								this.startOptitrack().catch(err => 
									console.error('Auto-restart failed:', err)
								);
							}
						}, 2000);
					}
				});

				// Handle process errors
				this.pythonProcess.on('error', (error) => {
					console.error('Failed to start Optitrack process:', error);
					this.isRunning = false;
					this.pythonProcess = null;
					reject(error);
				});

				// Set a timeout in case connection takes too long
				setTimeout(() => {
					if (!this.isRunning) {
						this.stopOptitrack();
						reject(new Error("Connection timeout - failed to connect to Optitrack server"));
					}
				}, 10000); // 10 second timeout

			} catch (error) {
				reject(error);
			}
		});
	}

	// Stop the Optitrack Python script
	stopOptitrack() {
		if (!this.isRunning || !this.pythonProcess) {
			return false;
		}

		try {
			// Send SIGTERM to gracefully stop the process
			this.pythonProcess.kill('SIGTERM');
			
			// If it doesn't stop in 5 seconds, force kill it
			setTimeout(() => {
				if (this.pythonProcess && !this.pythonProcess.killed) {
					this.pythonProcess.kill('SIGKILL');
				}
			}, 5000);

			this.isRunning = false;
			return true;
		} catch (error) {
			console.error('Error stopping Optitrack process:', error);
			return false;
		}
	}

	// Get current status
	getStatus() {
		return {
			isRunning: this.isRunning,
			processId: this.pythonProcess ? this.pythonProcess.pid : null
		};
	}

	// ONLY ADD THESE RECORDING METHODS - Don't change anything else above
	
	// Start recording
	async startRecording() {
		return new Promise((resolve, reject) => {
			try {
				const config = {
					server_ip: constants.OPTITRACK.SERVER_IP,
					use_multicast: constants.OPTITRACK.USE_MULTICAST
				};

				const recordingProcess = spawn('python', ['-u', './python_scripts/optitrack_start_recording.py'], {
					cwd: __dirname
				});

				recordingProcess.stdin.write(JSON.stringify(config));
				recordingProcess.stdin.end();

				recordingProcess.stdout.on('data', (data) => {
					const output = data.toString().trim();
					if (output.includes('Recording started')) {
						resolve(true);
					}
				});

				recordingProcess.on('close', (code) => {
					if (code === 0) resolve(true);
					else reject(new Error(`Start recording failed with code ${code}`));
				});

				recordingProcess.on('error', reject);

			} catch (error) {
				reject(error);
			}
		});
	}

	// Stop recording
	async stopRecording() {
		return new Promise((resolve, reject) => {
			try {
				const config = {
					server_ip: constants.OPTITRACK.SERVER_IP,
					use_multicast: constants.OPTITRACK.USE_MULTICAST
				};

				const recordingProcess = spawn('python', ['-u', './python_scripts/optitrack_stop_recording.py'], {
					cwd: __dirname
				});

				recordingProcess.stdin.write(JSON.stringify(config));
				recordingProcess.stdin.end();

				recordingProcess.stdout.on('data', (data) => {
					const output = data.toString().trim();
					if (output.includes('Recording stopped')) {
						resolve(true);
					}
				});

				recordingProcess.on('close', (code) => {
					if (code === 0) resolve(true);
					else reject(new Error(`Stop recording failed with code ${code}`));
				});

				recordingProcess.on('error', reject);

			} catch (error) {
				reject(error);
			}
		});
	}

	// Add this method to link sessions with test starts
	async createTestSession(sessionId, testType, testSite, userId = null) {
		try {
			const constants = require('./constants');
			const sqlite3 = require('sqlite3').verbose();
			
			return new Promise((resolve, reject) => {
				const db = new sqlite3.Database(constants.DATABASE.PATH, (err) => {
					if (err) {
						console.error('Failed to connect to database:', err);
						reject(err);
						return;
					}
					
					// First, get the user's database ID if userId is provided
					if (userId && userId !== 'admin') {
						db.get(
							`SELECT id FROM ${constants.DATABASE.TABLES.USERS} WHERE unique_id = ?`,
							[userId],
							(userErr, userRow) => {
								if (userErr) {
									console.error('Failed to find user:', userErr);
									// Continue without user link
									insertSession(null);
									return;
								}
								
								const dbUserId = userRow ? userRow.id : null;
								insertSession(dbUserId);
							}
						);
					} else {
						insertSession(null);
					}
					
					function insertSession(dbUserId) {
						// First try with test_site column
						db.run(
							`INSERT OR IGNORE INTO ${constants.DATABASE.TABLES.SESSIONS} (session_id, test_type, test_site, user_id) VALUES (?, ?, ?, ?)`,
							[sessionId, testType, testSite, dbUserId],
							function(err) {
								if (err && err.message.includes('no column named test_site')) {
									// Fallback to old schema without test_site
									console.log('Using old database schema (no test_site column)');
									db.run(
										`INSERT OR IGNORE INTO ${constants.DATABASE.TABLES.SESSIONS} (session_id, test_type, user_id) VALUES (?, ?, ?)`,
										[sessionId, testType, dbUserId],
										function(fallbackErr) {
											if (fallbackErr) {
												console.error('Failed to create session (fallback):', fallbackErr);
												reject(fallbackErr);
											} else {
												console.log('✅ Session created (old schema):', sessionId, testType, dbUserId ? `(User ID: ${dbUserId})` : '(Anonymous)');
												resolve({ success: true });
											}
											db.close();
										}
									);
								} else if (err) {
									console.error('Failed to create session:', err);
									reject(err);
									db.close();
								} else {
									console.log('✅ Session created:', sessionId, testType, testSite, dbUserId ? `(User ID: ${dbUserId})` : '(Anonymous)');
									resolve({ success: true });
									db.close();
								}
							}
						);
					}
				});
			});
		} catch (error) {
			console.error('Session creation error:', error);
			throw error;
		}
	}
}

module.exports = OptitrackManager;