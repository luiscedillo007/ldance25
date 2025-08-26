// OptitrackClient.ts - Handles WebSocket connection and API calls to backend
import { io, type Socket } from 'socket.io-client';
import { writable, type Writable, get } from 'svelte/store';
import { API_CONFIG, OPTITRACK_CONFIG, VISUALIZATION } from './constants';
import { browser } from '$app/environment';
import { loggedInUser } from './stores/userStore';

export interface TrackingData {
	id: number;
	pos: { x: number; y: number; z: number };
	rot: { x: number; y: number; z: number; w: number };
	ts: number;
}

export interface StatusMessage {
	type: 'status' | 'error' | 'success';
	message: string;
	code?: number;
}

export interface ConnectionStatus {
	isConnected: boolean;
	isOptitrackRunning: boolean;
	lastUpdate?: number;
	error?: string;
	autoReconnecting?: boolean;
	isInTestRegion?: boolean;
	testState?: 'standby' | 'started' | 'waiting_to_stop' | 'can_stop';
}

// Add new interface for test completion
export interface TestCompletionStatus {
	isTestCompleted: boolean;
	completedAt?: number;
	testType?: string;
	sessionId?: string; // Add this line
}

class OptitrackClient {
	private socket: Socket | null = null;
	private reconnectAttempts = 0;
	private reconnectTimer: number | null = null;
	private dataTimeoutTimer: number | null = null;
	private autoReconnectEnabled = true;
	private dataTimeoutMs = 3000;
	private dataFrameCount = 0;

	// Test state - simple version
	private testState: 'standby' | 'started' | 'waiting_to_stop' | 'can_stop' = 'standby';
	private testExitTimer: number | null = null;
	private testExitDelayMs = 5000;
	private testCompleted = false; // Prevent auto-restart after completion

	// Svelte stores for reactive data
	public trackingData: Writable<TrackingData[]> = writable([]);
	public connectionStatus: Writable<ConnectionStatus> = writable({
		isConnected: false,
		isOptitrackRunning: false
	});
	public statusMessages: Writable<StatusMessage[]> = writable([]);
	public dataFlowStatus: Writable<{ isReceivingData: boolean; frameCount: number }> = writable({
		isReceivingData: false,
		frameCount: 0
	});

	// Add test completion store
	public testCompletion: Writable<TestCompletionStatus> = writable({
		isTestCompleted: false
	});

	// Add property to store current test type
	private currentTestType: string = '';

	// Add property to store current site
	private currentSite: string = '';

	constructor() {
		if (browser) {
			this.connect();
		}
	}

	private connect() {
		console.log('Connecting to WebSocket server...');

		this.socket = io(API_CONFIG.WEBSOCKET_URL, {
			transports: ['websocket', 'polling'],
			timeout: 5000
		});

		this.setupSocketListeners();
	}

	private setupSocketListeners() {
		if (!this.socket) return;

		this.socket.on('connect', () => {
			console.log('✅ Connected to server');
			this.reconnectAttempts = 0;
			this.updateConnectionStatus({ isConnected: true });
		});

		this.socket.on('disconnect', (reason: string) => {
			console.log('❌ Disconnected from server:', reason);
			this.updateConnectionStatus({
				isConnected: false,
				isOptitrackRunning: false,
				error: `Disconnected: ${reason}`
			});
			this.clearDataTimeout();
			this.handleReconnect();
		});

		this.socket.on('connect_error', (error: Error) => {
			console.error('Connection error:', error);
			this.updateConnectionStatus({
				isConnected: false,
				error: `Connection error: ${error.message}`
			});
			this.handleReconnect();
		});

		this.socket.on('optitrack-data', (data: TrackingData) => {
			this.handleTrackingData(data);
		});

		this.socket.on('optitrack-status', (status: StatusMessage) => {
			this.handleStatusMessage(status);
		});

		this.socket.on('status', (status: any) => {
			this.updateConnectionStatus({
				isConnected: true,
				isOptitrackRunning: status.isRunning
			});
		});

		this.socket.on('score-received', (data) => {
			console.log('Score received:', data);
			// This will be handled by ThankYou component directly
		});
	}

	// Simple test region check
	private isPositionInTestRegion(pos: { x: number; y: number; z: number }): boolean {
		const { MIN_X, MAX_X, MIN_Y, MAX_Y, MIN_Z, MAX_Z } = VISUALIZATION.TEST_REGION;

		const inX = (MIN_X === -Infinity || pos.x >= MIN_X) && (MAX_X === Infinity || pos.x <= MAX_X);
		const inY = (MIN_Y === -Infinity || pos.y >= MIN_Y) && (MAX_Y === Infinity || pos.y <= MAX_Y);
		const inZ = (MIN_Z === -Infinity || pos.z >= MIN_Z) && (MAX_Z === Infinity || pos.z <= MAX_Z);

		return inX && inY && inZ;
	}

