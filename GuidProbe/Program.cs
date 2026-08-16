using System;
using System.Reflection;
using System.Runtime.InteropServices;

class Program 
{
    static void Main() 
    {
        Type type = Type.GetTypeFromProgID("MFilesAPI.MFilesServerApplication");
        dynamic server = Activator.CreateInstance(type);
        server.Connect(1, "", "", "", "ncacn_ip_tcp", "localhost", "2266", "", false);

        dynamic vaults = server.GetOnlineVaults();

        dynamic acme = null;
        dynamic conformity = null;

        for (int i = 1; i <= vaults.Count; i++) {
            dynamic v = vaults[i];
            string guid = (string)v.GUID;
            if (v.Name == "acme") acme = server.LogInAsUserToVault(guid, null, 1, null, null, null);
            if (v.Name == "Conformity") conformity = server.LogInAsUserToVault(guid, null, 1, null, null, null);
        }

        if (acme == null || conformity == null) {
            Console.WriteLine("Could not log into one or both vaults.");
            return;
        }
        
        dynamic FindItem(dynamic collection, string name = null) {
            if (name != null) {
                for(int i=1; i <= collection.Count; i++) {
                    string itemName = null;
                    try { itemName = collection[i].Name; } catch { }
                    if (itemName == null) {
                        try { itemName = collection[i].NamePlural; } catch { }
                    }
                    if (itemName == name) return collection[i];
                }
            }
            if (collection.Count > 0) return collection[1];
            return null;
        }

        void Compare(string typeName, Func<dynamic, dynamic> getCollection, string name) {
            Console.WriteLine($"--- {typeName} ---");
            dynamic aCollection = getCollection(acme);
            dynamic cCollection = getCollection(conformity);
            
            dynamic aItem = FindItem(aCollection, name);
            dynamic cItem = FindItem(cCollection, name);
            
            if (aItem == null || cItem == null) {
                Console.WriteLine("Item not found in one or both vaults.");
                return;
            }
            
            string itemName = null;
            try { itemName = aItem.Name; } catch { }
            if (itemName == null) { try { itemName = aItem.NamePlural; } catch { } }
            
            Console.WriteLine($"Name: {itemName}");
            string idStr = "N/A";
            try { idStr = aItem.ID.ToString(); } catch { }
            string idStrConf = "N/A";
            try { idStrConf = cItem.ID.ToString(); } catch { }
            
            Console.WriteLine($"acme: ID={idStr}, GUID={aItem.GUID}");
            Console.WriteLine($"conf: ID={idStrConf}, GUID={cItem.GUID}");
            
            if (aItem.GUID == cItem.GUID)
                Console.WriteLine("GUIDs MATCH");
            else
                Console.WriteLine("GUIDs DIFFER");
            Console.WriteLine();
        }

        Compare("Property Definition", v => v.PropertyDefOperations.GetPropertyDefs(), "Name or title");
        Compare("Value List", v => v.ValueListOperations.GetValueLists(), "Classes");
        Compare("Object Type", v => v.ObjectTypeOperations.GetObjectTypes(), "Document");
        Compare("Workflow", v => v.WorkflowOperations.GetWorkflowsAdmin(), null); // Just get the first workflow
    }
}
