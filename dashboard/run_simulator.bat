@echo off
REM Scripted demo traffic - no hardware needed.
REM Every graded behaviour appears within about three minutes.
REM Start run_backend.bat first, in its own window, and leave it running.

cd /d "%~dp0"
set PY=.venv\Scripts\python.exe

if not exist "%PY%" (
  echo.
  echo   The virtual environment is missing. Run setup.bat first.
  echo.
  pause
  exit /b 1
)

"%PY%" simulate.py --scenario demo --speed 2
pause
