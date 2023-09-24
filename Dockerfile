# Golang tool for capturing kubeconfig (thanks Loft.sh!)
FROM golang:1.18.3-alpine3.16 AS builder
ENV CGO_ENABLED=0

RUN apk add --update make

WORKDIR /backend

COPY Makefile Makefile
COPY go.mod go.mod
COPY go.sum go.sum
COPY vendor/ vendor/
COPY vm/ vm/

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    make bin

# UI Builder
FROM --platform=$BUILDPLATFORM node:18.12-alpine3.16 AS client-builder
WORKDIR /ui

# Cache packages in layer
COPY ui/package.json /ui/package.json
COPY ui/package-lock.json /ui/package-lock.json
RUN --mount=type=cache,target=/usr/src/app/.npm \
    npm set cache /usr/src/app/.npm && \
    npm ci

# Install
COPY ui /ui
RUN npm run build

# Main
FROM alpine
LABEL org.opencontainers.image.title="Kubernetes Insider" \
    org.opencontainers.image.description="Docker Extension that assists with Web Connectivity to Kubernetes" \
    org.opencontainers.image.vendor="James Spurin" \
    com.docker.desktop.extension.api.version="0.3.4" \
    com.docker.extension.screenshots="" \
    com.docker.desktop.extension.icon="" \
    com.docker.extension.detailed-description="" \
    com.docker.extension.publisher-url="" \
    com.docker.extension.additional-urls="" \
    com.docker.extension.categories="" \
    com.docker.extension.changelog=""

# Kubectl, needed for ddclient kubectl exec
RUN apk add curl
RUN curl -LO https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl \
    && chmod +x ./kubectl && mv ./kubectl /usr/local/bin/kubectl \
    && mkdir /linux \
    && cp /usr/local/bin/kubectl /linux/

RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl" \
    && mkdir /darwin \
    && chmod +x ./kubectl && mv ./kubectl /darwin/

RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/windows/amd64/kubectl.exe" \
    && mkdir /windows \
    && chmod +x ./kubectl.exe && mv ./kubectl.exe /windows/

RUN mkdir -p /root/.kube
RUN touch /root/.kube/config
ENV KUBECONFIG=/root/.kube/config

COPY docker-compose.yaml .
COPY metadata.json .
COPY kubernetes-insider.svg .

COPY --from=builder /backend/bin/service /

COPY --from=client-builder /ui/build ui

CMD /service -socket /run/guest-services/kubernetes-insider.sock
