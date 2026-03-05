import { useEffect, useState } from 'react';
import apiKeyService from '../services/apiKey.service';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export default function ApiKeys() {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState(null);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    expiresInDays: 365,
    is_private: false
  });
  const [revealedKeys, setRevealedKeys] = useState(new Set());

  const toggleRevealKey = (id) => {
    setRevealedKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const data = await apiKeyService.getAll();
      setApiKeys(data.data || []);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async (e) => {
    e.preventDefault();

    try {
      const result = await apiKeyService.create(formData);

      // Show the generated key (only shown once!)
      setNewKeyData(result.data);
      setFormData({ name: '', description: '', expiresInDays: 365 });
      setIsModalOpen(false);

      // Refresh the list
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to generate API key:', error);
      alert('Failed to generate API key: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRevoke = async (id, name) => {
    if (!window.confirm(`Are you sure you want to revoke "${name}" ? This will verify disable the key immediately.`)) {
      return;
    }

    try {
      await apiKeyService.revoke(id);
      alert('API key revoked successfully');
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      alert('Failed to revoke API key: ' + error.message);
    }
  };

  const handleActivate = async (id, name) => {
    if (!window.confirm(`Are you sure you want to re-activate "${name}" ?`)) {
      return;
    }

    try {
      await apiKeyService.activate(id);
      alert('API key re-activated successfully');
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to activate API key:', error);
      alert('Failed to activate API key: ' + error.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" ? This will permanently remove the key.`)) {
      return;
    }

    try {
      await apiKeyService.delete(id);
      alert('API key deleted successfully');
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to delete API key:', error);
      alert('Failed to delete API key: ' + error.message);
    }
  };

  const handleTogglePrivacy = async (key) => {
    try {
      await apiKeyService.update(key.id, { is_private: !key.is_private });
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to toggle privacy:', error);
      alert('Failed to toggle privacy: ' + error.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('API Key copied to clipboard!');
  };

  const closeNewKeyModal = () => {
    setNewKeyData(null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          🔑 Generate API Key
        </button>
      </div>

      {/* Show newly generated key */}
      {newKeyData && (
        <div className="mb-6 p-6 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-yellow-500 mb-2">
                ⚠️ API Key Generated Successfully!
              </h3>
              <p className="text-sm text-yellow-400 mb-4">
                <strong>IMPORTANT:</strong> Copy this key now. You won't be able to see it again!
              </p>
            </div>
            <button
              onClick={closeNewKeyModal}
              className="text-yellow-500 hover:text-yellow-300 text-xl font-bold"
            >
              ✕
            </button>
          </div>

          <div className="bg-dark-900 p-4 rounded border border-yellow-900/50">
            <label className="block text-xs font-medium text-slate-400 mb-2">
              API Key Name: {newKeyData.keyInfo.name}
            </label>
            <div className="flex flex-col md:flex-row items-center gap-2">
              <code className="w-full md:flex-1 bg-dark-950 px-4 py-3 rounded font-mono text-sm break-all text-yellow-400 border border-dark-800 text-center md:text-left">
                {newKeyData.apiKey}
              </code>
              <button
                onClick={() => copyToClipboard(newKeyData.apiKey)}
                className="btn btn-primary whitespace-nowrap w-full md:w-auto"
              >
                📋 Copy Key
              </button>
            </div>
          </div>
        </div>
      )}

      {apiKeys.length === 0 ? (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-12 text-center">
          <p className="text-slate-400 mb-4">No API keys yet. Generate your first one!</p>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
            🔑 Generate API Key
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <div key={key.id} className="bg-dark-900 border border-dark-800 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="flex-1 w-full min-w-0">
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white truncate max-w-[200px] md:max-w-none">{key.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full border whitespace-nowrap ${key.is_active
                      ? 'bg-teal-900/20 text-teal-500 border-teal-900/50'
                      : 'bg-red-900/20 text-red-400 border-red-900/50'
                      }`}>
                      {key.is_active ? '✓ Active' : '✕ Revoked'}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full border whitespace-nowrap ${key.is_private ? 'bg-amber-900/20 text-amber-500 border-amber-900/50' : 'bg-teal-900/20 text-teal-500 border-teal-900/50'}`}>
                      {key.is_private ? '🔒 Private' : '🔓 Shared'}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full border bg-dark-800 text-slate-400 border-dark-700 whitespace-nowrap">
                      👤 {key.creator_name || 'System'}
                    </span>
                    {key.expires_at && new Date(key.expires_at) < new Date() && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-orange-900/20 text-orange-400 border border-orange-900/50 whitespace-nowrap">
                        ⚠️ Expired
                      </span>
                    )}
                  </div>

                  {key.description && (
                    <p className="text-sm text-slate-400 mb-2 truncate">{key.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400 mb-3">
                    <span className="flex items-center gap-2">
                      Key:
                      {key.full_key ? (
                        <div className="flex items-center gap-2 group/key">
                          {revealedKeys.has(key.id) ? (
                            <>
                              <code className="bg-dark-950 px-2 py-1 rounded text-xs text-yellow-500 border border-dark-800 font-mono select-all">
                                {key.full_key}
                              </code>
                              <button
                                onClick={() => copyToClipboard(key.full_key)}
                                className="text-slate-500 hover:text-white transition-opacity"
                                title="Copy API Key"
                              >
                                <i className="bi bi-clipboard"></i>
                              </button>
                              <button
                                onClick={() => toggleRevealKey(key.id)}
                                className="text-slate-500 hover:text-white transition-opacity"
                                title="Hide Key"
                              >
                                <i className="bi bi-eye-slash-fill"></i>
                              </button>
                            </>
                          ) : (
                            <>
                              <code className="bg-dark-950 px-2 py-1 rounded text-xs text-slate-300 border border-dark-800 font-mono">
                                {key.key_prefix}••••••••
                              </code>
                              <button
                                onClick={() => toggleRevealKey(key.id)}
                                className="text-slate-500 hover:text-white transition-opacity"
                                title="Reveal Key"
                              >
                                <i className="bi bi-eye-fill"></i>
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <code className="bg-dark-950 px-2 py-1 rounded text-xs text-slate-300 border border-dark-800">
                          {key.key_prefix}••••••••
                        </code>
                      )}
                    </span>
                    {key.expires_at && (
                      <span className="whitespace-nowrap">Expires: {new Date(key.expires_at).toLocaleDateString()}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="whitespace-nowrap">Created: {new Date(key.created_at).toLocaleDateString()}</span>
                    <span className="whitespace-nowrap">Last Used: {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}</span>
                    <span className="whitespace-nowrap">Total Requests: {key.request_count || 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 md:mt-0 flex-wrap justify-end md:flex-nowrap">
                  {(user?.role === 'admin' || key.user_id === user?.id) ? (
                    <>

                      {!!key.is_active ? (
                        <>
                          <button
                            onClick={() => handleTogglePrivacy(key)}
                            className="p-2 text-amber-500 hover:bg-amber-600/10 rounded-lg transition-colors"
                            title={key.is_private ? 'Make Shared' : 'Make Private'}
                          >
                            <i className={`bi ${key.is_private ? 'bi-lock-fill' : 'bi-unlock-fill'} text-lg`}></i>
                          </button>
                          <button
                            onClick={() => handleRevoke(key.id, key.name)}
                            className="p-2 text-orange-500 hover:bg-orange-600/10 rounded-lg transition-colors"
                            title="Revoke Key"
                          >
                            <i className="bi bi-slash-circle text-lg"></i>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleActivate(key.id, key.name)}
                          className="p-2 text-teal-500 hover:bg-teal-600/10 rounded-lg transition-colors"
                          title="Re-activate Key"
                        >
                          <i className="bi bi-check-circle text-lg"></i>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(key.id, key.name)}
                        className="p-2 text-red-500 hover:bg-red-600/10 rounded-lg transition-colors"
                        title="Delete Key"
                      >
                        <i className="bi bi-trash3 text-lg"></i>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <i className={`bi ${key.is_private ? 'bi-lock-fill text-amber-500' : 'bi-unlock-fill text-teal-500'} text-lg p-2`} title="Shared Resource"></i>
                      <span className="text-xs text-slate-500 italic">Read-only</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
      }

      {/* Generate API Key Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Generate New API Key"
        size="md"
      >
        <form onSubmit={handleGenerateKey} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Key Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="input w-full"
              placeholder="Production API Key"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              A descriptive name to identify this key
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="input w-full"
              rows={3}
              placeholder="Used for production mobile app..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Expires In (Days)
            </label>
            <select
              value={formData.expiresInDays}
              onChange={(e) => setFormData(prev => ({ ...prev, expiresInDays: parseInt(e.target.value) }))}
              className="input w-full"
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>1 year</option>
              <option value={730}>2 years</option>
              <option value={0}>Never expires</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_private"
              checked={formData.is_private}
              onChange={(e) => setFormData(prev => ({ ...prev, is_private: e.target.checked }))}
              className="w-4 h-4 bg-dark-950 border-dark-800 text-teal-600 rounded focus:ring-teal-500"
            />
            <label htmlFor="is_private" className="text-sm font-medium text-slate-300 cursor-pointer">
              🔒 Private Key (Only you can manage it)
            </label>
          </div>

          <div className="p-4 bg-dark-800/10 border border-dark-800/30 rounded">
            <p className="text-sm text-teal-400 font-semibold mb-1">🔒 Security Note</p>
            <p className="text-xs text-teal-300">
              The API key will be shown only once after generation. Make sure to copy and store it securely.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              🔑 Generate Key
            </button>
          </div>
        </form>
      </Modal>
    </div >
  );
}
