@echo off
cd /d %~dp0

:: Pythonがインストールされているか確認
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Python が見つかりません。インストールを開始します...
    
    :: Pythonの公式インストーラーをダウンロード
    powershell -Command "& {[Net.WebClient]::new().DownloadFile('https://www.python.org/ftp/python/3.11.4/python-3.11.4-amd64.exe', 'python_installer.exe')}"

    :: Pythonをサイレントインストール
    start /wait python_installer.exe /quiet InstallAllUsers=1 PrependPath=1

    :: インストール完了後、削除
    del python_installer.exe

    echo Python のインストールが完了しました。
)

:: Python HTTPサーバーを起動
start "" python -m http.server 8000

:: 2秒待機
timeout /t 2 >nul

:: ブラウザでtop.htmlを開く
start "" http://localhost:8000/html/top.html

exit
