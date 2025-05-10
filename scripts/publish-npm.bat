@echo off
:: Script to publish the @web3ai/cli package to npm

:: Change to project root directory
cd %~dp0\..

:: Clean up previous builds
if exist dist rmdir /s /q dist

:: Install dependencies
echo Installing dependencies...
call pnpm install

:: Run build process
echo Building package...
call pnpm build

:: Publish package
echo Publishing package to npm...
call npm publish --access public

echo Package published successfully!
echo You can now install it with: npm install -g @web3ai/cli
pause 