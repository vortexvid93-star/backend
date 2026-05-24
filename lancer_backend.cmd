@echo off
setlocal
REM Alias de lance_backend.cmd (meme script).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\lance-backend.ps1" %*
