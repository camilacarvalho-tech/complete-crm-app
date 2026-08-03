@echo off
cd /d "%~dp0"
if not exist .env (
  if exist .env.nexus-ai.example copy .env.nexus-ai.example .env
)
if not exist node_modules (
  echo Instalando dependencias do CRM...
  call npm install
)
echo.
echo Nexus CRM em http://localhost:5474/
echo Login teste: teste@nexuscrm.com / 123456
echo.
call npm run dev
