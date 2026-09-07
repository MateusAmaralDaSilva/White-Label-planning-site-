param(
  [string]$ApiUrl = "http://localhost/api/auth/login",
  [string]$DbContainer = "whitelabel-db"
)

$ErrorActionPreference = "Stop"

$accounts = @(
  @{ Email = "admin@teste.com";    Password = "senha123"; Description = "Admin Acme (Tenant: acme)" },
  @{ Email = "maria@clinica.com"; Password = "senha123"; Description = "Maria Clinica (Tenant: clinica)" }
)

function Invoke-Login([string]$loginEmail, [string]$loginPassword, [string]$url) {
  $payload = @{ email = $loginEmail; password = $loginPassword } | ConvertTo-Json -Compress
  try {
    $res = Invoke-WebRequest -Method Post -Uri $url -ContentType "application/json" -Body $payload -UseBasicParsing
    return [pscustomobject]@{
      Status = [int]$res.StatusCode
      Body   = $res.Content
    }
  } catch {
    if ($_.Exception.Response -ne $null) {
      $resp = $_.Exception.Response
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      return [pscustomobject]@{
        Status = [int]$resp.StatusCode
        Body   = $reader.ReadToEnd()
      }
    }
    throw
  }
}

function Log-Result([string]$userDesc, [string]$targetEmail, [bool]$passed, [string]$detail) {
  $statusIcon = if ($passed) { "[PASS]" } else { "[FAIL]" }
  $color = if ($passed) { "Green" } else { "Red" }
  Write-Host "$statusIcon Conta: $userDesc ($targetEmail)" -ForegroundColor $color
  Write-Host "       Detalhe: $detail" -ForegroundColor DarkGray
}

Write-Host "`n--- INICIANDO TESTE DE CONTAS SEED ---" -ForegroundColor Cyan

$allPassed = $true

foreach ($acc in $accounts) {
  Write-Host "`n>> Inspecionando a conta: $($acc.Email)" -ForegroundColor Yellow
  
  # 1. Busca o hash no banco de dados para auditoria
  $dbHash = ""
  try {
    $query = "SELECT password_hash FROM app.users WHERE email = '$($acc.Email)';"
    # Parâmetros -tAc garantem que o psql retorne apenas o texto puro, sem cabeçalhos de tabela
    $dbHash = docker exec $DbContainer psql -U postgres -d whitelabel -tAc $query
    
    if ([string]::IsNullOrWhiteSpace($dbHash)) {
      $dbHash = "NENHUM HASH ENCONTRADO (Usuário não existe ou coluna está vazia)"
    }
  } catch {
    $dbHash = "ERRO: Não foi possível conectar ao banco via Docker para ler o hash."
  }

  Write-Host "   -> Hash armazenado no DB: $dbHash" -ForegroundColor Magenta

  # 2. Teste de login com senha correta
  $resOk = Invoke-Login -loginEmail $acc.Email -loginPassword $acc.Password -url $ApiUrl
  $hasTokens = ($resOk.Body -match '"token"' -or $resOk.Body -match '"accessToken"')
  $validLoginSuccess = ($resOk.Status -eq 200 -and $hasTokens)

  if ($validLoginSuccess) {
    Log-Result -userDesc $acc.Description -targetEmail $acc.Email -passed $true -detail "HTTP 200 recebido com token de autenticacao valido."
  } else {
    $allPassed = $false
    $reason = if ($resOk.Status -eq 401) { 
      "Credenciais invalidas. O hash no banco bate com a senha?" 
    } elseif ($resOk.Status -eq 404) { 
      "Usuario nao encontrado na API (Erro 404)." 
    } else { 
      "Erro inesperado HTTP $($resOk.Status). Resposta: $($resOk.Body)" 
    }
    Log-Result -userDesc $acc.Description -targetEmail $acc.Email -passed $false -detail $reason
  }

  # 3. Teste de rejeicao com senha incorreta
  $resFail = Invoke-Login -loginEmail $acc.Email -loginPassword "SenhaIncorreta@999" -url $ApiUrl
  if ($resFail.Status -eq 401) {
    Log-Result -userDesc "$($acc.Description) [Bloqueio]" -targetEmail $acc.Email -passed $true -detail "HTTP 401 retornado ao tentar senha errada (segurança OK)."
  } else {
    $allPassed = $false
    Log-Result -userDesc "$($acc.Description) [Bloqueio]" -targetEmail $acc.Email -passed $false -detail "Falha de validacao: esperado HTTP 401, recebido HTTP $($resFail.Status)."
  }
}

Write-Host "`n--------------------------------------`n" -ForegroundColor Cyan

if (-not $allPassed) {
  Write-Host "Resultado: Uma ou mais contas falharam no teste." -ForegroundColor Red
  exit 1
}

Write-Host "Resultado: Ambas as contas foram autenticadas com sucesso!" -ForegroundColor Green
exit 0