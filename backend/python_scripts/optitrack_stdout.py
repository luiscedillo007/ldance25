# optitrack_stdout.py
import json, sys, time, socket
from NatNetClient import NatNetClient

raw = sys.stdin.read() or "{}"
cfg = json.loads(raw)

SERVER_IP = cfg.get("server_ip")
USE_MULTICAST = bool(cfg.get("use_multicast", True))

if not SERVER_IP:
    print(json.dumps({"type":"error","message":"Missing server_ip"}), file=sys.stderr)
    sys.exit(1)

def infer_local_ip(server_ip):
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect((server_ip, 1511))
        return s.getsockname()[0]
    finally:
        s.close()

CLIENT_IP = infer_local_ip(SERVER_IP)

print(json.dumps({"type":"status","message":"Starting","server_ip":SERVER_IP}), file=sys.stderr)

def rigid_body_handler(rigid_body_id, position, rotation):
    payload = {
        "id": int(rigid_body_id),
        "pos": {"x": float(position[0]), "y": float(position[1]), "z": float(position[2])},
        "rot": {"x": float(rotation[0]), "y": float(rotation[1]), "z": float(rotation[2]), "w": float(rotation[3])},
        "ts": time.time()
    }
    print(json.dumps(payload), flush=True)

client = NatNetClient()
client.set_server_address(SERVER_IP)
client.set_client_address(CLIENT_IP)
client.set_use_multicast(USE_MULTICAST)
client.rigid_body_listener = rigid_body_handler
client.set_print_level(0)

if client.run('d'):
    time.sleep(0.5)
    print(json.dumps({"type":"status","message":"Connected"}), file=sys.stderr)
    try:
        while True:
            time.sleep(1/60)
    except KeyboardInterrupt:
        client.shutdown()
        print(json.dumps({"type":"status","message":"Disconnected"}), file=sys.stderr)
else:
    print(json.dumps({"type":"error","message":"Failed to connect"}), file=sys.stderr)
    sys.exit(1)
