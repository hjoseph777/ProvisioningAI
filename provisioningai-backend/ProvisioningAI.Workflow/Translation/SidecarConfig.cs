using System.Text.Json;
using System.Text.Json.Serialization;

namespace ProvisioningAI.Workflow.Translation;

/// <summary>
/// The sidecar file's real, minimal content: a name-keyed map of VBScript bodies, matching
/// MfilesProperties.md §3.5 Appendix A/B exactly — `script(Name)` in a Mermaid label is a
/// reference, never the code, and the code must live somewhere keyed by that same name.
/// See the accompanying report for why this is narrower than "rule(id)-keyed config for
/// every edge": §3.5 as written has no such generic per-edge external-config indirection —
/// `role(...)`, `after(...)`, and `if(...)` are fully self-contained in the inline Mermaid
/// label. Only the VBScript body needs an out-of-band lookup, because Mermaid labels can't
/// hold multi-line script text.
/// </summary>
public sealed class SidecarConfig
{
    [JsonPropertyName("scripts")]
    public Dictionary<string, string> Scripts { get; init; } = new();

    public static SidecarConfig Empty { get; } = new();

    public static SidecarConfig ParseJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Empty;

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var config = JsonSerializer.Deserialize<SidecarConfig>(json, options);
        return config ?? Empty;
    }

    public static SidecarConfig LoadFromFile(string path)
    {
        var json = File.ReadAllText(path);
        return ParseJson(json);
    }
}
