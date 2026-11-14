@echo off
python "%~dp0novel_wizard.py" %*
if errorlevel 1 pause
