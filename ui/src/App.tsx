import React, { useState, useEffect, useRef, forwardRef } from "react";
import { Alert, CircularProgress, Divider, Stack, AppBar, Toolbar, TextField, Button, Select, MenuItem, InputLabel, FormControl, Box } from "@mui/material";
import { createDockerDesktopClient } from "@docker/extension-api-client";
import ErrorIcon from "@mui/icons-material/Error";
import Iframe from "react-iframe";
import { v1 } from "@docker/extension-api-client-types";
import Typography from "@mui/material/Typography";
import { blueGrey } from "@mui/material/colors";
import { DockerMuiThemeProvider } from "@docker/docker-mui-theme";
import CssBaseline from '@mui/material/CssBaseline';

// Custom CSS
import "./index.css";

// Create a Docker Desktop Client Object
const ddClient = createDockerDesktopClient();

// Constants
const K8S_CHECK_INTERVAL = 5000;

const refreshContext = async (isDDK8sEnabled: boolean, setIsDDK8sEnabled: React.Dispatch<React.SetStateAction<any>>) => {
  if (!isDDK8sEnabled) {
    try {
      let isDDK8sEnabled = await updateDockerDesktopK8sKubeConfig(ddClient);
      console.log("isDDK8sEnabled[interval] : ", isDDK8sEnabled);
      setIsDDK8sEnabled(isDDK8sEnabled);
    } catch (err) {
      console.log("isDDK8sEnabled[interval] error : ", JSON.stringify(err));
      setIsDDK8sEnabled(false);
    }
  } else {
    console.log("isDDK8sEnabled[interval] : ", isDDK8sEnabled);
  }
};

const checkIfDDK8sEnabled = async (setIsLoading: React.Dispatch<React.SetStateAction<any>>) => {
  try {
    setIsLoading(true);
    let isDDK8sEnabled = await updateDockerDesktopK8sKubeConfig(ddClient);
    setIsLoading(false);
    return isDDK8sEnabled;
  } catch (err) {
    console.log("checkIfDDK8sEnabled error : ", JSON.stringify(err));
    setIsLoading(false);
  }
  return false;
};

// Common function to call vm.cli.exec
const cli = async (ddClient: v1.DockerDesktopClient, command: string, args: string[]) => {
  return ddClient.extension.vm?.cli.exec(command, args);
};

// Common function to call host.cli.exec
const hostCli = async (ddClient: v1.DockerDesktopClient, command: string, args: string[]) => {
  return ddClient.extension.host?.cli.exec(command, args);
};

// Retrieves kubectl cluster-info
export const checkK8sConnection = async (ddClient: v1.DockerDesktopClient) => {
  // kubectl cluster-info
  return await cli(ddClient, "kubectl", ["cluster-info"]);
};

// Gets docker-desktop kubeconfig file from local and save it in container's /root/.kube/config file-system.
// We have to use the vm.service to call the post api to store the kubeconfig retrieved. Without post api in vm.service
// all the combinations of commands fail
export const updateDockerDesktopK8sKubeConfig = async (ddClient: v1.DockerDesktopClient) => {
  // kubectl config view --raw
  let kubeConfig = await hostCli(ddClient, "kubectl", ["config", "view", "--raw", "--minify", "--context", "docker-desktop"]);
  if (kubeConfig?.stderr) {
    console.log("error", kubeConfig?.stderr);
    return false;
  }

  // call backend to store the kubeconfig retrieved
  try {
    await ddClient.extension.vm?.service?.post("/store-kube-config", { data: kubeConfig?.stdout });
  } catch (err) {
    console.log("error", JSON.stringify(err));
  }

  let output = await checkK8sConnection(ddClient);
  if (output?.stderr) {
    console.log("[checkK8sConnection] : ", output.stderr);
    return false;
  }
  if (output?.stdout) {
    console.log("[checkK8sConnection] : ", output?.stdout);
  }

  return true;
};

// Retrieves host's current k8s context
export const getCurrentK8sContext = async (ddClient: v1.DockerDesktopClient) => {
  // kubectl config view -o jsonpath='{.current-context}'
  let output = await hostCli(ddClient, "kubectl", ["config", "view", "-o", "jsonpath='{.current-context}'"]);
  if (output?.stderr) {
    console.log("[getCurrentK8sContext] : ", output.stderr);
    return {};
  }
  return output?.stdout;
};

