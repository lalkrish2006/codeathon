#!/bin/bash

# Create web directory
mkdir -p web
cd web

# 1. Backend Setup
echo "Setting up Backend..."
mkdir -p backend
cd backend
npm init -y
npm install express mongoose jsonwebtoken bcryptjs cors dotenv socket.io axios
mkdir -p models routes controllers
cd ..

# 2. Frontend Setup
echo "Setting up Frontend..."
# Create Vite app (using template preset to avoid interactive prompts if possible, 
# but 'npm create vite@latest' might still prompt. Using 'npm create vite@latest frontend -- --template react' is safer)
npm create vite@latest frontend -- --template react

cd frontend
npm install
npm install axios socket.io-client react-router-dom lucide-react clsx tailwind-merge
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

echo "Scaffolding Complete!"
