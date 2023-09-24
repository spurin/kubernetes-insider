# Build the extension image
docker buildx create --name build_cross --driver-opt env.BUILDKIT_STEP_LOG_MAX_SIZE=10000000 --driver-opt env.BUILDKIT_STEP_LOG_MAX_SPEED=10000000
docker buildx use build_cross
docker buildx build --platform linux/amd64,linux/arm64/v8 -t spurin/kubernetes-insider:latest . --push
# Build the API image
(cd image/kubernetes-insider-api; bash helper_build.sh)
