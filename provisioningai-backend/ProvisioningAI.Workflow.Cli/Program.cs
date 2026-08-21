// Thin CLI wrapper around ProvisioningAI.Workflow's translator, for the Electron
// bridge (M-Files Flow's Live Translating Split-Screen View) to spawn per call.
// Reads Mermaid text from stdin, writes the translated plan as JSON to stdout.
// No sidecar support yet — M-Files Flow has no sidecar-authoring UI, so every
// call translates with SidecarConfig.Empty (VBScript-gated edges resolve with
// an unresolved body, same as any other sidecar-less call to Translate()).
using ProvisioningAI.Workflow.Translation;

string mermaidText = Console.In.ReadToEnd();

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
