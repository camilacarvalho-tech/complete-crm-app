@echo off
cd /d "%~dp0"
echo ============================================================
echo  NEXUS - Homologacao V1 (CRM + AI)
echo ============================================================
echo.
echo [1/2] Iniciando Nexus AI na porta 8090...
start "Nexus AI :8090" cmd /k "cd /d ""%~dp0nexus_ai"" && INICIAR_NEXUS_AI.bat"
timeout /t 4 /nobreak >nul
echo [2/2] Iniciando Nexus CRM na porta 5474...
start "Nexus CRM :5474" cmd /k "cd /d ""%~dp0"" && INICIAR_CRM.bat"
echo.
echo Aguarde os dois terminais subirem.
echo CRM:      http://localhost:5474/
echo Nexus AI: http://127.0.0.1:8090/docs
echo.
echo Login teste: teste@nexuscrm.com / 123456
echo.
pause
