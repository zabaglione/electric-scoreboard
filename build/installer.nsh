; RSS ニュース電光掲示板アプリ Windows Installer Script
; Custom NSIS installer configuration

!macro customInstall
  ; Add custom installation steps here if needed
  ; For example, registry entries, file associations, etc.
!macroend

!macro customUnInstall
  ; Add custom uninstallation steps here if needed
  ; Clean up registry entries, temporary files, etc.
!macroend

!macro customHeader
  ; Custom header for installer
  !system "echo 'Building RSS News Ticker installer...'"
!macroend

!macro customInit
  ; Custom initialization
  ; Check for prerequisites, etc.
!macroend