@echo off
setlocal enabledelayedexpansion

REM ====== VALIDACOES ======
if "%NPM_TOKEN%"=="" (
  echo ERRO: NPM_TOKEN nao esta definido. Crie com: setx NPM_TOKEN "seu_token"
  exit /b 1
)

REM 1. Excluir node_modules e package-lock.json, se existirem
if exist node_modules (
    echo Excluindo node_modules...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    echo Excluindo package-lock.json...
    del /f /q package-lock.json
)

REM 2. Executar comandos do Git
echo Fazendo commit e push...
git add .
git commit -m "Update Version"
git push

REM 3. Executar npm i e ng build
echo Rodando npm i...
call npm i --force
echo rodando ng build...
call npx ng build

REM 4. Pega o nome da pasta atual
for %%I in ("%cd%") do set "CUR_DIR=%%~nxI"
echo Nome do diretório: %CUR_DIR%

REM 5. Sobe 2 níveis e entra na pasta dist\NOME_DIRETORIO
cd ..
cd ..
cd dist\%CUR_DIR%

REM ====== NPM AUTH COM TOKEN (SEM INTERATIVO) ======
echo registry=https://registry.npmjs.org/> .npmrc
echo //registry.npmjs.org/:_authToken=%NPM_TOKEN%>> .npmrc
echo always-auth=true>> .npmrc

REM (Opcional) Mostra quem esta logado (nao imprime o token)
call npm whoami
if errorlevel 1 (
  echo ERRO: npm nao autenticou. Verifique NPM_TOKEN.
  del /f /q .npmrc
  exit /b 1
)

REM 6. Publica no NPM
echo Publicando no NPM...
npm publish --access public
set PUBLISH_ERROR=%ERRORLEVEL%

REM Limpa o .npmrc temporario
del /f /q .npmrc

if not "%PUBLISH_ERROR%"=="0" (
  echo ERRO: npm publish falhou com codigo %PUBLISH_ERROR%.
  exit /b %PUBLISH_ERROR%
)

pause
