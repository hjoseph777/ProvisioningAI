param(
    [string]$VaultGuid     = '{E7E445BE-3AEF-425F-9D4D-BFCC33008C9E}',
    [string]$ServerAddress = 'localhost',
    [int]   $Port          = 2266,
    [string]$AuthType      = 'Windows',
    [string]$Username      = '',
    [string]$Password      = '',
    [switch]$ListOnly,
    [string]$WorkflowIds   = ''
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_mfiles-common.ps1"

function pLog  { param([string]$m) Write-Output "[PROGRESS] $m"; [Console]::Out.Flush() }

# ConvertTo-Json does not escape every C0 control character the JSON spec requires
# (confirmed: a raw 0x1A/SUB inside a real workflow's VBScript action comment,
# "' ALIAS <SUB> ID", passed straight through as a literal unescaped byte -- valid
# per ConvertTo-Json's own rules, invalid JSON per spec, and JSON.parse on the
# Electron side correctly rejects it as "Bad control character in string literal").
# Strip any raw C0 control byte ConvertTo-Json doesn't already escape correctly
# (tab/newline/carriage-return ARE escaped correctly and are left alone).
function ConvertTo-JsonSafeString {
    param([string]$Text)
    if ($null -eq $Text) { return $Text }
    $chars = $Text.ToCharArray() | Where-Object {
        $code = [int]$_
        $code -ge 0x20 -or $code -eq 0x09 -or $code -eq 0x0A -or $code -eq 0x0D
    }
    return -join $chars
}

function Is-VisibleWorkflow {
    param([object]$wf)

    if ($null -eq $wf) { return $false }

    # Exclude deleted/hidden/system-like entries when those flags are available.
    foreach ($flag in @('Deleted','IsDeleted','Hidden','IsHidden')) {
        try {
            if ($wf.PSObject.Properties.Name -contains $flag) {
                if ([bool]$wf.$flag) { return $false }
            }
        } catch { }
    }

    return $true
}

try {
    pLog "Connecting to $ServerAddress via MFilesServerApplication..."
    $srvApp = New-Object -ComObject MFilesAPI.MFilesServerApplication
    $srvApp.ConnectWithoutLogin($null, 'ncacn_ip_tcp', $ServerAddress, [string]$Port, '', '', '') | Out-Null
    
    if ($AuthType -ieq 'Windows') {
        pLog "Auth: Windows SSO (MFAuthType=1)"
        $vault = $srvApp.LogInAsUserToVault($VaultGuid, $null, 1, $null, $null, $null)
    } else {
        pLog "Auth: M-Files user '$Username' (MFAuthType=3)"
        $vault = $srvApp.LogInAsUserToVault($VaultGuid, $null, 3, $Username, $Password, $null)
    }
    pLog "Connected to vault."

    if ($ListOnly) {
        $list = @()
        $seen = @{}

        # Prefer non-admin list to match what users expect in vault UI.
        # Some environments return extra admin-scope entries via GetWorkflowsAdmin().
        try {
            $workflows = $vault.WorkflowOperations.GetWorkflows()
            foreach ($wf in $workflows) {
                if (-not (Is-VisibleWorkflow $wf)) { continue }
                $id = [int]$wf.ID
                $name = ConvertTo-JsonSafeString ([string]$wf.Name)
                if ($id -le 0 -or [string]::IsNullOrWhiteSpace($name)) { continue }
                if ($seen.ContainsKey($id)) { continue }
                $seen[$id] = $true
                $list += @{ id = $id; name = $name }
            }
        }
        catch {
            # Fallback for environments where GetWorkflows() is not available.
            $workflows = $vault.WorkflowOperations.GetWorkflowsAdmin()
            foreach ($wf in $workflows) {
                $core = $wf.Workflow
                if (-not (Is-VisibleWorkflow $core)) { continue }
                $id = [int]$core.ID
                $name = ConvertTo-JsonSafeString ([string]$core.Name)
                if ($id -le 0 -or [string]::IsNullOrWhiteSpace($name)) { continue }
                if ($seen.ContainsKey($id)) { continue }
                $seen[$id] = $true
                $list += @{ id = $id; name = $name }
            }
        }

        # @() | ConvertTo-Json emits nothing at all (empty pipeline, zero output) --
        # explicitly emit '[]' for the zero-workflow case (a real, valid result --
        # a vault with no workflows -- not a script failure) so the caller gets
        # parseable JSON either way instead of a bare "[RESULT]" with nothing after it.
        $json = if ($list.Count -gt 0) { $list | ConvertTo-Json -Depth 5 -Compress } else { '[]' }
        Write-Output "[RESULT]$json"
        exit 0
    }

    if (-not $WorkflowIds) {
        throw "Must provide -WorkflowIds when not using -ListOnly"
    }

    $ids = $WorkflowIds.Split(',') | ForEach-Object { [int]$_ }
    $results = @()

    # State GUIDs don't live on IState/IStateAdmin directly -- M-Files resolves
    # them through the built-in "States" value list (ID 8), where each item
    # carries the state's integer ID (matching StateAdmin.ID) and its real
    # ItemGUID. Same mechanism ProvisioningAI.Discovery's WorkflowScanner.cs
    # already uses (MFilesBuiltInValueListIds.States = 8) for an unrelated
    # pipeline -- fetched once here, off the same connection, and joined
    # per-state below. Confirmed live against Conformity: 47/47 real states
    # matched via this exact join.
    pLog "Resolving state GUIDs via built-in States value list..."
    $stateGuidItems = $vault.ValueListItemOperations.GetValueListItems(8, $true)
    $guidByMFilesId = @{}
    foreach ($item in $stateGuidItems) {
        $guidByMFilesId[[int]$item.ID] = [string]$item.ItemGUID
    }

    foreach ($id in $ids) {
        pLog "Fetching workflow ID $id..."
        $wfAdmin = $vault.WorkflowOperations.GetWorkflowAdmin($id)

        $wfJson = @{
            id          = $wfAdmin.Workflow.ID
            name        = ConvertTo-JsonSafeString $wfAdmin.Workflow.Name
            source      = 'mfiles'
            importedAt  = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
            states      = @()
            transitions = @()
            scripts     = @()
            rules       = @()
        }

        # LayoutData is M-Files Admin's own real, human-authored canvas layout
        # for this workflow (per-state {GUID,x,y}, plus scale/scroll position) --
        # reachable directly off the same $wfAdmin already fetched above, no
        # extra COM call needed. Parsed here (not left as a raw string) so the
        # final ConvertTo-Json below emits it as a real nested object instead
        # of double-encoding it. A workflow nobody has arranged in M-Files
        # Admin yet has an empty stateLayout -- confirmed live, a real case,
        # not hypothetical -- so this is deliberately left absent/null rather
        # than an empty placeholder object in that case.
        if ($wfAdmin.LayoutData) {
            try {
                $wfJson.layoutData = $wfAdmin.LayoutData | ConvertFrom-Json
            } catch {
                pLog "  (LayoutData present but failed to parse -- continuing without it: $($_.Exception.Message))"
            }
        }

        # Build ID to Name map for transitions
        $stateMap = @{}
        foreach ($s in $wfAdmin.States) {
            $safeName = ConvertTo-JsonSafeString $s.Name
            $stateMap[$s.ID] = $safeName

            # Map state
            $stateJson = @{
                name = $safeName
                initial = $false # Initial logic might need tweaking based on M-Files semantics, usually ID=0 or logic.
            }
            $stateGuid = $guidByMFilesId[[int]$s.ID]
            if ($stateGuid) {
                $stateJson.guid = $stateGuid
            }
            if ($s.SemanticAliases -and $s.SemanticAliases.Value) {
                $stateJson.alias = ConvertTo-JsonSafeString $s.SemanticAliases.Value
            }
            # Add action text if present (to avoid data loss) -- this is real,
            # human-authored VBScript and the most likely place to carry stray
            # control-character artifacts (confirmed live: a raw 0x1A here).
            if ($s.ActionRunVBScript) {
                $wfJson.scripts += @{
                    state = $safeName
                    text  = ConvertTo-JsonSafeString $s.ActionRunVBScriptDefinition
                }
            }
            $wfJson.states += $stateJson
        }

        # First state might be considered initial if there's no clear 'initial' property in StateAdmin
        if ($wfJson.states.Count -gt 0) {
            $wfJson.states[0].initial = $true
        }

        foreach ($t in $wfAdmin.StateTransitions) {
            $fromName = if ($t.FromState) { $stateMap[$t.FromState] } else { $null }
            $toName   = if ($t.ToState)   { $stateMap[$t.ToState] } else { $null }
            
            if ($fromName -and $toName) {
                $transJson = @{
                    from  = $fromName
                    to    = $toName
                    label = ConvertTo-JsonSafeString $t.Name
                }

                # Real trigger data -- same COM properties ProvisioningAI.
                # MFilesConnectors/VaultHandle.cs already proves live
                # (TriggerMode/TriggerInDays/TriggerAllowedByVBScript).
                # Studio's own pull path never read any of this before, so
                # every imported transition defaulted to conditions=null --
                # rendering solid/manual regardless of what the real vault
                # actually stored. TriggerMode: 0=Manual, 4=AutomaticCriteria,
                # 5=AutomaticVBScript (ProvisioningAI.Workflow.Translation.
                # Models.cs's own TriggerMode enum). Mapped onto the app's
                # existing conditions grammar (utils/transitionGrammar.js):
                # after(Nd)/script(Name) where the real data is unambiguous,
                # else auto(4)/auto(5) -- the grammar's own already-decided
                # "confirmed automatic, specific criteria not decoded"
                # fallback (mirrors EdgeResolver.cs's §3.5 Decision 6) for a
                # real property-criteria guard, whose actual condition text
                # is an opaque M-Files search-condition export, not
                # something this script fabricates a Property=Value out of.
                $triggerMode = [int]$t.TriggerMode

                # TriggerInDays is a real, always-present field on every transition,
                # manual and automatic alike -- MfilesProperties.md 1.2's own confirmed
                # finding, since re-verified against real archived Conformity data, is
                # that it carries M-Files Admin's own stored default (365) on the
                # overwhelming majority of transitions REGARDLESS of what actually
                # gates the trigger. Checking "TriggerInDays > 0" alone therefore cannot
                # tell a real day-based trigger apart from a real criteria-based one
                # that merely never had this inert field touched -- confirmed live via
                # a real transition ("Duplicate=YES" -> "3- Controle doublon") that
                # M-Files Admin's own Graphical Workflow Designer describes as
                # genuinely criteria-based ("once the object fulfills the specified
                # criteria"), which this script was rendering as after(365d) before
                # this fix, solely because TriggerInDays also happened to carry the
                # same inert default. Real criteria presence -- TriggerCriteria.Count
                # -- is the same live-proven signal VaultHandle.cs's own connector
                # already uses (see its ReadTransitions), so it is checked FIRST and
                # wins over the day-count fallback whenever both are present.
                # rawCriteria: the same opaque GetAsExportedSearchString(0) export
                # VaultHandle.cs's own connector already reads (see its
                # ReadTransitions) -- not human-readable (no Property=Value
                # decoding here, real Decision 6 scope, still deferred), but a
                # real, distinct-per-transition value, captured so two different
                # auto(4) transitions are no longer visually indistinguishable
                # from each other -- confirmed live, 2026-08-25, that the plain
                # "not decoded" flag alone can't tell them apart even though
                # their real underlying criteria genuinely differ.
                $hasCriteria = $false
                try {
                    if ($t.TriggerCriteria -and [int]$t.TriggerCriteria.Count -gt 0) {
                        $hasCriteria = $true
                        $transJson.rawCriteria = ConvertTo-JsonSafeString ([string]$t.TriggerCriteria.GetAsExportedSearchString(0))
                    }
                } catch { }

                if ($triggerMode -eq 4 -and $hasCriteria) {
                    $transJson.conditions = "auto(4)"
                } elseif ($triggerMode -eq 4 -and [int]$t.TriggerInDays -gt 0) {
                    $transJson.conditions = "after($([int]$t.TriggerInDays)d)"
                } elseif ($triggerMode -eq 5 -and $t.TriggerAllowedByVBScript) {
                    $transJson.conditions = "script($(ConvertTo-JsonSafeString ([string]$t.TriggerAllowedByVBScript)))"
                } elseif ($triggerMode -eq 4 -or $triggerMode -eq 5) {
                    $transJson.conditions = "auto($triggerMode)"
                }

                # M-Files Flow's own canvas (MFlowCanvas.jsx) reads a
                # SEPARATE `style` field for dashed-vs-solid, not `conditions`
                # (that one's Studio's own mechanism) -- confirmed by reading
                # its render code directly, not assumed. Set from the exact
                # same real TriggerMode so both canvases agree, rather than
                # leaving M-Files Flow's copy of the same imported data solid
                # by default the way Studio's used to be.
                $transJson.style = if ($triggerMode -eq 4 -or $triggerMode -eq 5) { 'automatic' } else { 'manual' }

                $wfJson.transitions += $transJson
            }
        }
        
        $results += $wfJson
    }

    $finalJson = $results | ConvertTo-Json -Depth 10 -Compress
    Write-Output "[RESULT]$finalJson"
} catch {
    $msg = $_.Exception.Message
    Write-Output "[ERROR] $msg"
    exit 1
}
