@echo off
setlocal
REM Run headless validation suites (bypasses Restricted ExecutionPolicy).
REM Usage: run_tests.bat
REM        run_tests.bat [args forwarded to run_tests.ps1]

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_tests.ps1" %*
exit /b %ERRORLEVEL%
