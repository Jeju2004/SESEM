@echo off
REM One-time setup: create a virtual environment for the dashboard and install
REM its dependencies into it.
REM
REM Why a venv rather than just `pip install`: on this PC `python` resolves to
REM PlatformIO's environment while `pip` resolves to a different install, so a
REM successful `pip install` lands in an interpreter that never runs the app.
REM A venv sidesteps PATH entirely - run_backend.bat and run_simulator.bat use
REM .venv\Scripts\python.exe by exact path, so it cannot pick the wrong one.
REM
REM This does NOT touch your PlatformIO environment or your system Python.

cd /d "%~dp0"

echo.
echo   Creating virtual environment in .venv ...
echo.

REM py.exe is the Windows Python launcher and is the most reliable choice.
REM Any of these can create the venv - the venv gets its own site-packages
REM either way, so it does not matter which one is found.
set VENV_MAKER=
py -3 -c "import venv" >nul 2>&1        && set VENV_MAKER=py -3
if not defined VENV_MAKER py -c "import venv" >nul 2>&1     && set VENV_MAKER=py
if not defined VENV_MAKER python -c "import venv" >nul 2>&1 && set VENV_MAKER=python

if not defined VENV_MAKER (
  echo   Could not find a Python that can create a virtual environment.
  echo   Install Python 3.10 or newer from python.org, tick "Add to PATH",
  echo   then run this file again.
  echo.
  pause
  exit /b 1
)

echo   Using: %VENV_MAKER%
%VENV_MAKER% -m venv .venv
if errorlevel 1 (
  echo   Creating the virtual environment failed.
  pause
  exit /b 1
)

echo.
echo   Installing dependencies ...
echo.
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo   Installing dependencies failed.
  pause
  exit /b 1
)

echo.
echo   Done. Now run:  run_backend.bat
echo   Then, in a second window:  run_simulator.bat
echo.
pause
