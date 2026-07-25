@echo off
setlocal
REM Launch SHIFTR without needing PowerShell ExecutionPolicy for .ps1.
REM Usage: run_game.bat
REM        run_game.bat [extra Godot args...]
REM Override: set GODOT=C:\path\to\Godot_v4.7.1-stable_win64.exe

if not defined GODOT set "GODOT=%~dp0tools\Godot_v4.7.1-stable_win64.exe\Godot_v4.7.1-stable_win64.exe"
"%GODOT%" --path "%~dp0." --rendering-method mobile %*
exit /b %ERRORLEVEL%
