#!/bin/bash

# Post-removal script for Debian-based systems
# This script runs after the application is uninstalled

# Update desktop database to remove application entries
update-desktop-database -q || true

# Update icon cache
gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true

echo "RSS ニュース電光掲示板アプリ has been uninstalled successfully."