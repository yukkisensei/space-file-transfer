@echo off
cd C:\Project
start "Space Transfer Server" cmd /k npm start
timeout /t 3
cd C:\ngrok
start "Ngrok Tunnel" cmd /k ngrok http 3000
