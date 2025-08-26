# optitrack_wrapper.py - Wrapper that ignores Unicode errors completely
import json
import sys
import time
import socket
import os
import warnings

# Suppress all warnings
warnings.filterwarnings("ignore")

# Read configuration from stdin
raw = sys.stdin.read() or "{}"
cfg = json.loads(raw)

SERVER_IP = cfg.get("server_ip")
USE_MULTICAST = cfg.get("use_multicast", True)

if not SERVER_IP:
    print(json.dumps({"type":"error","message":"Missing server_ip"}), file=sys.stderr)
    sys.exit(1)

# Infer local IP
def infer_local_ip(server_ip):
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect((server_ip, 1511))
        return s.getsockname()[0]
    finally:
        s.close()

CLIENT_IP = infer_local_ip(SERVER_IP)

print(json.dumps({"type":"status","message":"Starting","server_ip":SERVER_IP}), file=sys.stderr)

# Import NatNetClient after setting up error handling
try:
    # Redirect stderr to suppress Unicode errors during import and setup
    stderr_backup = sys.stderr
    with open(os.devnull, 'w') as devnull:
        sys.stderr = devnull
        from NatNetClient import NatNetClient
    sys.stderr = stderr_backup
except Exception as e:
    print(json.dumps({"type":"error","message":f"Failed to import NatNetClient: {str(e)}"}), file=sys.stderr)
    sys.exit(1)

# Global variable to track if we've received data
data_received = False

# This is the rigid body callback
def receive_rigid_body_frame(rigid_body_id, position, rotation):
    global data_received
    if rigid_body_id is not None and position is not None and rotation is not None:
        data_received = True
        payload = {
            "id": int(rigid_body_id),
            "pos": {"x": float(position[0]), "y": float(position[1]), "z": float(position[2])},
            "rot": {"x": float(rotation[0]), "y": float(rotation[1]), "z": float(rotation[2]), "w": float(rotation[3])},
            "ts": time.time()
        }
        print(json.dumps(payload), flush=True)

# Suppress stderr completely during NatNetClient operations
stderr_backup = sys.stderr
sys.stderr = open(os.devnull, 'w')

try:
    # Create NatNet client
    streaming_client = NatNetClient()
    streaming_client.set_client_address(CLIENT_IP)
    streaming_client.set_server_address(SERVER_IP)
    streaming_client.set_use_multicast(USE_MULTICAST)
    
    # Set the rigid body callback
    streaming_client.rigid_body_listener = receive_rigid_body_frame
    
    # Suppress all debug output
    streaming_client.set_print_level(0)
    
    # Start the streaming client
    is_running = streaming_client.run('d')
    
    # Restore stderr for our messages
    sys.stderr.close()
    sys.stderr = stderr_backup
    
    if not is_running:
        print(json.dumps({"type":"error","message":"Could not start streaming client"}), file=sys.stderr)
        sys.exit(1)
    
    # Wait for connection
    time.sleep(2)
    
    print(json.dumps({"type":"status","message":"Connected"}), file=sys.stderr)
    
    # Suppress stderr again for the main loop
    sys.stderr = open(os.devnull, 'w')
    
    # Keep running
    try:
        while True:
            time.sleep(1/60)  # 60 FPS
    except KeyboardInterrupt:
        sys.stderr.close()
        sys.stderr = stderr_backup
        streaming_client.shutdown()
        print(json.dumps({"type":"status","message":"Disconnected"}), file=sys.stderr)

except Exception as e:
    sys.stderr.close()
    sys.stderr = stderr_backup
    print(json.dumps({"type":"error","message":f"Unexpected error: {str(e)}"}), file=sys.stderr)
    sys.exit(1) 