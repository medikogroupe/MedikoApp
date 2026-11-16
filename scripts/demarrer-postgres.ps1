$pgBin = "C:\Program Files\PostgreSQL\16\bin"
$candidats = @("$env:USERPROFILE\mediko_pgdata", "$env:USERPROFILE\mediko-pgdata") | Where-Object { Test-Path (Join-Path $_ "PG_VERSION") }
if (-not $candidats) { Write-Host "Aucun dossier de donnees trouve." -ForegroundColor Red; exit 1 }

$infos = foreach ($d in $candidats) {
  $conf = Join-Path $d "postgresql.conf"
  $m = if (Test-Path $conf) { Select-String -LiteralPath $conf -Pattern '^\s*port\s*=\s*(\d+)' | Select-Object -First 1 } else { $null }
  $port = if ($m) { $m.Matches[0].Groups[1].Value } else { "5432" }
  $fichiers = Get-ChildItem -LiteralPath $d -Recurse -File -ErrorAction SilentlyContinue
  [pscustomobject]@{
    Dossier = $d
    Port = $port
    TailleMo = [math]::Round((($fichiers | Measure-Object Length -Sum).Sum) / 1MB, 1)
    DerniereActivite = ($fichiers | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
    PidPresent = (Test-Path (Join-Path $d "postmaster.pid"))
  }
}
$infos | Format-List | Out-String | Write-Host

$choix = $infos | Sort-Object DerniereActivite -Descending | Select-Object -First 1
Write-Host ("Dossier le plus recemment utilise : " + $choix.Dossier) -ForegroundColor Cyan
if ($choix.Port -ne "5432") { Write-Host ("ATTENTION : ce dossier utilise le port " + $choix.Port + ", pas 5432 comme dans .env") -ForegroundColor Yellow }

$rep = Read-Host "Demarrer PostgreSQL sur ce dossier ? Aucune donnee ni authentification n'est modifiee. Tape O pour oui"
if ($rep -eq "O") {
  $journal = Join-Path $env:TEMP "mediko-pg.log"
  & "$pgBin\pg_ctl.exe" start -D $choix.Dossier -l $journal -w -t 60
  & "$pgBin\pg_isready.exe" -h 127.0.0.1 -p 5432
  Write-Host "--- journal PostgreSQL ---"
  Get-Content -LiteralPath $journal -Tail 12 -ErrorAction SilentlyContinue
} else {
  Write-Host "Rien n'a ete lance."
}