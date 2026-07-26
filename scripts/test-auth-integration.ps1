$ErrorActionPreference = "Stop"

$envValues = @{}
Get-Content (Join-Path $PSScriptRoot "..\.env.local") |
    Where-Object { $_ -match "^[A-Za-z_][A-Za-z0-9_]*=" } |
    ForEach-Object {
        $parts = $_ -split "=", 2
        $envValues[$parts[0]] = $parts[1]
    }

$supabaseUrl = $envValues["NEXT_PUBLIC_SUPABASE_URL"]
$serviceKey = $envValues["SUPABASE_SERVICE_ROLE_KEY"]
$appUrl = "http://127.0.0.1:3000"
$mailpitUrl = "http://127.0.0.1:54324"

if (-not $supabaseUrl -or -not $serviceKey) {
    throw "Faltan variables locales de Supabase"
}

$serviceHeaders = @{
    apikey = $serviceKey
    Authorization = "Bearer $serviceKey"
    "Content-Type" = "application/json"
}

function Invoke-Json {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        [object]$Body,
        [Microsoft.PowerShell.Commands.WebRequestSession]$WebSession
    )

    $parameters = @{
        Uri = $Uri
        Method = $Method
        UseBasicParsing = $true
    }
    if ($null -ne $Body) {
        $parameters["ContentType"] = "application/json"
        $parameters["Body"] = $Body | ConvertTo-Json -Depth 8 -Compress
    }
    if ($null -ne $WebSession) {
        $parameters["WebSession"] = $WebSession
    }

    $response = Invoke-WebRequest @parameters
    if (-not $response.Content) {
        return $null
    }
    return $response.Content | ConvertFrom-Json
}

$suffix = [Guid]::NewGuid().ToString("N").Substring(0, 10)
$adminEmail = "admin.integration.$suffix@example.com"
$employeeEmail = "employee.integration.$suffix@example.com"
$changedEmail = "employee.changed.$suffix@example.com"
$adminPassword = "AdminIntegration123!"
$employeePassword = "EmployeeTemp123!"
$newEmployeePassword = "EmployeeChanged123!"
$initialPin = (Get-Random -Minimum 100000 -Maximum 899998).ToString()
$newPin = ([int]$initialPin + 1).ToString()
$adminId = $null
$employeeId = $null

