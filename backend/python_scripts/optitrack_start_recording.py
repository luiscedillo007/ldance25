#!/usr/bin/env python3
from NatNetClient import NatNetClient
import time
import os, socket
import warnings
import sys
import json

# Suppress all warnings
warnings.filterwarnings("ignore")

# Read configuration from stdin
raw = sys.stdin.read() or "{}"
cfg = json.loads(raw)

SERVER_IP = cfg.get("server_ip")
USE_MULTICAST = cfg.get("use_multicast", True)

def infer_local_ip(server_ip: str) -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect((server_ip, 1511))
        return s.getsockname()[0]
    finally:
        s.close()

CLIENT_IP = infer_local_ip(SERVER_IP)
if not SERVER_IP:
    raise RuntimeError("Missing OPTITRACK_SERVER_IP")


if not SERVER_IP or not CLIENT_IP:
    raise RuntimeError("Missing OPTITRACK_SERVER_IP or OPTITRACK_CLIENT_IP in environment")

# Create client
client = NatNetClient()
client.set_server_address(SERVER_IP)
client.set_client_address(CLIENT_IP)
client.set_use_multicast(USE_MULTICAST)

# Connect and start
if client.run('c'):  # Command stream only
    time.sleep(1)  # Wait for connection
    client.send_command("StartRecording")
    time.sleep(1)  # Wait for command to process
    client.shutdown()
    print("Recording started")
else:
    print("Failed to connect")