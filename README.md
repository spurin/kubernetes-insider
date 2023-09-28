# Kubernetes Insider for Docker Desktop

The Kubernetes Insider provides quick and easy access to Kubernetes Pods/Deployments and Services, running in Docker Desktop Kubernetes.

<p align="center">
  <img width="400" src="ui/public/kubernetes-insider.png" alt="Kubernetes Insider">
</p>

## Kubernetes Insider Installation

### Enable kubernetes and docker extensions
In Docker Desktop -
1.  Go to Preferences -> Kubernetes -> Check
   "Enable Kubernetes"
2. Go to Preferences -> Extensions -> Check
   "Enable Docker Extensions"

### Three ways to install the Kubernetes Insider extension

#### Install via the CLI

The `docker extension` cli is provided by default on the current versions of Docker Desktop.

Users can run the command below to install the extension, pulling the latest version and dependencies from Docker Hub -

```
docker extension install spurin/kubernetes-insider:latest
```

#### Marketplace

Extensions are available for Docker Desktop using the Marketplace -

Go to Dashboard -> Add Extensions -> Click on Marketplace tab -> Search for Kubernetes Insider -> Click on Install

#### Build locally and install

1. From a terminal, navigate to `kubernetes-insider` root directory.

2. Build the pre-requisite API image -

   ```sh
   (cd image/kubernetes-insider-api; docker build -t spurin/kubernetes-insider-api:latest .)
   ```

3. Run the following command to build the extension -

   ```sh
   make build-extension
   ```

4. Run the following command to install the extension -

   ```sh
   make install-extension
   ```


## Thanks!

<img src="assets/loft.jpeg" alt="loft">

This extension wouldn't be possible without the amazing efforts of [loft](https://loft.sh/) and their open sourced [Vcluster Docker Desktop Extension](https://hub.docker.com/extensions/loftsh/vcluster-dd-extension).  The team at loft were able to solve a necessary problem, i.e. how to access a working kubeconfig that relates to the Docker Desktop in-built Kubernetes Server.  Around this, they also built a handy control loop in React/Typescript that checks whether or not Kubernetes is running.  This extension re-uses the control loops and adds a volume share to the kubeconfig file.

Great efforts loft! 🚀