function StarterPage() {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyClick = () => {
    navigator.clipboard.writeText('kubectl run flappy-dock --image=spurin/flappy-dock && kubectl wait --for=condition=Ready pod -l run=flappy-dock --timeout=300s')
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);  // Reset after 2 seconds
      });
  };

  return (
    <DockerMuiThemeProvider>
    <CssBaseline />
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "80vh",
        justifyContent: "center",
        margin: 0,  // Resetting potential margins
        position: "relative",
      }}
    >
      <img src="kubernetes-insider.png" alt="Logo" width={200} />
      <Typography variant="h4" component="h1" mt={2}>
        Welcome to the Kubernetes Insider
      </Typography>
      <Typography variant="body1" component="p" mt={2}>
        To begin, try executing the following command:
      </Typography>
      <Box 
        mt={1}
        mb={1}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'  // Space between the code and the button
        }}
      >
        <Typography variant="body2" component="p" style={{ textAlign: 'center' }}>
          <code style={{ fontWeight: 'bold', display: 'inline-block', padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px' }}>kubectl run flappy-dock --image=spurin/flappy-dock && <br />kubectl wait --for=condition=Ready pod -l run=flappy-dock --timeout=300s</code>
        </Typography>
        <Button onClick={handleCopyClick}>
          {copySuccess ? 'Copied!' : 'Copy'}
        </Button>
      </Box>
      <Typography variant="body1">
      After executing the command - Select "Pod" as the Type, select "flappy-dock" as the Target, Set the Port to "80" and click Go
      </Typography>

      <Divider variant="middle" style={{ width: '50%', marginTop: '1rem', marginBottom: '1rem' }} /> 

      <Typography variant="body1">
      The Kubernetes Insider can be used against any Pod, Deployment or Service, running inside Docker Desktop Kubernetes
      </Typography>
    </Box>
    </DockerMuiThemeProvider>
  );
}

