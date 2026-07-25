@echo off
setlocal
REM SHIFTR Godot shim. Zip extracts to tools\Godot_*_win64.exe\ (FOLDER); real .exe is inside.
set "SCRIPT_DIR=%~dp0"
set "GODOT_EXE="

if defined GODOT if exist "%GODOT%" (
  dir /a-d "%GODOT%" >nul 2>&1
  if not errorlevel 1 (
    set "GODOT_EXE=%GODOT%"
  ) else (
    for %%F in ("%GODOT%\Godot*_console.exe") do if exist "%%~fF" set "GODOT_EXE=%%~fF"
    if not defined GODOT_EXE for %%F in ("%GODOT%\Godot*_win64.exe") do if exist "%%~fF" set "GODOT_EXE=%%~fF"
  )
)

if not defined GODOT_EXE (
  for /d %%D in ("%SCRIPT_DIR%tools\Godot*") do (
    if exist "%%~D\Godot*_console.exe" (
      for %%F in ("%%~D\Godot*_console.exe") do set "GODOT_EXE=%%~fF"
    )
    if not defined GODOT_EXE if exist "%%~D\Godot*_win64.exe" (
      for %%F in ("%%~D\Godot*_win64.exe") do set "GODOT_EXE=%%~fF"
    )
  )
)

if not defined GODOT_EXE (
  echo Godot not found. Expected:
  echo   %SCRIPT_DIR%tools\Godot_v4.7.1-stable_win64.exe\Godot_v4.7.1-stable_win64.exe
  echo Set GODOT to that .exe path, or unpack under tools\.
  exit /b 1
)

"%GODOT_EXE%" --path "%SCRIPT_DIR%." %*
exit /b %ERRORLEVEL%