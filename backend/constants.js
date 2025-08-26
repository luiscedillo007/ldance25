// constants.js - Configuration values for the backend server
module.exports = {
	// Server Configuration
	PORT: 3000,
	
	// Database Configuration
	DATABASE: {
		PATH: "./database.sqlite",
		TABLES: {
			USERS: "users",
			SESSIONS: "sessions"
		}
	},
	
	// Password Configuration
	PASSWORD: {
		MIN_LENGTH: 6,
		REQUIRED_SPECIAL_CHARS: 1,
		REQUIRED_NUMBERS: 3,
		SALT_ROUNDS: 10
	},
	
	// Optitrack Configuration
	OPTITRACK: {
		SERVER_IP: "169.254.228.35", // Change this to your Optitrack server IP
		USE_MULTICAST: true,
		PYTHON_SCRIPT_PATH: "./python_scripts/optitrack_wrapper.py"
	},
	
	// API Endpoints
	API_ROUTES: {
		START_OPTITRACK: "/api/optitrack/start",
		STOP_OPTITRACK: "/api/optitrack/stop",
		STATUS: "/api/optitrack/status",
		DATA: "/api/optitrack/data",
		REGISTER: "/api/auth/register",
		LOGIN: "/api/auth/login"
	},
	
	// Admin Configuration
	ADMIN: {
		USERNAME: "admin",
		PASSWORD: "admin123" // Change this to a secure password
	}
};