	// Simple state machine - updated with completion lock
	private handleTestState(inTestRegion: boolean, testType?: string) {
		const previousState = this.testState;

		switch (this.testState) {
			case 'standby':
				// Only allow test start if not completed
				if (inTestRegion && !this.testCompleted) {
					this.testState = 'started';
					console.log('Test started - recording...');
					this.startRecording();
				}
				break;

			case 'started':
				if (!inTestRegion) {
					this.testState = 'waiting_to_stop';
					console.log('Left region - 5 second timer...');

					if (browser) {
						this.testExitTimer = setTimeout(() => {
							this.testState = 'can_stop';
							console.log('Can stop now - return to region');
						}, this.testExitDelayMs);
					}
				}
				break;

			case 'waiting_to_stop':
				if (inTestRegion) {
					if (this.testExitTimer) clearTimeout(this.testExitTimer);
					this.testExitTimer = null;
					this.testState = 'started';
					console.log('Returned - test continues');
				}
				break;

			case 'can_stop':
				if (inTestRegion) {
					this.testState = 'standby';
					this.testCompleted = true;
					console.log('Test stopped - recording stopped - auto-stopping tracking');
					this.stopRecording();
					
					// Trigger test completion with test type
					this.handleTestCompletion(testType || 'Unknown');
				}
				break;
		}

		if (previousState !== this.testState) {
			console.log(`State: ${previousState} → ${this.testState}`);
		}
	}

	private handleTrackingData(data: TrackingData) {
		this.dataFrameCount++;

		// Check test region
		const inTestRegion = VISUALIZATION.TEST_REGION.ENABLED && this.isPositionInTestRegion(data.pos);
		
		// Get current test type from somewhere accessible
		this.handleTestState(inTestRegion, this.currentTestType);

		this.dataFlowStatus.set({
			isReceivingData: true,
			frameCount: this.dataFrameCount
		});

		this.trackingData.update((currentData) => {
			const latestData = { ...data, ts: Date.now() };
			const newData = [...currentData, latestData];
			return newData.slice(-20);
		});

		this.connectionStatus.update((status) => ({
			...status,
			lastUpdate: Date.now(),
			isInTestRegion: inTestRegion,
			testState: this.testState
		}));

		this.resetDataTimeout();
	}

