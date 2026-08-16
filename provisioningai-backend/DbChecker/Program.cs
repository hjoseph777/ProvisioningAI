using System;
using Microsoft.Data.Sqlite;

class Program
{
    static void Main()
    {
        var connectionString = "Data Source=../ProvisioningAI.Data/provisioning.db;Foreign Keys=True;";
        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = "PRAGMA foreign_keys;";
        var fkStatus = command.ExecuteScalar();
        Console.WriteLine($"\n--- PRAGMA foreign_keys; ---");
        Console.WriteLine(fkStatus);
        
        Console.WriteLine($"\n--- .schema ---");
        command.CommandText = "SELECT sql FROM sqlite_master WHERE (type='table' OR type='index') AND sql IS NOT NULL;";
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            Console.WriteLine(reader.GetString(0) + ";\n");
        }
    }
}
