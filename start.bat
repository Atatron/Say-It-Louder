@echo off
rem Serves the You, Yourself workboard on http://localhost:8765 (needed for the Code tab, Bluetooth and the microphone).
cd /d "%~dp0"
start "" http://localhost:8765/ide.html
python -m http.server 8765
