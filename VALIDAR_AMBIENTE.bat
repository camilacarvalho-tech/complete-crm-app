@echo off
REM Cria os docs de usuarios via instrucoes; este script apenas valida o estado.
cd /d "%~dp0"
echo ============================================================
echo  VALIDAR AMBIENTE DE HOMOLOGACAO
echo ============================================================
echo.
curl.exe -s http://127.0.0.1:8090/health
echo.
curl.exe -s -o NUL -w "CRM http://localhost:5474/ = %{http_code}\n" http://localhost:5474/
echo.
powershell -NoProfile -Command ^
  "$line = (Get-Content 'nexus_ai\.env' -ErrorAction SilentlyContinue | Where-Object { $_ -match '^OPENAI_API_KEY=' }); if (-not $line) { 'OPENAI_API_KEY: AUSENTE no .env' } elseif ($line -match '^OPENAI_API_KEY=\s*$') { 'OPENAI_API_KEY: VAZIA - rode CONFIGURAR_OPENAI.bat' } else { 'OPENAI_API_KEY: CONFIGURADA' }"
echo.
echo Auth teste: teste@nexuscrm.com / 123456
echo Empresa: nexus-homologacao-v1
echo Docs usuarios: criar no Firebase Console (ver HOMOLOGACAO_AMBIENTE.md secao 1)
echo.
pause
