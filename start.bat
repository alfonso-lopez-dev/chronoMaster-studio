@echo off
title ChronoMaster Studio
cls

echo ===================================================
echo      ChronoMaster Studio - Iniciando...
echo ===================================================
echo.

REM 1. Verificar si Python esta instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no se encuentra en el sistema.
    echo Por favor instala Python desde https://www.python.org/downloads/
    echo y asegurate de marcar "Add Python to PATH" durante la instalacion.
    echo.
    pause
    exit
) else (
    echo [OK] Python detectado.
)

REM 2. Verificar dependencias
echo [INFO] Verificando dependencias...
echo      - Todo listo (Librerias estandar utilizadas).
echo.

REM 3. Abrir navegador (Se abrira mientras carga el servidor)
echo [INFO] Abriendo navegador en http://localhost:8000 ...
start http://localhost:8000

REM 4. Iniciar servidor (Mantiene la ventana abierta)
echo [INFO] Iniciando servidor...
echo.
echo [CONSEJO] Para detener el servidor, presiona Ctrl + C en esta ventana.
echo.
python server.py
