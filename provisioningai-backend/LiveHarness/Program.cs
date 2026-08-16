// READ-ONLY follow-up: re-check task 314715 (FindDuplicates, object 5431) to see
// whether it ever leaves State=Waiting -- directly tests whether anything is
// currently consuming the Docned.WorkflowToolbox.Concurrent queue at all on this
// vault, independent of whether object 5431 ever reaches RTE_Approval/132.
// No writes, no new objects.

using System.Runtime.InteropServices;

const string ConformityGuid = "{F542FB91-9563-4506-929F-BC279D1D5B37}";

var srvType = Type.GetTypeFromProgID("MFilesAPI.MFilesServerApplication") ?? throw new InvalidOperationException("COM class not registered.");
dynamic srvApp = Activator.CreateInstance(srvType)!;
dynamic NewCom(string name) => Activator.CreateInstance(Type.GetTypeFromProgID($"MFilesAPI.{name}") ?? throw new InvalidOperationException($"{name} not registered."))!;

void DumpQueue(dynamic vault, string queueId, string label)
{
    dynamic taskOps = vault.ApplicationTaskOperations;
    dynamic states = NewCom("IDs");
    foreach (int s in new[] { 0, 1, 2, 3, 4 }) states.Add(-1, s);
    dynamic taskIds = taskOps.GetTaskIDsFromQueue(queueId, states);
    Console.WriteLine($"[{label}] [{queueId}] task count: {taskIds.Count}");
    if (taskIds.Count == 0) return;
    dynamic taskInfos = taskOps.GetTasks(taskIds);
    for (int i = 1; i <= taskInfos.Count; i++)
    {
        dynamic info = taskInfos[i];
        Console.WriteLine($"    Task {info.TaskID}: State={info.State}, TaskType={info.TaskType}, Progress={info.Progress}");
    }
}

try
{
    srvApp.Connect(1, "", "", "", "ncacn_ip_tcp", "localhost", "2266", System.Net.Dns.GetHostName(), false);
    dynamic vault = srvApp.LogInAsUserToVault(ConformityGuid, null, 1, null, null, null);
    Console.WriteLine("Logged into Conformity_CP1.");

    for (int i = 0; i < 6; i++)
    {
        DumpQueue(vault, "Docned.WorkflowToolbox.Concurrent", $"T+{i * 20}s");
        if (i < 5) Thread.Sleep(20000);
    }

    vault.LogOutSilent();
    Console.WriteLine("\nDONE.");
}
finally { Marshal.ReleaseComObject(srvApp); }
