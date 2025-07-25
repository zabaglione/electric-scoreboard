#!/bin/bash

# Post-installation script for RPM-based systems
# This script runs after the application is installed

# Update desktop database to register the application
update-desktop-database -q || true

# Update icon cache
gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true

echo "RSS ニュース電光掲示板アプリ has been installed successfully."