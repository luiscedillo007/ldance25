// server.js - Main Express server that handles API routes and WebSocket connections
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process'); // Added for recording scripts

const constants = require('./constants');
const OptitrackManager = require('./optitrackManager');
const UserService = require('./UserService');

class Server {
	constructor() {
		this.app = express();
		this.server = http.createServer(this.app);
		this.io = socketIo(this.server, {
			cors: {
				origin: "*", // Allow all origins for development
				methods: ["GET", "POST"]
			}
		});
		
		this.optitrackManager = new OptitrackManager();
		this.userService = new UserService(); // Add this line
		this.setupMiddleware();
		this.setupRoutes();
		this.setupWebSocket();
	}

	// Setup Express middleware
	setupMiddleware() {
		this.app.use(cors());
		this.app.use(express.json());
		this.app.use(express.static('public')); // Serve static files if needed
	}

	// Setup API routes
	setupRoutes() {
		// Health check route
		this.app.get('/api/health', (req, res) => {
			res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
		});

		// Start Optitrack route
		this.app.post(constants.API_ROUTES.START_OPTITRACK, async (req, res) => {
			try {
				console.log('Starting Optitrack...');
				await this.optitrackManager.startOptitrack();
				res.json({ 
					success: true, 
					message: 'Optitrack started successfully',
					status: this.optitrackManager.getStatus()
				});
			} catch (error) {
				console.error('Failed to start Optitrack:', error);
				res.status(500).json({ 
					success: false, 
					message: error.message || 'Failed to start Optitrack' 
				});
			}
		});

		// Stop Optitrack route
		this.app.post(constants.API_ROUTES.STOP_OPTITRACK, (req, res) => {
			try {
				console.log('Stopping Optitrack...');
				this.optitrackManager.disableAutoRestart(); // Disable watchdog
				const stopped = this.optitrackManager.stopOptitrack();
				if (stopped) {
					res.json({ 
						success: true, 
						message: 'Optitrack stopped successfully',
						status: this.optitrackManager.getStatus()
					});
				} else {
					res.json({ 
						success: false, 
						message: 'Optitrack was not running',
						status: this.optitrackManager.getStatus()
					});
				}
			} catch (error) {
				console.error('Failed to stop Optitrack:', error);
				res.status(500).json({ 
					success: false, 
					message: error.message || 'Failed to stop Optitrack' 
				});
			}
		});

		// Get status route
		this.app.get(constants.API_ROUTES.STATUS, (req, res) => {
			res.json({
				success: true,
				status: this.optitrackManager.getStatus()
			});
		});

		// Start recording route
		this.app.post('/api/optitrack/start-recording', async (req, res) => {
			try {
				console.log('Starting Optitrack recording...');
				await this.optitrackManager.startRecording();
				res.json({ 
					success: true, 
					message: 'Recording started successfully'
				});
			} catch (error) {
				console.error('Failed to start recording:', error);
				res.status(500).json({ 
					success: false, 
					message: error.message || 'Failed to start recording' 
				});
			}
		});

		// Stop recording route
		this.app.post('/api/optitrack/stop-recording', async (req, res) => {
			try {
				console.log('Stopping Optitrack recording...');
				await this.optitrackManager.stopRecording();
				res.json({ 
					success: true, 
					message: 'Recording stopped successfully'
				});
			} catch (error) {
				console.error('Failed to stop recording:', error);
				res.status(500).json({ 
					success: false, 
					message: error.message || 'Failed to stop recording' 
				});
			}
		});

		// Add after existing routes

		// Get network IP for admin link
		this.app.get('/api/network-info', (req, res) => {
			const os = require('os');
			const networkInterfaces = os.networkInterfaces();
			let ip = 'localhost';
			
			// Find the first non-internal IPv4 address
			for (const name of Object.keys(networkInterfaces)) {
				for (const net of networkInterfaces[name]) {
					if (net.family === 'IPv4' && !net.internal) {
						ip = net.address;
						break;
					}
				}
				if (ip !== 'localhost') break;
			}
			
			res.json({ ip });
		});

		// Authentication routes
		this.app.post(constants.API_ROUTES.REGISTER, async (req, res) => {
			try {
				const { firstName, lastName, username, password } = req.body;
				
				if (!firstName || !lastName || !username || !password) {
					return res.status(400).json({
						success: false,
						error: 'All fields are required'
					});
				}

				const result = await this.userService.register({
					firstName,
					lastName,
					username,
					password
				});

				if (result.success) {
					res.status(201).json(result);
				} else {
					res.status(400).json(result);
				}
			} catch (error) {
				console.error('Registration error:', error);
				res.status(500).json({
					success: false,
					error: 'Internal server error'
				});
			}
		});

		// Add this route to create sessions when tests start

		this.app.post('/api/admin/create-session', async (req, res) => {
			try {
				const { sessionId, testType, testSite, userId } = req.body; // Add testSite
				
				if (!sessionId || !testType || !testSite) {
					return res.status(400).json({
						success: false,
						error: 'Session ID, test type, and test site are required'
					});
				}

				// Create session in database with site and user ID
				await this.optitrackManager.createTestSession(sessionId, testType, testSite, userId);
				
				res.json({ success: true });
			} catch (error) {
				console.error('Session creation error:', error);
				res.status(500).json({
					success: false,
					error: 'Failed to create session'
				});
			}
		});

		// Get all sessions route
		this.app.get('/api/admin/sessions', async (req, res) => {
			try {
				const result = await this.userService.getAllActiveSessions();
				
				if (result.success) {
					res.json(result);
				} else {
					res.status(500).json(result);
				}
			} catch (error) {
				console.error('Get sessions error:', error);
				res.status(500).json({
					success: false,
					error: 'Internal server error'
				});
			}
		});

		// Submit score to specific user
		this.app.post('/api/admin/submit-score', async (req, res) => {
			try {
				const { score, feedback, sessionId } = req.body;
				
				if (!score || !sessionId) {
					return res.status(400).json({
						success: false,
						error: 'Score and session ID are required'
					});
				}

				const result = await this.userService.submitScoreToUser(sessionId, score, feedback);

				if (result.success) {
					// Emit score to the specific session
					this.io.emit('score-received', {
						sessionId,
						score: parseFloat(score),
						feedback: feedback || ''
					});

					res.json({ success: true });
				} else {
					res.status(400).json(result);
				}
			} catch (error) {
				console.error('Score submission error:', error);
				res.status(500).json({
					success: false,
					error: 'Failed to save score'
				});
			}
		});

		// Delete session route
		this.app.delete('/api/admin/sessions/:sessionId', async (req, res) => {
			try {
				const { sessionId } = req.params;
				
				if (!sessionId) {
					return res.status(400).json({
						success: false,
						error: 'Session ID is required'
					});
				}

				const result = await this.userService.deleteSession(sessionId);

				if (result.success) {
					res.json({ success: true });
				} else {
					res.status(400).json(result);
				}
			} catch (error) {
				console.error('Session deletion error:', error);
				res.status(500).json({
					success: false,
					error: 'Failed to delete session'
				});
			}
		});

		// Account verification route
		this.app.post('/api/auth/verify-account', async (req, res) => {
			try {
				const { accountId } = req.body;
				
				if (!accountId) {
					return res.status(400).json({
						success: false,
						error: 'Account ID is required'
					});
				}

				const result = await this.userService.verifyAccount(accountId);
				
				if (result.success) {
					res.json(result);
				} else {
					res.status(404).json(result);
				}
			} catch (error) {
				console.error('Account verification error:', error);
				res.status(500).json({
					success: false,
					error: 'Internal server error'
				});
			}
		});

		// Password reset route
		this.app.post('/api/auth/reset-password', async (req, res) => {
			try {
				const { accountId, newPassword } = req.body;
				
				if (!accountId || !newPassword) {
					return res.status(400).json({
						success: false,
						error: 'Account ID and new password are required'
					});
				}

				const result = await this.userService.resetPassword(accountId, newPassword);
				
				if (result.success) {
					res.json(result);
				} else {
					res.status(400).json(result);
				}
			} catch (error) {
				console.error('Password reset error:', error);
				res.status(500).json({
					success: false,
					error: 'Internal server error'
				});
			}
		});

		// Login route
		this.app.post(constants.API_ROUTES.LOGIN, async (req, res) => {
			try {
				const { username, password } = req.body;
				
				if (!username || !password) {
					return res.status(400).json({
						success: false,
						error: 'Username and password are required'
					});
				}

				const result = await this.userService.login({
					username,
					password
				});

				if (result.success) {
					res.json(result);
				} else {
					res.status(401).json(result);
				}
			} catch (error) {
				console.error('Login error:', error);
				res.status(500).json({
					success: false,
					error: 'Internal server error'
				});
			}
		});

		// KML and Plan Generation route (updated)
		this.app.post('/api/generate-kml', async (req, res) => {
			try {
				const { lat0, lon0, ground_msl, local_xy_mode, heading_true_deg, testType } = req.body;
				
				// Validate required fields
				if (lat0 === undefined || lon0 === undefined || ground_msl === undefined) {
					return res.status(400).json({
						success: false,
						error: 'Latitude, longitude, and ground MSL are required'
					});
				}

				// Prepare data for Python script
				const pythonInput = {
					lat0: parseFloat(lat0),
					lon0: parseFloat(lon0),
					ground_msl: parseFloat(ground_msl),
					local_xy_mode: local_xy_mode || 'east',
					heading_true_deg: parseFloat(heading_true_deg) || 0.0,
					testType: testType || ''
				};

				// Spawn Python script (updated to use new script)
				const { spawn } = require('child_process');
				const pythonProcess = spawn('python', ['-u', './python_scripts/generate_kml_and_plan_api.py'], {
					stdio: ['pipe', 'pipe', 'pipe']
				});

				// Send input to Python script
				pythonProcess.stdin.write(JSON.stringify(pythonInput));
				pythonProcess.stdin.end();

				let outputData = '';
				let errorData = '';

				pythonProcess.stdout.on('data', (data) => {
					outputData += data.toString();
				});

				pythonProcess.stderr.on('data', (data) => {
					errorData += data.toString();
				});

				pythonProcess.on('close', (code) => {
					if (code !== 0) {
						console.error('Python script error:', errorData);
						return res.status(500).json({
							success: false,
							error: 'Failed to generate KML and Plan files'
						});
					}

					try {
						const result = JSON.parse(outputData.trim());
						res.json(result);
					} catch (parseError) {
						console.error('Failed to parse Python output:', parseError);
						res.status(500).json({
							success: false,
							error: 'Invalid response from KML/Plan generator'
						});
					}
				});

				// Handle process errors
				pythonProcess.on('error', (error) => {
					console.error('Failed to start Python process:', error);
					res.status(500).json({
						success: false,
						error: 'Failed to start KML/Plan generation process'
					});
				});

			} catch (error) {
				console.error('KML/Plan generation error:', error);
				res.status(500).json({
					success: false,
					error: 'Internal server error'
				});
			}
		});
	}

