import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { SkeletonCard } from '../components/SkeletonLoader';
import Modal from '../components/Modal';
import { 
  fetchSecurityPolicies, 
  type SecurityPoliciesResponse, 
  type PolicyRule 
} from '../services/api';
import { 
  ShieldCheck, 
  Sliders, 
  FileCode, 
  Wrench, 
  Key, 
  RefreshCw,
  Search
} from 'lucide-react';

export const Policies: React.FC = () => {
  const [data, setData] = useState<SecurityPoliciesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRule, setSelectedRule] = useState<PolicyRule | null>(null);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const res = await fetchSecurityPolicies();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load security policies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const categories = React.useMemo(() => {
    if (!data?.rules) return ['ALL'];
    const cats = Array.from(new Set(data.rules.map(r => r.category)));
    return ['ALL', ...cats];
  }, [data]);

  const filteredRules = React.useMemo(() => {
    if (!data?.rules) return [];
    return data.rules.filter(r => {
      const matchesSearch = 
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.rule_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'ALL' || r.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [data, searchQuery, selectedCategory]);

  return (
    <div className="dashboard-container">
      <PageHeader 
        title="Security Policies & Rule Registry" 
        description="Inspect deterministic risk gates, prompt heuristics, and tool authorization fences enforced by AgentSentry."
        icon={<ShieldCheck size={20} />}
        actions={
          <button
            type="button"
            className="btn btn-secondary text-xs"
            onClick={loadPolicies}
            disabled={loading}
            title="Reload policies from runtime"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Reload Policies</span>
          </button>
        }
      />

      {error ? (
        <div className="p-4 rounded border border-red-500/30 bg-red-500/10 text-red-200 text-sm mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary text-xs" onClick={loadPolicies}>Retry</button>
        </div>
      ) : null}

      {/* Threshold Gates & Enforcement Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="dashboard-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Gate 1: Allow Threshold</span>
            <Badge variant="safe">SCORE &lt; 30</Badge>
          </div>
          <div className="text-xl font-bold text-text-primary mb-1">Pass &amp; Execute</div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Requests with low risk score (&lt; 30) pass through the Semantic Firewall directly to the active agent runtime or configured model.
          </p>
        </div>

        <div className="dashboard-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Gate 2: Quarantine Threshold</span>
            <Badge variant="medium">SCORE 30 – 69</Badge>
          </div>
          <div className="text-xl font-bold text-color-warning mb-1">Quarantine &amp; Hold</div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Requests exhibiting suspicious traits are halted in quarantine. Requires SecOps analyst approval before dispatching downstream.
          </p>
        </div>

        <div className="dashboard-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Gate 3: Block Threshold</span>
            <Badge variant="critical">SCORE &gt;= 70</Badge>
          </div>
          <div className="text-xl font-bold text-color-critical mb-1">Immediate Block</div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Adversarial vectors, instruction hijacking, or canary exfiltration attempts are severed instantly. An immutable SecurityEvent is created.
          </p>
        </div>
      </div>

      {/* Tool Boundary Permissions & Canary Policy Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Tool Authorization Policy */}
        <div className="dashboard-card border border-border">
          <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-text-primary">Tool Boundary Authorization (MCP)</h3>
            </div>
            <Badge variant="safe">DEFAULT-DENY</Badge>
          </div>
          <p className="text-xs text-text-secondary mb-3">
            Autonomous agents cannot invoke external functions or OS subcommands without an explicit, validated policy allowlist entry.
          </p>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {data?.tool_authorization.authorized_tools.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded bg-surface border border-border text-xs">
                <div>
                  <div className="font-mono text-text-primary font-semibold">{t.tool_name}</div>
                  <div className="text-text-muted text-[11px]">Server: {t.server} &bull; Timeout: {t.max_timeout_sec}s</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-accent-cyan uppercase font-mono">{t.capability}</span>
                  <Badge variant="safe">AUTHORIZED</Badge>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-border text-[11px] text-text-muted flex items-center justify-between">
            <span>Blocked Substrings: <span className="font-mono text-color-critical">rm -rf, sudo, exec(, eval(</span></span>
            <span className="text-color-critical font-semibold">Strict Parameter Fencing</span>
          </div>
        </div>

        {/* Canary Decoy Mesh Policy */}
        <div className="dashboard-card border border-border">
          <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-accent-cyan" />
              <h3 className="text-sm font-semibold text-text-primary">HoneyToken Canary Tripwire Policy</h3>
            </div>
            <Badge variant="safe">EGRESS ENFORCED</Badge>
          </div>
          <p className="text-xs text-text-secondary mb-3">
            Canary tokens are seeded into agent system prompts and memory buffers. The Egress Enforcement Gateway inspects all outbound payloads.
          </p>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded bg-surface border border-border flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary">Canary Leak Enforcement</div>
                <div className="text-text-muted text-[11px]">Action triggered upon egress match</div>
              </div>
              <Badge variant="critical">IMMEDIATE KILL-SWITCH</Badge>
            </div>

            <div className="p-2.5 rounded bg-surface border border-border flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary">Decoy Token Formats</div>
                <div className="text-text-muted text-[11px]">Synthetic credentials mapped per agent</div>
              </div>
              <div className="font-mono text-text-secondary text-[11px]">api_key &bull; db_uri &bull; jwt_bearer</div>
            </div>

            <div className="p-2.5 rounded bg-surface border border-border flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary">Token Secret Redaction</div>
                <div className="text-text-muted text-[11px]">Console &amp; API response masking</div>
              </div>
              <Badge variant="safe">ZERO LEAKAGE</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Heuristic Rule Registry Table */}
      <div className="dashboard-card border border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Sliders size={16} className="text-primary" />
              <span>Deterministic Heuristic Rule Registry ({filteredRules.length} Rules Active)</span>
            </h3>
            <p className="text-xs text-text-muted">
              Fast, deterministic offline patterns evaluated during preprocessing before semantic vector scoring.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="search-bar w-48">
              <Search size={14} className="text-text-muted" />
              <input
                type="text"
                placeholder="Search rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-xs text-text-primary focus:outline-none w-full"
              />
            </div>

            <select
              className="bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'All Categories' : c.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs">
            No security rules match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rule ID</th>
                  <th>Policy Name</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Base Score</th>
                  <th>Action</th>
                  <th>Technical Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => (
                  <tr key={rule.rule_id}>
                    <td className="font-mono text-xs font-semibold text-primary">{rule.rule_id}</td>
                    <td>
                      <div className="font-medium text-text-primary text-xs">{rule.name}</div>
                      <div className="text-[11px] text-text-muted line-clamp-1">{rule.description}</div>
                    </td>
                    <td>
                      <span className="text-[11px] font-mono text-text-secondary uppercase">
                        {rule.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <Badge variant={rule.severity.toLowerCase() as any}>
                        {rule.severity}
                      </Badge>
                    </td>
                    <td>
                      <span className="font-mono text-xs font-semibold text-text-primary">
                        +{rule.base_score}
                      </span>
                    </td>
                    <td>
                      <Badge variant={rule.enforcement === 'BLOCK' ? 'critical' : 'medium'}>
                        {rule.enforcement}
                      </Badge>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary text-xs px-2 py-1 flex items-center gap-1"
                        onClick={() => setSelectedRule(rule)}
                        title="View technical rule specifications"
                      >
                        <FileCode size={12} />
                        <span>View Rule</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Technical Rule Drawer / Modal */}
      {selectedRule && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRule(null)}
          title={`Rule Specification: ${selectedRule.rule_id}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded bg-surface border border-border">
              <div>
                <div className="font-bold text-sm text-text-primary">{selectedRule.name}</div>
                <div className="text-text-muted font-mono">{selectedRule.category} &bull; Engine v{selectedRule.version}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedRule.severity.toLowerCase() as any}>{selectedRule.severity}</Badge>
                <Badge variant={selectedRule.enforcement === 'BLOCK' ? 'critical' : 'medium'}>{selectedRule.enforcement}</Badge>
              </div>
            </div>

            <div>
              <span className="font-semibold text-text-primary block mb-1">Policy Description</span>
              <p className="text-text-secondary leading-relaxed bg-surface p-2.5 rounded border border-border">
                {selectedRule.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded bg-surface border border-border">
                <span className="text-text-muted block mb-0.5">Base Risk Penalty</span>
                <span className="font-mono font-bold text-sm text-color-critical">+{selectedRule.base_score} / 100</span>
              </div>
              <div className="p-2.5 rounded bg-surface border border-border">
                <span className="text-text-muted block mb-0.5">Regex Patterns Compilations</span>
                <span className="font-mono font-bold text-sm text-text-primary">{selectedRule.pattern_count} patterns</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-text-primary block mb-1">Mitigation &amp; Containment Guidance</span>
              <p className="text-text-secondary leading-relaxed bg-surface p-2.5 rounded border border-border">
                {selectedRule.mitigation}
              </p>
            </div>

            <div className="p-2 rounded bg-surface-elevated border border-border text-[11px] text-text-muted">
              Note: Rules are deterministically compiled and evaluated with un-leeting and unicode normalization prior to vector classification.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
export default Policies;
