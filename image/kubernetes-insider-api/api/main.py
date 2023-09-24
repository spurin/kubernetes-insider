from fastapi import FastAPI
from typing import Optional
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import socket
import subprocess
import json
from kubernetes import client, config
import os
import time
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache

# Create our api app
app = FastAPI()

# Configure CORS
origins = [
    "*",  # Allow any origin
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVER_ADDRESS = "/tmp/my_server"

class KubectlRequest(BaseModel):
    k8s_type: str
    target: str
    port: int
    namespace: str

# Configure cache
@app.on_event("startup")
async def startup():
    FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache:")

@app.post("/port_forward/")
async def port_forward(kubectl_request: KubectlRequest):
    command = ["kubectl", "--kubeconfig=/kubeconfig/config", f"--namespace={kubectl_request.namespace}", "port-forward", "--address=0.0.0.0", f"{kubectl_request.k8s_type}/{kubectl_request.target}", f"8001:{kubectl_request.port}"]
    client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    client.connect(SERVER_ADDRESS)
    client.sendall(' '.join(command).encode('utf-8'))
    response = client.recv(1024)  # Wait for the response
    client.close()
    if response == b"Process started":
        return {"message": "Port forwarding started", "command": ' '.join(command)}
    else:
        return {"message": "Failed to start port forwarding", "command": ' '.join(command)}

@cache(expire=1)
@app.get("/get_namespaces/")
async def get_namespaces():
    try:
        result = subprocess.run(["kubectl", "--kubeconfig=/kubeconfig/config", "get", "namespaces", "-o", "json"], capture_output=True, text=True)
        
        if result.returncode != 0:
            return {"error": "Failed to fetch namespaces", "details": result.stderr}
        
        namespaces_data = json.loads(result.stdout)
        namespaces = [item["metadata"]["name"] for item in namespaces_data["items"]]
        
        return {"namespaces": namespaces}

    except Exception as e:
        return {"error": str(e)}

@cache(expire=1)
@app.get("/get_types/")
async def get_types(namespace: str):
    """
    Check the existence of resources in the given namespace and return the list of existing resources.
    """
    # Load our kubeconfig (needs to be done on every call as the kubernetes cluster can be reset)
    config.load_kube_config(config_file="/kubeconfig/config")

    v1 = client.CoreV1Api()
    apps_v1 = client.AppsV1Api()

    existing_resources = []

    pods = v1.list_namespaced_pod(namespace)
    if pods.items:
        existing_resources.append("Pod")

    deployments = apps_v1.list_namespaced_deployment(namespace)
    if deployments.items:
        existing_resources.append("Deployment")

    services = v1.list_namespaced_service(namespace)
    # Filter out the default Kubernetes service in the default namespace
    filtered_services = [service for service in services.items if not (namespace == "default" and service.metadata.name == "kubernetes")]
    if filtered_services:
        existing_resources.append("Service")

    return {"types": existing_resources}

@cache(expire=1)
@app.get("/get_names/")
async def get_names(namespace: str, type: str):
    """
    Check the existence of resources in the given namespace and type, and return the list of their names.
    """
    # Load our kubeconfig (needs to be done on every call as the kubernetes cluster can be reset)
    config.load_kube_config(config_file="/kubeconfig/config")

    v1 = client.CoreV1Api()
    apps_v1 = client.AppsV1Api()

    targets = []

    if type == "pod":
        pods = v1.list_namespaced_pod(namespace)
        for pod in pods.items:
            targets.append(pod.metadata.name)

    elif type == "deployment":
        deployments = apps_v1.list_namespaced_deployment(namespace)
        for deployment in deployments.items:
            targets.append(deployment.metadata.name)

    elif type == "service":
        services = v1.list_namespaced_service(namespace)
        # Filter out the default Kubernetes service in the default namespace
        for service in services.items:
            if not (namespace == "default" and service.metadata.name == "kubernetes"):
                targets.append(service.metadata.name)

    return {"targets": targets}
