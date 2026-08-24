param(
    [string]$ServerAddress = 'localhost',
    [int]   $Port          = 2266
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_mfiles-common.ps1"
$srvApp = $null
try {
    $srvApp = New-Object -ComObject MFilesAPI.MFilesServerApplication
    # GetOnlineVaults() returns an EMPTY list on an unauthenticated connection --
    # ConnectWithoutLogin() (transport only, no identity) silently produced zero
    # vaults even though 4 real ones exist and are Admin-visible. Confirmed live,
    # isolated to this one variable: swapping to an authenticated Connect() (Windows
    # SSO) with everything else identical took the result from 0 to 4, matching
    # ClientVaultAccessMSIBuilder.ps1's own independently-verified Get-OnlineVaults.
    # Connect(AuthType, UserName, Password, Domain, ProtocolSequence, NetworkAddress,
    # Endpoint, LocalComputerName, AllowAnonymousConnection) -- 9 args, confirmed
    # signature. AuthType 1 = Windows SSO (no credentials needed).
    $srvApp.Connect(1, '', '', '', 'ncacn_ip_tcp', $ServerAddress, [string]$Port, [System.Net.Dns]::GetHostName(), $false) | Out-Null

    $list = @()
    $online = $srvApp.GetOnlineVaults()
    foreach ($v in $online) {
        try {
            $list += @{ name = [string]$v.Name; guid = [string]$v.GUID }
        } finally {
            [System.Runtime.InteropServices.Marshal]::ReleaseComObject($v) | Out-Null
        }
    }

    # @() | ConvertTo-Json emits nothing at all (empty pipeline, zero output) --
    # explicitly emit '[]' for the zero-vault case so callers can tell "no
    # vaults online" apart from "the script failed to produce a result".
    $json = if ($list.Count -gt 0) { $list | ConvertTo-Json -Depth 3 -Compress } else { '[]' }
    Write-Output "[RESULT]$json"
} catch {
    $msg = $_.Exception.Message
    Write-Output "[ERROR] $msg"
    exit 1
} finally {
    if ($srvApp) {
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($srvApp) | Out-Null } catch { }
        $srvApp = $null
    }
}
