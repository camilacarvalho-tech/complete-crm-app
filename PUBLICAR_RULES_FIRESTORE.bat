@echo off
cd /d "%~dp0"
echo ============================================================
echo  Publicar firestore.rules (permite bootstrap do Master)
echo ============================================================
echo.
echo Se pedir login, autorize no navegador.
echo.
firebase login
if errorlevel 1 (
  echo Falha no login Firebase.
  pause
  exit /b 1
)
firebase deploy --only firestore:rules --project recomece-cred-oficial
if errorlevel 1 (
  echo Deploy falhou. Tente: firebase login --reauth
  pause
  exit /b 1
)
echo.
echo Rules publicadas. Faca logout/login no CRM com sua conta Master.
echo.
pause