	// Setup WebSocket for real-time data streaming
	setupWebSocket() {
		this.io.on('connection', (socket) => {
			console.log('Client connected:', socket.id);

			// Send current status when client connects
			socket.emit('status', this.optitrackManager.getStatus());

			// Create listeners for this specific socket
			const dataListener = (data) => {
				socket.emit('optitrack-data', data);
			};

			const statusListener = (status) => {
				socket.emit('optitrack-status', status);
			};

			// Add listeners
			this.optitrackManager.addDataListener(dataListener);
			this.optitrackManager.addStatusListener(statusListener);

			// Handle client disconnect
			socket.on('disconnect', () => {
				console.log('Client disconnected:', socket.id);
				
				try {
					// Remove listeners when client disconnects
					if (this.optitrackManager && typeof this.optitrackManager.removeDataListener === 'function') {
						this.optitrackManager.removeDataListener(dataListener);
					}
					if (this.optitrackManager && typeof this.optitrackManager.removeStatusListener === 'function') {
						this.optitrackManager.removeStatusListener(statusListener);
					}
					
					// Disable auto-restart when client disconnects
					if (this.optitrackManager && typeof this.optitrackManager.disableAutoRestart === 'function') {
						this.optitrackManager.disableAutoRestart();
					}
				} catch (error) {
					console.error('Error during client disconnect cleanup:', error);
				}
			});

			// Handle start request from client
			socket.on('start-optitrack', async () => {
				try {
					await this.optitrackManager.startOptitrack();
					socket.emit('optitrack-status', { 
						type: 'success', 
						message: 'Optitrack started successfully' 
					});
				} catch (error) {
					socket.emit('optitrack-status', { 
						type: 'error', 
						message: error.message 
					});
				}
			});

			// Handle stop request from client
			socket.on('stop-optitrack', () => {
				const stopped = this.optitrackManager.stopOptitrack();
				socket.emit('optitrack-status', { 
					type: 'success', 
					message: stopped ? 'Optitrack stopped' : 'Optitrack was not running' 
				});
			});
		});
	}

	// Start the server
	start() {
		this.server.listen(constants.PORT, '0.0.0.0', () => {
			console.log(`🚀 Server running on http://0.0.0.0:${constants.PORT}`);
			console.log(`📡 WebSocket server ready for real-time data`);
			console.log(`🎯 Optitrack Server IP: ${constants.OPTITRACK.SERVER_IP}`);
			
			// Show network access info
			const os = require('os');
			const networkInterfaces = os.networkInterfaces();
			for (const name of Object.keys(networkInterfaces)) {
				for (const net of networkInterfaces[name]) {
					if (net.family === 'IPv4' && !net.internal) {
						console.log(`🌐 Network access: http://${net.address}:${constants.PORT}`);
						break;
					}
				}
			}
		});

		// Graceful shutdown
		process.on('SIGINT', () => {
			console.log('\n🛑 Shutting down server...');
			this.optitrackManager.stopOptitrack();
			this.server.close(() => {
				console.log('✅ Server shut down gracefully');
				process.exit(0);
			});
		});
	}
}

// Create and start the server
const server = new Server();
server.start();