try {
    Write-Output "1/9 Creando administrador temporal"
    $adminAuth = Invoke-RestMethod `
        -Uri "$supabaseUrl/auth/v1/admin/users" `
        -Method POST `
        -Headers $serviceHeaders `
        -Body (@{
            email = $adminEmail
            password = $adminPassword
            email_confirm = $true
            user_metadata = @{
                username = "admin_$suffix"
                full_name = "Admin Integración"
            }
        } | ConvertTo-Json -Depth 5 -Compress)
    $adminId = $adminAuth.id

    Invoke-RestMethod `
        -Uri "$supabaseUrl/rest/v1/profiles?id=eq.$adminId" `
        -Method PATCH `
        -Headers ($serviceHeaders + @{ Prefer = "return=minimal" }) `
        -Body (@{
            role = "admin"
            account_status = "active"
            activated_at = (Get-Date).ToUniversalTime().ToString("o")
        } | ConvertTo-Json -Compress) | Out-Null

    Write-Output "2/9 Iniciando sesión administrativa"
    $adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $adminLogin = Invoke-Json `
        -Uri "$appUrl/api/auth/admin/login" `
        -Method POST `
        -Body @{ identifier = $adminEmail; password = $adminPassword } `
        -WebSession $adminSession
    if (-not $adminLogin.ok) { throw "Falló el login administrativo" }

    Write-Output "3/9 Creando empleado desde el módulo"
    $created = Invoke-Json `
        -Uri "$appUrl/api/admin/users" `
        -Method POST `
        -Body @{
            email = $employeeEmail
            username = "employee_$suffix"
            fullName = "Empleado Integración"
            role = "waiter"
            password = $employeePassword
            pin = $initialPin
        } `
        -WebSession $adminSession
    if (-not $created.ok) { throw "Falló la creación del empleado" }
    $employeeId = $created.user.id

    Write-Output "4/9 Validando contraseña temporal y cambio obligatorio"
    $passwordSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $passwordLogin = Invoke-Json `
        -Uri "$appUrl/api/auth/password/login" `
        -Method POST `
        -Body @{ identifier = $employeeEmail; password = $employeePassword } `
        -WebSession $passwordSession
    if ($passwordLogin.challengeRequired -ne "password") {
        throw "No se exigió el cambio de contraseña inicial"
    }
    $passwordChanged = Invoke-Json `
        -Uri "$appUrl/api/auth/password/change-expired" `
        -Method POST `
        -Body @{
            password = $newEmployeePassword
            confirmation = $newEmployeePassword
        } `
        -WebSession $passwordSession
    if (-not $passwordChanged.ok) { throw "Falló el cambio de contraseña" }

    Write-Output "5/9 Validando PIN temporal y cambio obligatorio"
    $pinSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $pinLogin = Invoke-Json `
        -Uri "$appUrl/api/auth/pin/login" `
        -Method POST `
        -Body @{ pin = $initialPin } `
        -WebSession $pinSession
    if ($pinLogin.challengeRequired -ne "pin") {
        throw "No se exigió el cambio de PIN inicial"
    }
    $pinChanged = Invoke-Json `
        -Uri "$appUrl/api/auth/pin/reset" `
        -Method POST `
        -Body @{ pin = $newPin; confirmation = $newPin } `
        -WebSession $pinSession
    if (-not $pinChanged.ok) { throw "Falló el cambio de PIN" }

    Write-Output "6/9 Validando código de emergencia"
    $emergency = Invoke-Json `
        -Uri "$appUrl/api/admin/users/$employeeId/emergency-code" `
        -Method POST `
        -Body @{} `
        -WebSession $adminSession
    if (-not $emergency.code) { throw "No se generó el código de emergencia" }
    $emergencySession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $emergencyLogin = Invoke-Json `
        -Uri "$appUrl/api/auth/emergency/login" `
        -Method POST `
        -Body @{ code = $emergency.code } `
        -WebSession $emergencySession
    if (-not $emergencyLogin.ok) { throw "Falló el código de emergencia" }

    Write-Output "7/9 Cambiando correo"
    $emailChanged = Invoke-Json `
        -Uri "$appUrl/api/admin/users/$employeeId/email" `
        -Method PATCH `
        -Body @{ email = $changedEmail } `
        -WebSession $adminSession
    if (-not $emailChanged.ok) { throw "Falló el cambio de correo" }

    Write-Output "8/9 Desactivando y reactivando usuario"
    $recovery = Invoke-Json `
        -Uri "$appUrl/api/auth/pin/recovery/request" `
        -Method POST `
        -Body @{ email = $changedEmail }
    if (-not $recovery.ok) { throw "Fallo la solicitud de recuperacion" }
    Start-Sleep -Milliseconds 500
    $mailbox = Invoke-RestMethod -Uri "$mailpitUrl/api/v1/messages" -Method GET
    $recoveryMail = $mailbox.messages |
        Where-Object { $_.To[0].Address -eq $changedEmail } |
        Select-Object -First 1
    if (-not $recoveryMail) {
        throw "El correo de recuperacion no llego a Mailpit"
    }

    $disabled = Invoke-Json `
        -Uri "$appUrl/api/admin/users/$employeeId/status" `
        -Method PATCH `
        -Body @{ status = "disabled"; reason = "Prueba automática" } `
        -WebSession $adminSession
    if (-not $disabled.ok) { throw "Falló la desactivación" }
    $activated = Invoke-Json `
        -Uri "$appUrl/api/admin/users/$employeeId/status" `
        -Method PATCH `
        -Body @{ status = "active" } `
        -WebSession $adminSession
    if (-not $activated.ok) { throw "Falló la reactivación" }

    Write-Output "9/9 Verificando listado administrativo"
    $listing = Invoke-Json `
        -Uri "$appUrl/api/admin/users?q=$suffix" `
        -Method GET `
        -WebSession $adminSession
    if (-not $listing.ok -or $listing.users.Count -lt 2) {
        throw "El listado administrativo no devolvió los usuarios esperados"
    }

    Write-Output "INTEGRATION_AUTH_OK"
}
finally {
    foreach ($userId in @($employeeId, $adminId)) {
        if ($userId) {
            try {
                Invoke-RestMethod `
                    -Uri "$supabaseUrl/auth/v1/admin/users/${userId}?should_soft_delete=false" `
                    -Method DELETE `
                    -Headers $serviceHeaders | Out-Null
            }
            catch {
                Write-Warning "No se pudo limpiar el usuario temporal $userId"
            }
        }
    }
}
