@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "TEST_FILE=fraction_test_cases.txt"

echo ============================================
echo Fraction Interpreter Batch Test Runner
echo ============================================
echo.

if not exist "%TEST_FILE%" (
    echo Could not find %TEST_FILE%.
    echo Put one expression per line in that file, then run this script again.
    echo.
    pause
    exit /b 1
)

echo Compiling FractionInterpreter.java ...
javac FractionInterpreter.java
if errorlevel 1 (
    echo.
    echo Compilation failed. Fix the Java errors above, then run this script again.
    echo.
    pause
    exit /b 1
)

echo Compilation successful.
echo.
echo Reading test cases from %TEST_FILE%
echo Lines starting with # are treated as section headers.
echo Use __EMPTY__ for an empty input and __SPACES__ for whitespace-only input.
echo.

for /f "usebackq delims=" %%A in ("%TEST_FILE%") do call :dispatch "%%A"

echo.
echo ============================================
echo All tests finished.
echo ============================================
echo.
pause
exit /b 0

:dispatch
set "CASE=%~1"
if "!CASE:~0,1!"=="#" (
    echo.
    echo ============================================
    echo !CASE:~1!
    echo ============================================
    exit /b 0
)

if "!CASE!"=="__EMPTY__" (
    call :run ""
    exit /b 0
)

if "!CASE!"=="__SPACES__" (
    call :run "      "
    exit /b 0
)

call :run "!CASE!"
exit /b 0

:run
echo --------------------------------------------
echo Input: %~1
<nul set /p "INPUT_LINE=%~1" | java FractionInterpreter
echo.
exit /b 0
