param([Parameter(Mandatory=$true)][string]$TextPath, [Parameter(Mandatory=$true)][string]$WavePath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $spanish = @($voice.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like 'es-*' })
    if ($spanish.Count -eq 0) { throw 'No hay voz española instalada en Windows.' }
    $voice.SelectVoice($spanish[0].VoiceInfo.Name)
    $voice.Rate = 0
    $voice.SetOutputToWaveFile($WavePath)
    $voice.Speak([IO.File]::ReadAllText($TextPath, [Text.Encoding]::UTF8))
} finally { $voice.Dispose() }
