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
    return $response.Content | ConvertFrom-Json
}

$suffix = [Guid]::NewGuid().ToString("N").Substring(0, 10)
$adminEmail = "campaign.admin.$suffix@example.com"
$adminPassword = "CampaignAdmin123!"
$adminId = $null
$productId = [Guid]::NewGuid().ToString()
$campaignId = $null

try {
    Write-Output "1/8 Creando administrador y plato temporales"
    $adminAuth = Invoke-RestMethod `
        -Uri "$supabaseUrl/auth/v1/admin/users" `
        -Method POST `
        -Headers $serviceHeaders `
        -Body (@{
            email = $adminEmail
            password = $adminPassword
            email_confirm = $true
            user_metadata = @{
                username = "campaign_admin_$suffix"
                full_name = "Admin Campana"
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

    Invoke-RestMethod `
        -Uri "$supabaseUrl/rest/v1/products" `
        -Method POST `
        -Headers ($serviceHeaders + @{ Prefer = "return=minimal" }) `
        -Body (@{
            id = $productId
            name = "Plato Campana $suffix"
            price = 4.50
            category = "Platos"
            stock = 10
        } | ConvertTo-Json -Compress) | Out-Null

    Write-Output "2/8 Iniciando sesion administrativa"
    $adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $login = Invoke-Json `
        -Uri "$appUrl/api/auth/admin/login" `
        -Method POST `
        -Body @{ identifier = $adminEmail; password = $adminPassword } `
        -WebSession $adminSession
    if (-not $login.ok) { throw "Fallo el login administrativo" }

    Write-Output "3/8 Creando campana"
    $created = Invoke-Json `
        -Uri "$appUrl/api/admin/campaigns" `
        -Method POST `
        -Body @{
            title = "Campana $suffix"
            description = "Descripcion para prueba integral"
            reward = "Premio de prueba"
        } `
        -WebSession $adminSession
    if (-not $created.ok) { throw "Fallo la creacion de campana" }
    $campaignId = $created.campaign.id
    $slug = $created.campaign.slug
    $listing = Invoke-Json `
        -Uri "$appUrl/api/admin/campaigns" `
        -WebSession $adminSession
    if (-not $listing.ok -or $listing.campaigns.id -notcontains $campaignId) {
        throw "La campana no aparecio en el listado"
    }

    Write-Output "4/8 Consultando formulario publico"
    $public = Invoke-Json -Uri "$appUrl/api/campaigns/$slug"
    if (-not $public.ok -or $public.products.id -notcontains $productId) {
        throw "El formulario no devolvio los platos esperados"
    }

    Write-Output "5/8 Enviando respuesta publica"
    $submitted = Invoke-Json `
        -Uri "$appUrl/api/campaigns/$slug" `
        -Method POST `
        -Body @{
            fullName = "Cliente Prueba"
            email = "cliente.$suffix@example.com"
            phone = "0999999999"
            favoriteProductId = $productId
            sector = "otros"
            otherSector = "Sector Prueba"
            suggestions = "Todo correcto"
            consent = $true
        }
    if (-not $submitted.ok) { throw "Fallo el envio publico" }

    Write-Output "6/8 Verificando respuesta administrativa"
    $detail = Invoke-Json `
        -Uri "$appUrl/api/admin/campaigns/$campaignId" `
        -WebSession $adminSession
    if (-not $detail.ok -or $detail.campaign.responses.Count -ne 1) {
        throw "La respuesta no aparecio en el modulo administrativo"
    }

    Write-Output "7/8 Editando y cerrando campana"
    $updated = Invoke-Json `
        -Uri "$appUrl/api/admin/campaigns/$campaignId" `
        -Method PATCH `
        -Body @{
            title = "Campana editada $suffix"
            description = "Descripcion actualizada"
            reward = "Premio actualizado"
            status = "closed"
        } `
        -WebSession $adminSession
    if (-not $updated.ok -or $updated.campaign.status -ne "closed") {
        throw "Fallo la edicion de campana"
    }

    Write-Output "8/8 Verificando cierre publico"
    try {
        Invoke-WebRequest `
            -Uri "$appUrl/api/campaigns/$slug" `
            -Method GET `
            -UseBasicParsing | Out-Null
        throw "Una campana cerrada siguio disponible"
    }
    catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 404) {
            throw
        }
    }

    Write-Output "INTEGRATION_CAMPAIGN_OK"
}
finally {
    if ($campaignId) {
        Invoke-RestMethod `
            -Uri "$supabaseUrl/rest/v1/campaign_responses?campaign_id=eq.$campaignId" `
            -Method DELETE `
            -Headers $serviceHeaders | Out-Null
        Invoke-RestMethod `
            -Uri "$supabaseUrl/rest/v1/campaigns?id=eq.$campaignId" `
            -Method DELETE `
            -Headers $serviceHeaders | Out-Null
    }
    Invoke-RestMethod `
        -Uri "$supabaseUrl/rest/v1/products?id=eq.$productId" `
        -Method DELETE `
        -Headers $serviceHeaders | Out-Null
    if ($adminId) {
        Invoke-RestMethod `
            -Uri "$supabaseUrl/auth/v1/admin/users/${adminId}?should_soft_delete=false" `
            -Method DELETE `
            -Headers $serviceHeaders | Out-Null
    }
}
