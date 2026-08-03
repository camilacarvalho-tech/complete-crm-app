@echo off
cd /d "%~dp0nexus_ai"
if not exist .env copy .env.example .env

echo.
echo ============================================================
echo  CONFIGURAR OPENAI_API_KEY - Nexus AI V1
echo ============================================================
echo.
set /p OPENAI_KEY=Cole sua OPENAI_API_KEY (sk-...): 
if "%OPENAI_KEY%"=="" (
  echo Nenhuma chave informada. Abortado.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p = Join-Path '%CD%' '.env'; $key = $env:OPENAI_KEY; if (-not $key) { $key = '%OPENAI_KEY%' }; $lines = @(); if (Test-Path $p) { $lines = Get-Content $p }; $found = $false; $out = foreach ($l in $lines) { if ($l -match '^OPENAI_API_KEY=') { $found = $true; 'OPENAI_API_KEY=' + $key } else { $l } }; if (-not $found) { $out += ('OPENAI_API_KEY=' + $key) }; Set-Content -Path $p -Value $out -Encoding UTF8; Write-Host 'OK: OPENAI_API_KEY gravada em nexus_ai\.env (sem exibir o valor).'"

if errorlevel 1 (
  echo Falha ao gravar .env
  pause
  exit /b 1
)

echo.
echo Reinicie a Nexus AI (feche o terminal da API e rode INICIAR_NEXUS_AI.bat).
echo.
pause
