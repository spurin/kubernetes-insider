###############################################################
# Build Stage - Python API
###############################################################
FROM ubuntu:22.04 as buildpython

# Update and install apt packages
RUN apt-get update \
    && apt-get install -y python3 python3-pip python3.10-venv \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy API
COPY dependencies.txt /

# Create venv
RUN python3 -mvenv /usr/venv

# Install dependencies
RUN . /usr/venv/bin/activate && pip install -r /dependencies.txt

###############################################################
# Build Stage - Main
###############################################################
FROM spurin/container-systemd:ubuntu_22.04

# Install necessary packages and install kubectl
RUN apt-get update && apt-get install -y curl nginx && \
if [ "$(uname -m)" = "x86_64" ]; then \
        KUBECTL_VERSION=$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt) && \
        curl -LO "https://storage.googleapis.com/kubernetes-release/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"; \
    elif [ "$(uname -m)" = "aarch64" ]; then \
        KUBECTL_VERSION=$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt) && \
        curl -LO "https://storage.googleapis.com/kubernetes-release/release/${KUBECTL_VERSION}/bin/linux/arm64/kubectl"; \
    else \
        echo "Unsupported architecture"; \
        exit 1; \
    fi && \
    chmod +x ./kubectl && \
    mv ./kubectl /usr/local/bin/kubectl && \
    apt-get remove -y curl && apt-get autoremove -y && apt-get clean

# ENV
ENV KUBECONFIG=/kubeconfig/config

# Copy Nginx configuration with CORS bypass
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy venv
COPY --from=buildpython /usr/venv /usr/venv

# Configure API
COPY api /usr/api
COPY api.service /lib/systemd/system/api.service

# Configure Worker
COPY worker /usr/worker
COPY worker.service /lib/systemd/system/worker.service

# Configure Services for startup
RUN ln -s /lib/systemd/system/api.service /etc/systemd/system/multi-user.target.wants/api.service && \
    ln -s /lib/systemd/system/worker.service /etc/systemd/system/multi-user.target.wants/worker.service && \
    systemctl enable nginx
