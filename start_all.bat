@echo off
title Distributed Storage System
echo Starting Distributed Object Storage System...
cd /d "%~dp0"
py run_cluster.py
pause
