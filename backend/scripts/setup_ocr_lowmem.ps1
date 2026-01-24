Write-Host "Checking if Ollama service is reachable..." -ForegroundColor Cyan

try {
    $conn = Test-NetConnection -ComputerName localhost -Port 11434 -WarningAction SilentlyContinue
    if (-not $conn.TcpTestSucceeded) {
        Write-Host "Error: Ollama is not running on port 11434." -ForegroundColor Red
        Write-Host "Please run 'ollama serve' in a separate terminal."
        exit 1
    }
} catch {
    Write-Host "Warning: Could not verify Ollama connection. Proceeding anyway..." -ForegroundColor Yellow
}

$ScriptDir = Split-Path $MyInvocation.MyCommand.Path
$ModelfilePath = Join-Path $ScriptDir "Modelfile.lowmem"

if (-not (Test-Path $ModelfilePath)) {
    Write-Host "Error: Modelfile.lowmem not found at $ModelfilePath" -ForegroundColor Red
    exit 1
}

Write-Host "1. Pulling base model (scb10x/typhoon-ocr1.5-3b)..." -ForegroundColor Cyan
ollama pull scb10x/typhoon-ocr1.5-3b

Write-Host "2. Creating optimized model 'typhoon-ocr-lowmem'..." -ForegroundColor Cyan
# Navigate to script dir so ollama can find the Modelfile easily
Push-Location $ScriptDir
ollama create typhoon-ocr-lowmem -f Modelfile.lowmem
Pop-Location

if ($?) {
    Write-Host "`nSuccess! Optimized model 'typhoon-ocr-lowmem' created." -ForegroundColor Green
    Write-Host "Memory usage should be significantly lower (~4-5GB)." -ForegroundColor Green
} else {
    Write-Host "`nError: Failed to create the model." -ForegroundColor Red
}
