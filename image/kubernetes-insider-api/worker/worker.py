#!/usr/venv/bin/python
import socket
import os
import subprocess
import time
import requests

SERVER_ADDRESS = "/tmp/my_server"

kubectl_process = None

# Make sure the socket does not already exist
try:
    os.unlink(SERVER_ADDRESS)
except OSError:
    if os.path.exists(SERVER_ADDRESS):
        raise

def check_port(port, host='127.0.0.1', timeout=0.5):
    # Try to make a HTTP HEAD request to the given host and port
    try:
        response = requests.head(f'http://{host}:{port}', timeout=timeout)
        return response.status_code < 500  # Check if we get a 2xx, 3xx or 4xx status code
    except requests.RequestException:
        return False

server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)

server.bind(SERVER_ADDRESS)

server.listen(1)

while True:
    connection, client_address = server.accept()
    try:
        data = connection.recv(1024)
        if data:
            if kubectl_process:
                kubectl_process.kill()
            command = data.decode('utf-8').split()
            kubectl_process = subprocess.Popen(command)
            # Check every 0.1, 0.2, 0.3, 0.4, and repeat 0.5 seconds if a process is listening on port 8001
            total_time = 0
            sleep_duration = 0.1
            # Check for up to 3 seconds
            while total_time < 3:
                if check_port(8001, timeout=sleep_duration):
                    connection.sendall(b"Process started")
                    break
                time.sleep(sleep_duration)
                total_time += sleep_duration
                sleep_duration = min(0.5, sleep_duration + 0.1)
            else:
                connection.sendall(b"Process failed")
    finally:
        connection.close()
