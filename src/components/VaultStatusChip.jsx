import { Database } from 'lucide-react';
import { useWorkflowStore } from '../store/useWorkflowStore';

// Always-visible connection status — every section (Discovery, Docs, Copilot)
// will depend on the same M-Files connection, so it can't stay buried inside
// Studio's collapsed Deliver panel. Reads mfServer/mfVault straight from the
// store Studio already writes to. Icon color carries the connected/disconnected
// signal instead of a separate status dot.
export default function VaultStatusChip() {
  const mfServer = useWorkflowStore(s => s.mfServer);
  const mfVault = useWorkflowStore(s => s.mfVault);
  const connected = !!mfVault?.trim();
  return (
    <div className={`cc-vault-chip ${connected ? 'connected' : ''}`} title={connected ? `Vault: ${mfVault}` : 'No vault configured — set one in Deliver → M-Files Sync'}>
      <Database size={13} strokeWidth={2} color={connected ? 'var(--green)' : 'var(--dim)'} />
      <span>{mfServer?.trim() || 'No vault'}</span>
    </div>
  );
}
