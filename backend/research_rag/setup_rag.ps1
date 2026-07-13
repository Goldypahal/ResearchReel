# Setup Research RAG Python Environment
Write-Host "Setting up Python environment for Research RAG..." -ForegroundColor Cyan

# 1. Check if python is installed
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Python is not installed or not in PATH." -ForegroundColor Red
    exit
}

# 2. Create virtual environment
Write-Host "Creating Virtual Environment (venv)..."
python -m venv venv

# 3. Activate and Install dependencies
Write-Host "Installing dependencies from requirements.txt..."
.\venv\Scripts\pip install -r requirements.txt

# 4. Success message
Write-Host "`nSetup Complete!" -ForegroundColor Green
Write-Host "To start the RAG service, run:"
Write-Host "  .\venv\Scripts\python -m app.main" -ForegroundColor Yellow