export function MyApp() {
  const [type, setType] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [port, setPort] = useState<string | null>("80");
  const [namespace, setNamespace] = useState("");
  const [namespaces, setNamespaces] = useState([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [iframeUrl, setIframeUrl] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showStarterPage, setShowStarterPage] = useState(true);
  const [isNamespaceDropdownOpen, openNamespaceDropdown, closeNamespaceDropdown] = useSelectOpen(false, fetchNamespaces);
  const [isTypeDropdownOpen, openTypeDropdown, closeTypeDropdown] = useSelectOpen(false, fetchTypes);
  const [isTargetDropdownOpen, openTargetDropdown, closeTargetDropdown] = useSelectOpen(false, fetchTargets);

  // Create a reference to the AppBar
  const appBarRef = useRef<HTMLDivElement>(null);

  // After the component is rendered
  useEffect(() => {
    // Calculate the height of the AppBar
    const height = appBarRef.current ? appBarRef.current.clientHeight : 0;

    // Set the height of the iframe (remove appBar and remove 9px for the bottom bar)
    if (iframeRef.current) {
      iframeRef.current.style.height = `calc(100vh - ${height}px - 9px)`;
    }

  }, [appBarRef]);

  const handleSubmit = async () => {
    setShowStarterPage(false);
    let k8s_type = type ? type.toLowerCase() : "";
    //let k8s_type = type.toLowerCase();
    let targetValue = target !== "" ? target : "";
    let portValue = port !== "" ? port : "80";
    let namespaceValue = namespace !== "" ? namespace : "default";

    let payload = {
      k8s_type,
      target: targetValue,
      port: portValue,
      namespace: namespaceValue,
    };

    try {
      console.log("Sending POST request to update port-forwarding");
      const response = await fetch("http://localhost:31251/port_forward/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json(); // Parse the JSON response from the server

      if (!response.ok || responseData.message === "Failed to start port forwarding") {
        // handle error response
        throw new Error(`HTTP error! status: ${response.status}`);
      } else {
        // If the request was successful, open the iframe to the given URL
        console.log("Reloading iFrame");
        if (iframeRef.current) {
          iframeRef.current.src = "about:blank"; // Set to about:blank first
          setTimeout(() => {
            const iframeElement = iframeRef.current as HTMLIFrameElement;
            iframeElement.src = "http://localhost:31253"; // Then set to the actual URL
          }, 0);
        }
      }
    } catch (error) {
      console.error("There was an error!", error);
      alert("Port forwarding failed");
    }
  };

  // Custom hook for handling Select open and close behavior
  function useSelectOpen(
    initialValue: boolean,
    onOpenCallback: () => void
  ): [boolean, () => void, () => void] {
    const [isOpen, setIsOpen] = useState(initialValue);

    useEffect(() => {
      if (isOpen) {
        onOpenCallback();
      }
    }, [isOpen, onOpenCallback]);

    return [isOpen, () => setIsOpen(true), () => setIsOpen(false)];
  }

  async function fetchNamespaces() {
    //setNamespaces([]); // Clear out the previous namespaces immediately
    try {
      const response = await fetch('http://localhost:31251/get_namespaces/');
      const data = await response.json();
      setNamespaces(data.namespaces);
    } catch (error) {
      console.error('Error fetching namespaces:', error);
    }
  }

  async function fetchTypes() {
    if (!namespace) {
      return; // Make sure namespace is selected
    }
    //setTypes([]); // Clear out the previous types immediately
    try {
      const response = await fetch(`http://localhost:31251/get_types/?namespace=${namespace}`);
      const data = await response.json();
      setTypes(data.types);
    } catch (error) {
      console.error('Error fetching types:', error);
    }
  }

  async function fetchTargets() {
    if (!namespace || !type) {
      return; // Make sure namespace and type are selected
    }
    try {
      const response = await fetch(`http://localhost:31251/get_names/?namespace=${namespace}&type=${type}`);
      const data = await response.json();
      setTargets(data.targets);
    } catch (error) {
      console.error('Error fetching targets:', error);
    }
  }

  return (
    <DockerMuiThemeProvider>
    <CssBaseline />
      <div>
        <AppBar position="static" ref={appBarRef} style={{border: 'none'}}>
          <Toolbar>
            <Box m={1}>
              <FormControl variant="filled" style={{ minWidth: 120 }}>
                <InputLabel>Namespace</InputLabel>
                <Select
                  value={namespace}
                  onChange={(e) => { 
                    setNamespace(e.target.value);
                    setType(null);
                    setTarget(null);
                    setTypes([]);
                    setTargets([]);
                  }}
                  open={isNamespaceDropdownOpen}
                  onOpen={openNamespaceDropdown}
                  onClose={closeNamespaceDropdown}
                >
                  {namespaces.map((ns, index) => (
                    <MenuItem key={index} value={ns}>
                      {ns}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box m={1}>
              <FormControl variant="filled" style={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setTarget(null);
                    setTargets([]);
                  }}
                  open={isTypeDropdownOpen}
                  onOpen={openTypeDropdown}
                  onClose={closeTypeDropdown}
                  disabled={!namespace}
                >
                  {types.map((typeItem, index) => (
                    <MenuItem key={index} value={typeItem.toLowerCase()}>
                      {typeItem}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box m={1}>
              <FormControl variant="filled" style={{ minWidth: 120 }}>
                <InputLabel>Target</InputLabel>
                <Select
                  value={target}
                  onChange={(e) => setTarget(e.target.value as string)}
                  open={isTargetDropdownOpen}
                  onOpen={openTargetDropdown}
                  onClose={closeTargetDropdown}
                  disabled={!type}
                >
                  {targets.map((targetItem, index) => (
                    <MenuItem key={index} value={targetItem}>
                      {targetItem}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box m={1}>
              <TextField label="Port" variant="filled" value={port} onChange={(e) => setPort(e.target.value)} />
            </Box>

            <Box m={1}>
              <Button color="primary" onClick={handleSubmit}>
                Go
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        {showStarterPage && <StarterPage />}

        <iframe
          ref={iframeRef} // Assign the reference to the iframe
          src=""
          width="100%"
          height="100vh"
          id="myId"
          className="myClassname"
          style={{ border: "none", width: "100%", display: showStarterPage ? "none" : "initial", position: "relative" }}
        />
      </div>
    </DockerMuiThemeProvider>
  );
}

export const App = () => {
  const [isDDK8sEnabled, setIsDDK8sEnabled] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      let enabled = await checkIfDDK8sEnabled(setIsLoading);
      setIsDDK8sEnabled(enabled);
      setIsLoading(false);
    };
    init();

    const contextInterval = setInterval(() => refreshContext(isDDK8sEnabled, setIsDDK8sEnabled), K8S_CHECK_INTERVAL);
    return () => {
      clearInterval(contextInterval);
    };
  }, []);

  let component;
  if (isLoading) {
    component = (
      <Box
        mt={1}
        sx={{
          marginBottom: "15px",
          textAlign: "center",
        }}
      >
        <CircularProgress
          size={50}
          sx={{
            color: blueGrey[500],
          }}
        />
      </Box>
    );
  } else {
    if (isDDK8sEnabled) {
      component = <MyApp />;
    } else {
      component = (
        <Box>
          <Alert
            iconMapping={{
              error: <ErrorIcon fontSize="inherit" />,
            }}
            severity="error"
            color="error"
          >
            Seems like Kubernetes is not enabled in your Docker Desktop. Please take a look at the <a href="https://docs.docker.com/desktop/kubernetes/">docker documentation</a> on how to enable the Kubernetes server.
          </Alert>
        </Box>
      );
    }
  }
  return (
    <Stack direction="column" spacing={2}>
      {component}
    </Stack>
  );
};
