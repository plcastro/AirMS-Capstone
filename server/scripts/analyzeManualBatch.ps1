param(
  [Parameter(Mandatory = $true)]
  [string]$InputListPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputJsonPath
)

$files = Get-Content -LiteralPath $InputListPath |
  ForEach-Object { "$_".Trim().Trim('"') } |
  Where-Object { $_.Length -gt 0 }

$results = foreach ($file in $files) {
  $text = powershell -ExecutionPolicy Bypass -File "$PSScriptRoot\extractPdfText.ps1" $file | Out-String
  $lines = $text -split "`r?`n" | Where-Object { $_.Trim().Length -gt 0 }
  $ammMatches = $lines |
    Select-String -Pattern "AMM\s*[0-9]{2}-[0-9]{2}-[0-9]{2},?[0-9-]*" |
    Select-Object -First 5

  $ammRefs = foreach ($match in $ammMatches) {
    foreach ($value in $match.Matches.Value) {
      $value.Trim()
    }
  }

  [pscustomobject]@{
    name = [IO.Path]::GetFileName($file)
    fullPath = [string]$file
    charCount = ($text -replace "\s", "").Length
    ammReferences = @($ammRefs | Select-Object -Unique)
    previewLines = @($lines | Select-Object -First 20)
  }
}

$outputDir = Split-Path -Parent $OutputJsonPath
if ($outputDir -and -not (Test-Path -LiteralPath $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$results | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $OutputJsonPath
