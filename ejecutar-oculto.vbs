Set WshShell = CreateObject("WScript.Shell")
' El 0 indica que la ventana estará completamente oculta (no se mostrará ni un pantallazo negro)
' WScript.Arguments(0) es la ruta del proyecto
WshShell.Run "cmd.exe /c cd /d """ & WScript.Arguments(0) & """ && npm run bot:once", 0, False
