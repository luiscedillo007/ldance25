// constants.ts - Frontend configuration constants
export const API_CONFIG = {
	BASE_URL: 'http://localhost:3000',
	WEBSOCKET_URL: 'http://localhost:3000',
	FRONTEND_PORT: 5173, 
	ENDPOINTS: {
		START_OPTITRACK: '/api/optitrack/start',
		STOP_OPTITRACK: '/api/optitrack/stop',
		STATUS: '/api/optitrack/status',
		START_RECORDING: '/api/optitrack/start-recording',
		STOP_RECORDING: '/api/optitrack/stop-recording',
		REGISTER: '/api/auth/register', // Add this
		LOGIN: '/api/auth/login', // Add this for future use
		VERIFY_ACCOUNT: '/api/auth/verify-account', // Add this
		RESET_PASSWORD: '/api/auth/reset-password', // Add this
		GENERATE_KML: '/api/generate-kml' // Add this
	}
};

export const VISUALIZATION = {
	// 2D plane boundaries (-6 to 6 for both X and Y)
	MIN_X: -6,
	MAX_X: 6,
	MIN_Y: -6,
	MAX_Y: 6,
	
	// Canvas/SVG dimensions
	CANVAS_WIDTH: 600,
	CANVAS_HEIGHT: 600,
	
	// Grid settings
	GRID_STEP: 1, // Grid line every 1 unit
	SHOW_GRID: true,
	SHOW_ORIGIN: true,
	
	// Point visualization
	POINT_RADIUS: 6,
	POINT_COLOR: '#3B82F6', // Blue color
	TRAIL_LENGTH: 10, // Reduced for better performance
	UPDATE_FREQUENCY: 60,
	
	// Axis inversion - Added
	INVERT_X_AXIS: true, // If true: negative X = right, positive X = left
	INVERT_Y_AXIS: true, // If true: positive Y = down, negative Y = up
	
	// Safe Region
	SAFE_REGION: {
		ENABLED: true,
		MIN_X: -4,
		MAX_X: 4,
		MIN_Y: -4,
		MAX_Y: 4,
		OPACITY: 0.2, // Low opacity for overlay
		COLOR: '#10B981' // Green color
	},
	
	// Test Region
	TEST_REGION: {
		ENABLED: true,
		MIN_X: -Infinity,
		MAX_X: Infinity,
		MIN_Y: 3,
		MAX_Y: Infinity,
		MIN_Z: 1,
		MAX_Z: Infinity,
		OPACITY: 0.15, // Low opacity
		COLOR: '#F97316' // Orange color
	},
	
	// Colors
	COLORS: {
		BACKGROUND: '#FFFFFF',
		GRID_LINES: '#E5E7EB',
		AXIS_LINES: '#9CA3AF',
		ORIGIN: '#EF4444',
		POINT: '#3B82F6',
		TRAIL: '#93C5FD'
	}
};

export const UI_CONFIG = {
	BUTTONS: {
		START: {
			TEXT: 'Start Optitrack',
			COLOR: 'bg-green-500 hover:bg-green-600',
			TEXT_COLOR: 'text-white'
		},
		STOP: {
			TEXT: 'Stop Optitrack',
			COLOR: 'bg-red-500 hover:bg-red-600',
			TEXT_COLOR: 'text-white'
		},
		DISABLED: {
			COLOR: 'bg-gray-400',
			TEXT_COLOR: 'text-gray-200'
		}
	},
	
	STATUS_COLORS: {
		CONNECTED: 'text-green-600',
		DISCONNECTED: 'text-red-600',
		CONNECTING: 'text-yellow-600',
		ERROR: 'text-red-600'
	}
};

export const OPTITRACK_CONFIG = {
	// Data update frequency
	UPDATE_FREQUENCY: 60, // Hz
	
	// Connection settings
	RECONNECT_ATTEMPTS: 3,
	RECONNECT_DELAY: 2000, // ms
	
	// Data filtering (optional)
	POSITION_SMOOTHING: false,
	ROTATION_SMOOTHING: false
};

export const TEST_TYPES = {
	AVAILABLE_TYPES: [
		{ id: 'wind_test', name: 'Wind Test', description: 'Aerodynamic performance testing' },
		{ id: 'battery_test', name: 'Battery Test', description: 'Power consumption analysis' },
		{ id: 'stability_test', name: 'Stability Test', description: 'Flight stability evaluation' },
		{ id: 'other', name: 'Other', description: 'Custom test configuration' }
	]
};

// Add password validation constants
export const PASSWORD_VALIDATION = {
	MIN_LENGTH: 6,
	REQUIRED_SPECIAL_CHARS: 1,
	REQUIRED_NUMBERS: 3,
	SPECIAL_CHAR_PATTERN: /[!@#$%^&*(),.?":{}|<>]/,
	NUMBER_PATTERN: /\d/g
};

// Add to existing constants
export const NAVIGATION = {
	ROUTES: {
		HOME: '/',
		DASHBOARD: '/dashboard',
		ADMIN: '/admin',
		REGISTER: '/register',
		RECOVERY: '/recovery',
		GENERATE: '/generate' // Add this
	},
	LABELS: {
		LOGOUT: 'Logout',
		ADMIN_PORTAL: 'Admin Portal',
		USER_DASHBOARD: 'User Dashboard',
		GENERATE_KML: 'Generate KML' // Add this
	}
};

// Add KML generation constants
export const KML_CONFIG = {
	DEFAULT_VALUES: {
		LAT0: 31.7679293,
		LON0: -106.5075332,
		GROUND_MSL: 1163.0,
		HEADING_TRUE_DEG: 0.0
	},
	LOCAL_XY_MODES: [
		{ value: 'east', label: 'East' },
		{ value: 'north', label: 'North' },
		{ value: 'heading', label: 'Heading' }
	] as const
};

// Add site selection constants
export const SITE_CONFIG = {
	AVAILABLE_SITES: [
		{ id: 'UTEP', name: 'UTEP' },
		{ id: 'ND', name: 'ND' },
		{ id: 'OTHER', name: 'OTHER' }
	]
};
