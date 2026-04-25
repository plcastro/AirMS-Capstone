param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$PdfPath,

  [switch]$Layout,

  [switch]$Raw,

  [switch]$Ocr,

  [switch]$ForceOcr
)

function Resolve-ToolPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CommandName,

    [string[]]$CandidatePaths = @()
  )

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  foreach ($candidate in $CandidatePaths) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  return $null
}

function Get-PdfToTextPath {
  $candidatePaths = @()

  if ($env:PDFTOTEXT_PATH) {
    $candidatePaths += $env:PDFTOTEXT_PATH
  }

  $candidatePaths += @(
  "C:\Users\Kiko\AppData\Local\Microsoft\WinGet\Packages\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\poppler-25.07.0\Library\bin\pdftotext.exe"
  )

  return Resolve-ToolPath -CommandName "pdftotext" -CandidatePaths $candidatePaths
}

function Get-TesseractPath {
  $candidatePaths = @()

  if ($env:TESSERACT_PATH) {
    $candidatePaths += $env:TESSERACT_PATH
  }

  $candidatePaths += @(
    "C:\Program Files\Tesseract-OCR\tesseract.exe"
  )

  return Resolve-ToolPath -CommandName "tesseract" -CandidatePaths $candidatePaths
}

function Get-WindowsOcrText {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ImagePath
  )

  Add-Type -AssemblyName System.Runtime.WindowsRuntime

  $null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
  $null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.BitmapPixelFormat, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
  $null = [Windows.Graphics.Imaging.BitmapAlphaMode, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
  $null = [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime]
  $null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]

  $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
      $_.Name -eq "AsTask" -and
      $_.IsGenericMethod -and
      $_.GetParameters().Count -eq 1
    } |
    Select-Object -First 1)

  if (-not $asTaskGeneric) {
    return ""
  }

  function Invoke-WinRtTask {
    param(
      [Parameter(Mandatory = $true)]
      $Operation,

      [Parameter(Mandatory = $true)]
      [Type]$ResultType
    )

    $task = $asTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    return $task.GetAwaiter().GetResult()
  }

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

function Get-ExtractedText {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ToolPath,

    [Parameter(Mandatory = $true)]
    [string]$ResolvedPdfPath
  )

  $arguments = @()

  if ($Layout) {
    $arguments += "-layout"
  }

  if ($Raw) {
    $arguments += "-raw"
  }

  $arguments += @($ResolvedPdfPath, "-")

  $text = & $ToolPath @arguments | Out-String
  $exitCode = $LASTEXITCODE

  return @{
    Text = $text
    ExitCode = $exitCode
  }
}

function Invoke-OcrFallback {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ResolvedPdfPath
  )

  $tesseractPath = Get-TesseractPath

  $nodePath = Resolve-ToolPath -CommandName "node"
  if (-not $nodePath) {
    Write-Error "Node.js is required for PDF page rendering but was not found."
    exit 1
  }

  $scriptRoot = Split-Path -Parent $PSCommandPath
  $renderScript = Join-Path $scriptRoot "renderPdfPages.js"
  $tempRoot = Join-Path (Split-Path -Parent $scriptRoot) "tmp\ocr"
  $jobFolder = Join-Path $tempRoot ([IO.Path]::GetFileNameWithoutExtension($ResolvedPdfPath) + "-" + [guid]::NewGuid().ToString("N"))
  $pagesFolder = Join-Path $jobFolder "pages"
  $ocrFolder = Join-Path $jobFolder "ocr"

  New-Item -ItemType Directory -Path $pagesFolder -Force | Out-Null
  New-Item -ItemType Directory -Path $ocrFolder -Force | Out-Null

  try {
    & $nodePath $renderScript $ResolvedPdfPath $pagesFolder 1 9999 | Out-Null

    if ($LASTEXITCODE -ne 0) {
      Write-Error "Failed to render PDF pages for OCR."
      exit $LASTEXITCODE
    }

    $pageFiles = Get-ChildItem -LiteralPath $pagesFolder -Filter "page-*.png" | Sort-Object Name
    $pageTexts = foreach ($pageFile in $pageFiles) {
      if ($tesseractPath) {
        $outputBase = Join-Path $ocrFolder $pageFile.BaseName
        & $tesseractPath $pageFile.FullName $outputBase -l eng --psm 6 quiet | Out-Null

        if ($LASTEXITCODE -eq 0) {
          $txtPath = "$outputBase.txt"
          if (Test-Path -LiteralPath $txtPath) {
            Get-Content -LiteralPath $txtPath -Raw
            continue
          }
        }
      }

      $windowsOcrText = Get-WindowsOcrText -ImagePath $pageFile.FullName
      if (($windowsOcrText -replace "\s", "").Length -gt 0) {
        $windowsOcrText
      }
    }

    return ($pageTexts -join "`n`n")
  }
  finally {
    if (Test-Path -LiteralPath $jobFolder) {
      Remove-Item -LiteralPath $jobFolder -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

$pdfToText = Get-PdfToTextPath

if (-not $pdfToText) {
  Write-Error "pdftotext binary not found. Install Poppler or set PDFTOTEXT_PATH."
  exit 1
}

$resolvedPdfPath = Resolve-Path -LiteralPath $PdfPath -ErrorAction Stop

$textResult = @{
  Text = ""
  ExitCode = 0
}

if (-not $ForceOcr) {
  $textResult = Get-ExtractedText -ToolPath $pdfToText -ResolvedPdfPath $resolvedPdfPath.Path
  if ($textResult.ExitCode -ne 0) {
    exit $textResult.ExitCode
  }
}

$hasUsefulText = ($textResult.Text -replace "\s", "").Length -gt 0
$shouldUseOcr = $ForceOcr -or (($Ocr -or -not $hasUsefulText) -and -not $hasUsefulText)

if ($shouldUseOcr) {
  $ocrText = Invoke-OcrFallback -ResolvedPdfPath $resolvedPdfPath.Path
  if (($ocrText -replace "\s", "").Length -gt 0) {
    $textResult.Text = $ocrText
  }
}

Write-Output $textResult.Text
exit 0
