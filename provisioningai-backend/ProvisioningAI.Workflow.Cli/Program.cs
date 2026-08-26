// Thin CLI wrapper around ProvisioningAI.Workflow's translator, for the Electron
// bridge (M-Files Flow's Live Translating Split-Screen View) to spawn per call.
// Reads Mermaid text from stdin, writes the translated plan as JSON to stdout.
// No sidecar support yet — M-Files Flow has no sidecar-authoring UI, so every
// call translates with SidecarConfig.Empty (VBScript-gated edges resolve with
// an unresolved body, same as any other sidecar-less call to Translate()).
using System.Text;
using ProvisioningAI.Workflow.Translation;

// Without this, stdin/stdout fall back to the OS's default codepage on
// Windows (not UTF-8), silently mangling any accented state name — real,
// found while verifying the ID : Label fix against real Conformity data
// ("Contrôle Apprentissage" round-tripped as "Contr├┤le" through stdin/stdout
// before this). Same recurring pitfall this project has hit and fixed before
// in the PowerShell scripts (see the 2026-08 "enforce UTF-8 output encoding"
// commit) — this is the same fix, ported to this CLI. Console.InputEncoding's
// own setter throws when stdin is redirected/piped (always true for this
// CLI — Electron pipes it, so does every test run here), so the stream is
// reopened directly with an explicit UTF-8 reader instead of using that
// setter. OutputEncoding's setter is safe under redirection and used as-is.
Console.OutputEncoding = Encoding.UTF8;
using var stdin = new StreamReader(Console.OpenStandardInput(), new UTF8Encoding(false));
string mermaidText = stdin.ReadToEnd();

try
{
    var plan = TranslationPipeline.Translate(mermaidText, SidecarConfig.Empty);
    Console.Out.Write(PlanFormatter.ToJson(plan));
    return 0;
}
catch (Exception ex)
{
    Console.Error.Write(ex.Message);
    return 1;
}