	// Recording methods
	async startRecording(): Promise<boolean> {
		try {
			const response = await fetch(
				`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.START_RECORDING}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' }
				}
			);
			const result = await response.json();
			if (result.success) {
				this.handleStatusMessage({ type: 'success', message: 'Recording started' });
				return true;
			}
			throw new Error(result.message);
		} catch (error) {
			console.error('Recording start failed:', error);
			return false;
		}
	}

	async stopRecording(): Promise<boolean> {
		try {
			const response = await fetch(
				`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STOP_RECORDING}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' }
				}
			);
			const result = await response.json();
			if (result.success) {
				this.handleStatusMessage({ type: 'success', message: 'Recording stopped' });
				return true;
			}
			throw new Error(result.message);
		} catch (error) {
			console.error('Recording stop failed:', error);
			return false;
		}
	}

	// Keep all the existing working methods...
	private resetDataTimeout() {
		this.clearDataTimeout();
		if (this.autoReconnectEnabled && browser) {
			this.dataTimeoutTimer = setTimeout(() => this.handleDataTimeout(), this.dataTimeoutMs);
		}
	}

	private clearDataTimeout() {
		if (this.dataTimeoutTimer && browser) {
			clearTimeout(this.dataTimeoutTimer);
			this.dataTimeoutTimer = null;
		}
	}

	private async handleDataTimeout() {
		this.dataFlowStatus.update((current) => ({ ...current, isReceivingData: false }));
		if (this.autoReconnectEnabled) {
			this.updateConnectionStatus({
				autoReconnecting: true,
				error: 'No data received, reconnecting...'
			});
			try {
				await this.stopOptitrack();
				await new Promise((resolve) => setTimeout(resolve, 2000));
				await this.startOptitrack();
				this.updateConnectionStatus({ autoReconnecting: false });
			} catch (error) {
				this.updateConnectionStatus({
					autoReconnecting: false,
					error: 'Auto-reconnect failed'
				});
			}
		}
	}

	private handleStatusMessage(status: StatusMessage) {
		this.statusMessages.update((messages) =>
			[...messages, { ...status, ts: Date.now() }].slice(-10)
		);
		if (status.type === 'status') {
			if (status.message === 'Connected') {
				this.updateConnectionStatus({ isOptitrackRunning: true });
				this.dataFlowStatus.set({ isReceivingData: false, frameCount: 0 });
				this.dataFrameCount = 0;
				this.resetDataTimeout();
			} else if (status.message === 'Disconnected') {
				this.updateConnectionStatus({ isOptitrackRunning: false });
				this.dataFlowStatus.set({
					isReceivingData: false,
					frameCount: this.dataFrameCount
				});
				this.clearDataTimeout();
			}
		}
	}

	private updateConnectionStatus(updates: Partial<ConnectionStatus>) {
		this.connectionStatus.update((current) => ({ ...current, ...updates }));
	}

	private handleReconnect() {
		if (this.reconnectAttempts >= OPTITRACK_CONFIG.RECONNECT_ATTEMPTS) return;
		this.reconnectAttempts++;
		if (browser) {
			this.reconnectTimer = setTimeout(
				() => this.connect(),
				OPTITRACK_CONFIG.RECONNECT_DELAY
			);
		}
	}

	// Also reset when starting tracking (for good measure)
	async startOptitrack(): Promise<boolean> {
		try {
			// Reset test completion flag when starting fresh
			this.testCompleted = false;
			this.testState = 'standby';
			this.testCompletion.set({ isTestCompleted: false }); // Reset completion

			const response = await fetch(
				`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.START_OPTITRACK}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' }
				}
			);
			const result = await response.json();
			if (result.success) {
				this.updateConnectionStatus({ isOptitrackRunning: true });
				return true;
			}
			throw new Error(result.message);
		} catch (error) {
			this.handleStatusMessage({
				type: 'error',
				message: error instanceof Error ? error.message : 'Failed to start'
			});
			return false;
		}
	}

	// Reset test completion flag when stopping tracking
	async stopOptitrack(): Promise<boolean> {
		try {
			const response = await fetch(
				`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STOP_OPTITRACK}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' }
				}
			);
			const result = await response.json();

			// Reset test state when stopping tracking
			this.testState = 'standby';
			this.testCompleted = false; // Reset the completion flag
			if (this.testExitTimer) {
				clearTimeout(this.testExitTimer);
				this.testExitTimer = null;
			}

			this.updateConnectionStatus({ isOptitrackRunning: false });
			this.clearDataTimeout();
			return result.success;
		} catch (error) {
			this.handleStatusMessage({
				type: 'error',
				message: error instanceof Error ? error.message : 'Failed to stop'
			});
			return false;
		}
	}

	clearData() {
		this.trackingData.set([]);
		this.dataFrameCount = 0;
		this.dataFlowStatus.update((current) => ({ ...current, frameCount: 0 }));
	}

	// Reset when disconnecting
	disconnect() {
		this.clearDataTimeout();
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
		if (this.testExitTimer) clearTimeout(this.testExitTimer);

		// Reset test state on disconnect
		this.testState = 'standby';
		this.testCompleted = false;

		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
		}
	}

	// Add this method to create session when test starts

	private async createSession(testType: string) {
		try {
			const sessionId = Date.now().toString();
			
			const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/create-session`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					sessionId,
					testType
				})
			});

			if (response.ok) {
				console.log('Session created:', sessionId);
				return sessionId;
			}
		} catch (error) {
			console.error('Failed to create session:', error);
		}
		
		return Date.now().toString(); // Fallback
	}

	// Update the handleTestCompletion method
	private async handleTestCompletion(testType: string) {
		try {
			this.testCompleted = true;
			await this.stopRecording();
			
			// Create session in database immediately
			const sessionId = Date.now().toString();
			
			// Get current user info
			const currentUser = get(loggedInUser);
			
			// Create session via direct API call with user and site info
			const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/create-session`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					sessionId,
					testType,
					testSite: this.currentSite || 'Unknown', // Fallback to Unknown
					userId: currentUser?.uniqueId || null
				})
			});

			if (response.ok) {
				console.log('✅ Session created successfully:', sessionId);
			} else {
				console.error('❌ Failed to create session');
			}
			
			// Update test completion status
			this.testCompletion.set({
				isTestCompleted: true,
				completedAt: Date.now(),
				testType,
				sessionId
			});

			// Stop tracking immediately when test completes
			setTimeout(async () => {
				await this.stopOptitrack();
			}, 500);
			
		} catch (error) {
			console.error('Test completion error:', error);
		}
	}

	// Add method to set site
	setSite(site: string) {
		this.currentSite = site;
	}

	// Add method to set test type
	setTestType(testType: string) {
		this.currentTestType = testType;
	}

	// Add method to completely reset state
	resetState() {
		// Stop any running processes first
		this.stopOptitrack();
		
		// Reset all state
		this.testState = 'standby';
		this.testCompleted = false;
		this.currentTestType = '';
		this.currentSite = '';
		this.dataFrameCount = 0;
		
		// Clear timers
		if (this.testExitTimer) {
			clearTimeout(this.testExitTimer);
			this.testExitTimer = null;
		}
		
		// Reset stores
		this.trackingData.set([]);
		this.connectionStatus.set({
			isConnected: false,
			isOptitrackRunning: false
		});
		this.statusMessages.set([]);
		this.dataFlowStatus.set({
			isReceivingData: false,
			frameCount: 0
		});
		this.testCompletion.set({
			isTestCompleted: false
		});
		
		// Disconnect and reconnect to ensure clean state
		this.disconnect();
		if (browser) {
			setTimeout(() => this.connect(), 500);
		}
		
		console.log('✅ OptitrackClient state reset');
	}
}

export const optitrackClient = new OptitrackClient();
