@echo off
echo ========================================
echo   DEPLOY NEXUS CRM CLEAN - RENDER
echo ========================================
echo.

echo [1/3] Verificando mudancas...
git status
echo.

echo [2/3] Deseja fazer commit e push? (S/N)
set /p confirma="> "

if /i "%confirma%"=="S" (
    echo.
    echo Digite a mensagem do commit:
    set /p mensagem="> "
    
    echo.
    echo [3/3] Enviando para GitHub...
    git add .
    git commit -m "%mensagem%"
    git push
    
    echo.
    echo ========================================
    echo   DEPLOY INICIADO!
    echo ========================================
    echo.
    echo O Render vai fazer o deploy automaticamente
    echo Acesse: https://dashboard.render.com
    echo Logs: https://dashboard.render.com/web/NOME-DO-SERVICO/events
    echo.
    echo Aguarde 2-3 minutos para o deploy concluir
    echo ========================================
) else (
    echo.
    echo Deploy cancelado!
)

echo.
pause
