# Model Download Script for NeuroBridge
# Downloads the FER+ ONNX model for facial emotion recognition

$ErrorActionPreference = "Stop"

$modelsDir = Join-Path $PSScriptRoot "public\models"
$modelUrl = "https://github.com/onnx/models/raw/main/validated/vision/body_analysis/emotion_ferplus/model/emotion-ferplus-8.onnx"
$modelPath = Join-Path $modelsDir "emotion-ferplus-8.onnx"

# Create models directory if it doesn't exist
if (-not (Test-Path $modelsDir)) {
    New-Item -ItemType Directory -Path $modelsDir -Force | Out-Null
}

# Check if model already exists
if (Test-Path $modelPath) {
    Write-Host "✓ FER+ model already exists at $modelPath" -ForegroundColor Green
    exit 0
}

Write-Host "Downloading FER+ emotion recognition model..." -ForegroundColor Cyan
Write-Host "URL: $modelUrl"
Write-Host "Destination: $modelPath"
Write-Host ""

try {
    # Download with progress
    $ProgressPreference = 'Continue'
    Invoke-WebRequest -Uri $modelUrl -OutFile $modelPath -UseBasicParsing
    
    # Verify download
    $fileSize = (Get-Item $modelPath).Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    
    if ($fileSize -gt 10000000) {  # > 10MB
        Write-Host ""
        Write-Host "✓ Model downloaded successfully!" -ForegroundColor Green
        Write-Host "  File size: $fileSizeMB MB" -ForegroundColor Gray
    } else {
        throw "Downloaded file is too small ($fileSizeMB MB). Expected ~34 MB."
    }
} catch {
    Write-Host "✗ Failed to download model: $_" -ForegroundColor Red
    
    # Try alternative method
    Write-Host ""
    Write-Host "Trying alternative download method..." -ForegroundColor Yellow
    
    try {
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($modelUrl, $modelPath)
        
        $fileSize = (Get-Item $modelPath).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        Write-Host "✓ Model downloaded successfully (alt method)!" -ForegroundColor Green
        Write-Host "  File size: $fileSizeMB MB" -ForegroundColor Gray
    } catch {
        Write-Host "✗ Both download methods failed." -ForegroundColor Red
        Write-Host ""
        Write-Host "Please download manually from:" -ForegroundColor Yellow
        Write-Host $modelUrl
        Write-Host ""
        Write-Host "And save to:" -ForegroundColor Yellow
        Write-Host $modelPath
        exit 1
    }
}

Write-Host ""
Write-Host "Setup complete! You can now run 'npm run dev' to start the application." -ForegroundColor Cyan
