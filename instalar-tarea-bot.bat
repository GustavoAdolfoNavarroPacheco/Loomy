@echo off
echo =========================================================
echo Instalando tareas programadas para el Bot de Eli...
echo =========================================================

REM Obtenemos el directorio actual del archivo .bat
set "DIR=%~dp0"
REM Eliminamos la barra invertida final si la hay
if "%DIR:~-1%"=="\" set "DIR=%DIR:~0,-1%"

echo Creando tarea 5:00 AM...
schtasks /create /tn "BotFacturacionEli_5AM" /tr "wscript.exe \"%DIR%\ejecutar-oculto.vbs\" \"%DIR%\"" /sc daily /st 05:00 /f

echo Creando tarea 11:00 AM...
schtasks /create /tn "BotFacturacionEli_11AM" /tr "wscript.exe \"%DIR%\ejecutar-oculto.vbs\" \"%DIR%\"" /sc daily /st 11:00 /f

echo Creando tarea 05:00 PM...
schtasks /create /tn "BotFacturacionEli_5PM" /tr "wscript.exe \"%DIR%\ejecutar-oculto.vbs\" \"%DIR%\"" /sc daily /st 17:00 /f

echo.
echo Tareas creadas corractamente. El bot se ejecutara todos los dias a las 05:00 AM, 11:00 AM y 05:00 PM de forma invisible.
echo Puedes cerrar esta ventana.
pause
