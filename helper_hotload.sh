cd ui
npm run dev &

docker extension dev ui-source spurin/kubernetes-insider:latest http://localhost:3000 &

# Wait for a keypress
echo "Press any key to kill the background process..."
read -n 1 -s

# Kill the background process
pkill -f "npm run dev"
pkill -f "docker extension dev"

echo "Background process killed."
