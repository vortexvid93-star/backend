@echo off
setlocal
REM Depuis backend\ : lance le meme script que a la racine du depot.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\lance-backend.ps1" %*
