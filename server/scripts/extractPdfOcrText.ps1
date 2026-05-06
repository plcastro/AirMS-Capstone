param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$PdfPath,

  [Parameter(Mandatory = $false, Position = 1)]
  [string]$OutputPath = ""
)

function Resolve-ToolPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CommandName
  )

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  return $null
}

function Invoke-WinRtTask {
  param(
    [Parameter(Mandatory = $true)]
    $Operation,

    [Parameter(Mandatory = $true)]
    [Type]$ResultType
  )

  if (-not $script:AsTaskGeneric) {
    return $null
  }

  $task = $script:AsTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
  return $task.GetAwaiter().GetResult()
}

function Get-WindowsOcrText {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ImagePath
  )

  $resolvedImagePath = Resolve-Path -LiteralPath $ImagePath -ErrorAction Stop
  $file = Invoke-WinRtTask `
    -Operation ([Windows.Storage.StorageFile]::GetFileFromPathAsync($resolvedImagePath.Path)) `
    -ResultType ([Windows.Storage.StorageFile])
  $stream = Invoke-WinRtTask `
    -Operation ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) `
    -ResultType ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Invoke-WinRtTask `
    -Operation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) `
    -ResultType ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Invoke-WinRtTask `
    -Operation ($decoder.GetSoftwareBitmapAsync(
      [Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,
      [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied
    )) `
    -ResultType ([Windows.Graphics.Imaging.SoftwareBitmap])

  $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage(
    (New-Object Windows.Globalization.Language "en")
  )

  if (-not $engine) {
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  }

  if (-not $engine) {
    return ""
  }

  $result = Invoke-WinRtTask `
    -Operation ($engine.RecognizeAsync($bitmap)) `
    -ResultType ([Windows.Media.Ocr.OcrResult])

  if (-not $result) {
    return ""
  }

  return "$($result.Text)".Trim()
}

$nodePath = Resolve-ToolPath -CommandName "node"
if (-not $nodePath) {
  Write-Error "Node.js is required for PDF page rendering but was not found."
  exit 1
}

$resolvedPdfPath = Resolve-Path -LiteralPath $PdfPath -ErrorAction Stop
$scriptRoot = Split-Path -Parent $PSCommandPath
$serverRoot = Split-Path -Parent $scriptRoot
$renderScript = Join-Path $scriptRoot "renderPdfPages.js"
$jobFolder = Join-Path $serverRoot ("tmp\ocr-manual-" + [guid]::NewGuid().ToString("N"))
$pagesFolder = Join-Path $jobFolder "pages"

New-Item -ItemType Directory -Path $pagesFolder -Force | Out-Null

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapPixelFormat, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapAlphaMode, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

$script:AsTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object {
    $_.Name -eq "AsTask" -and
    $_.IsGenericMethod -and
    $_.GetParameters().Count -eq 1
  } |
  Select-Object -First 1)

try {
  & $nodePath $renderScript $resolvedPdfPath.Path $pagesFolder 1 9999 | Out-Null

  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  $pageFiles = Get-ChildItem -LiteralPath $pagesFolder -Filter "page-*.png" |
    Sort-Object {
      [int]($_.BaseName -replace "page-", "")
    }

  $pageTexts = foreach ($pageFile in $pageFiles) {
    $pageNumber = [int]($pageFile.BaseName -replace "page-", "")
    $text = Get-WindowsOcrText -ImagePath $pageFile.FullName
    "=== Page $pageNumber ===`n$text"
  }

  $output = ($pageTexts -join "`n`n").Trim()

  if ($OutputPath) {
    $outputDir = Split-Path -Parent $OutputPath
    if ($outputDir -and -not (Test-Path -LiteralPath $outputDir)) {
      New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    }
    Set-Content -LiteralPath $OutputPath -Value $output
  } else {
    Write-Output $output
  }
}
finally {
  if (Test-Path -LiteralPath $jobFolder) {
    Remove-Item -LiteralPath $jobFolder -Recurse -Force -ErrorAction SilentlyContinue
  }
}
