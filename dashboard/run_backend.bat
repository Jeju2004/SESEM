@echo off
REM Start the caregiver dashboard backend. Leave this window running.
REM
REM 0.0.0.0 (not 127.0.0.1) is deliberate: a phone on the same Wi-Fi has to be
REM able to reach it. Find this PC's address with  ipconfig  and open
REM http://<that address>:8000 on the phone.

cd /d "%~dp0"

REM The venv interpreter is addressed by exact path, never through PATH, so
REM PlatformIO's environment cannot be picked up by mistake.
set PY=.venv\Scripts\python.exe

if not exist "%PY%" (
  echo.
  echo   The virtual environment is missing. Run setup.bat first.
  echo.
  pause
  exit /b 1
)

"%PY%" -c "import fastapi" >nul 2>&1
if errorlevel 1 (
  echo.
  echo   Dependencies are not installed in .venv. Run setup.bat again.
  echo.
  pause
  exit /b 1
)

"%PY%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause
