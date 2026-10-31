; Manual installs/reinstalls get a new identity. In-app updates explicitly retain it.
; This is application metadata only. Never remove userData or touch saved credentials.
!macro customInstall
  Push $0
  Push $1
  Push $2
  StrCpy $1 ""
  ${If} ${isUpdated}
    ReadRegStr $1 SHELL_CONTEXT "Software\EcoAI-Science\Onboarding" "InstallationId"
  ${EndIf}
  ${If} $1 == ""
    System::Call 'ole32::CoCreateGuid(g .r1) i.r2'
    ${If} $2 != 0
      Abort "Installation could not be completed. Please run the installer again."
    ${EndIf}
  ${EndIf}
  ClearErrors
  FileOpen $0 "$INSTDIR\resources\ecoai-installation-id" w
  ${If} ${Errors}
    Abort "Installation could not be completed. Please run the installer again."
  ${EndIf}
  FileWrite $0 "$1"
  FileClose $0
  ${If} ${Errors}
    Abort "Installation could not be completed. Please run the installer again."
  ${EndIf}
  WriteRegStr SHELL_CONTEXT "Software\EcoAI-Science\Onboarding" "InstallationId" "$1"
  Pop $2
  Pop $1
  Pop $0
!macroend
