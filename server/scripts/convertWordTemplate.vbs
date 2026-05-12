Option Explicit

Dim sourcePath, targetPath, word, document

If WScript.Arguments.Count <> 2 Then
  WScript.Echo "Usage: cscript convertWordTemplate.vbs <source.doc> <target.docx>"
  WScript.Quit 1
End If

sourcePath = WScript.Arguments(0)
targetPath = WScript.Arguments(1)

Set word = CreateObject("Word.Application")
word.Visible = False
word.DisplayAlerts = 0
word.AutomationSecurity = 3

On Error Resume Next
Set document = word.Documents.Open(sourcePath, False, True, False)
If Err.Number <> 0 Then
  WScript.Echo "Failed to open source: " & Err.Description
  word.Quit
  WScript.Quit 2
End If

Err.Clear
document.SaveAs2 targetPath, 16
If Err.Number <> 0 Then
  WScript.Echo "Failed to save target: " & Err.Description
  document.Close False
  word.Quit
  WScript.Quit 3
End If

document.Close False
word.Quit

WScript.Echo "Converted " & sourcePath & " to " & targetPath
