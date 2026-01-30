# Start Python AI Service
Start-Process powershell -ArgumentList "uvicorn src.main:app --reload --port 8000" -WindowStyle Minimized
Write-Host "Started Python AI Service on Port 8000..."

# Start Node Backend
Start-Process powershell -ArgumentList "cd web/backend; npm start" -WindowStyle Minimized
Write-Host "Started Node Backend on Port 5000..."

# Start React Frontend
Start-Process powershell -ArgumentList "cd web/frontend; npm run dev"
Write-Host "Started React Frontend..."

Write-Host "All services launching. Ensure MongoDB is running!"
