# Required first line for every PowerShell script that talks to M-Files COM and
# writes text back via Write-Output/stdout (workflow/state/property/user names,
# vault names, VBScript action text, etc. can all be real, non-ASCII vendor
# content -- especially in this project's bilingual French/English vaults).
#
# Default console OutputEncoding is a legacy single-byte OEM codepage (confirmed
# live: "OEM United States", CP437), which cannot represent ordinary Unicode text.
# Writing an unmappable character through it does not error -- it silently
# substitutes a WRONG byte. Confirmed live, twice: a real vendor "->" (U+2192) in
# a VBScript comment became an invalid raw 0x1A control byte (which downstream
# JSON.parse correctly rejected); "Contrôle"/"Crédit"/"Découpe" in real Conformity
# state/transition names became "Contr?le"/"Cr?dit" (mojibake, silently wrong,
# no error at all). The underlying M-Files data was never corrupt in either case
# -- this is purely a console output-encoding bug, and it reproduces on ANY
# non-ASCII character, not just the ones caught so far.
#
# Dot-source this file as the FIRST line of any new M-Files-COM script:
#   . "$PSScriptRoot\_mfiles-common.ps1"
# See skills.md's matching entry for the full incident history.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
