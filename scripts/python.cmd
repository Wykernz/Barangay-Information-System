@echo off
if exist "%~dp0..\backend\.venv\Scripts\python.exe" goto venv
if exist "%~dp0..\.tools\python-embed\python.exe" goto embedded
echo Create backend/.venv with Python 3.12 first. See docs/RUNNING.md.
exit /b 1
:venv
"%~dp0..\backend\.venv\Scripts\python.exe" %*
exit /b %errorlevel%
:embedded
"%~dp0..\.tools\python-embed\python.exe" "%~dp0embedded_runner.py" %*
exit /b %errorlevel%
