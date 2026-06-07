import requests
import time
import subprocess
import threading

def run_server():
    subprocess.run(['node', 'server.js'], cwd='backend')

# Start server in background
t = threading.Thread(target=run_server)
t.daemon = True
t.start()

time.sleep(3)

try:
    print("Sending POST request to /api/asia/login")
    response = requests.post("http://localhost:3001/api/asia/login", json={"username": "x", "password": "y"})
    print("Status Code:", response.status_code)
    print("Headers:", response.headers)
    print("Response text:", response.text)
except Exception as e:
    print("Exception:", e)

# Kill node
subprocess.run(['taskkill', '/F', '/IM', 'node.exe'])
