setlocal
pushd

set SCRIPT_VERION=2.0.0.0

:: Parameters
set EXEC_PATH=%~dp0
set EXEC_PATH=%EXEC_PATH:~0,-1%

cd /d %EXEC_PATH%

:: load Parameters
set DEST="C:\iobroker\ioBroker02\node_modules\ioBroker.fb-tr064-mon"

copy admin\* %DEST%\admin
copy build\* %DEST%\


popd
endlocal
