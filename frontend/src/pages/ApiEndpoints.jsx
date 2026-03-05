import { useEffect, useState } from 'react';
import axios from 'axios';
import apiEndpointService from '../services/apiEndpoint.service';
import Modal from '../components/Modal';
import ApiEndpointForm from '../components/ApiEndpointForm';
import { useAuth } from '../context/AuthContext';

export default function ApiEndpoints() {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState(null);
  const { user } = useAuth();
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState(null);
  const [testParams, setTestParams] = useState({});
  const [testApiKey, setTestApiKey] = useState('');

  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState(null);
  const [serverIp, setServerIp] = useState(null);

  // Search and Filter State
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetchEndpoints();
    fetchServerInfo();
  }, [search, selectedGroup]);

  const fetchServerInfo = async () => {
    try {
      // Use relative URL to go through Vite proxy in development
      const response = await axios.get('/server-info');
      setServerIp(response.data.serverIp);
    } catch (error) {
      console.error('Failed to fetch server info:', error);
      // Fallback to current hostname
      setServerIp(window.location.hostname);
    }
  };

  const fetchEndpoints = async () => {
    try {
      const data = await apiEndpointService.getAll({
        search: search || undefined,
        groupName: selectedGroup || undefined
      });
      setEndpoints(data.data);

      // Only update groups list if we're not currently filtering by group
      // This keeps the dropdown list stable
      if (!selectedGroup && !search) {
        const uniqueGroups = [...new Set(data.data.map(e => e.group_name).filter(Boolean))].sort();
        setGroups(uniqueGroups);
      }
    } catch (error) {
      console.error('Failed to fetch API endpoints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEndpoint(null);
    setIsModalOpen(true);
  };

  const handleEdit = (endpoint) => {
    if (!window.confirm(`Are you sure you want to edit "${endpoint.name}"?`)) return;

    let parameters = [];
    try {
      if (typeof endpoint.parameters === 'string') {
        parameters = JSON.parse(endpoint.parameters);
      } else if (Array.isArray(endpoint.parameters)) {
        parameters = endpoint.parameters;
      }
    } catch (e) {
      console.error('Failed to parse parameters:', e);
      parameters = [];
    }

    const mappedEndpoint = {
      ...endpoint,
      path: endpoint.endpoint_id || endpoint.path,
      query: endpoint.sql_query || endpoint.query,
      http_method: endpoint.http_method,
      data_source_id: endpoint.data_source_id,
      is_active: endpoint.is_active,
      auth_mode: endpoint.is_public ? 'public' : 'api_key',
      parameters: parameters,
      group_name: endpoint.group_name || ''
    };
    setEditingEndpoint(mappedEndpoint);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingEndpoint && editingEndpoint.id) {
        await apiEndpointService.update(editingEndpoint.id, formData);
      } else {
        await apiEndpointService.create(formData);
      }
      setIsModalOpen(false);
      fetchEndpoints();
    } catch (error) {
      console.error('Failed to save API endpoint:', error);
      alert('Failed to save API endpoint: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this API endpoint?')) return;

    try {
      await apiEndpointService.delete(id);
      fetchEndpoints();
    } catch (error) {
      console.error('Failed to delete API endpoint:', error);
      alert('Failed to delete API endpoint: ' + error.message);
    }
  };

  const handleTogglePrivacy = async (endpoint) => {
    try {
      await apiEndpointService.update(endpoint.id, { is_private: !endpoint.is_private });
      fetchEndpoints();
    } catch (error) {
      console.error('Failed to toggle privacy:', error);
      alert('Failed to toggle privacy: ' + error.message);
    }
  };

  const copyEndpointUrl = (path) => {
    // Use server's actual network IP address
    const ip = serverIp || window.location.hostname;
    const url = `http://${ip}:3000/api/v1/${path}`;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url)
        .then(() => alert('Endpoint URL copied!'))
        .catch(() => fallbackCopyTextToClipboard(url, 'Endpoint URL copied!'));
    } else {
      fallbackCopyTextToClipboard(url, 'Endpoint URL copied!');
    }
  };

  const fallbackCopyTextToClipboard = (text, successMessage = 'Copied!') => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert(successMessage);
      } else {
        alert('Unable to copy. Please copy manually.');
      }
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      alert('Unable to copy. Please copy manually.');
    }
    document.body.removeChild(textArea);
  };

  const handleDuplicate = (endpoint) => {
    if (!window.confirm(`Do you want to duplicate "${endpoint.name}"?`)) return;

    let parameters = [];
    try {
      if (typeof endpoint.parameters === 'string') {
        parameters = JSON.parse(endpoint.parameters);
      } else if (Array.isArray(endpoint.parameters)) {
        parameters = endpoint.parameters;
      }
    } catch (e) {
      console.error('Failed to parse parameters:', e);
      parameters = [];
    }

    const mappedEndpoint = {
      ...endpoint,
      id: undefined,
      endpoint_id: undefined,
      name: `${endpoint.name} (Copy)`,
      path: `${endpoint.endpoint_id || endpoint.path}-copy`,
      query: endpoint.sql_query || endpoint.query,
      http_method: endpoint.http_method,
      data_source_id: endpoint.data_source_id,
      is_active: endpoint.is_active,
      auth_mode: endpoint.is_public ? 'public' : 'api_key',
      parameters: parameters,
      group_name: endpoint.group_name || ''
    };

    setEditingEndpoint(mappedEndpoint);
    setIsModalOpen(true);
  };

  const handleTestApi = (endpoint) => {
    let params = [];
    try {
      if (typeof endpoint.parameters === 'string') {
        params = JSON.parse(endpoint.parameters);
      } else if (Array.isArray(endpoint.parameters)) {
        params = endpoint.parameters;
      }
    } catch (e) {
      params = [];
    }

    setTestingEndpoint(endpoint);
    setTestParams({});
    setTestApiKey('');
    setTestResponse(null);
    setTestLoading(false);
    setTestModalOpen(true);
  };

  const handleTestSubmit = async () => {
    if (!testingEndpoint.is_public && !testApiKey.trim()) {
      alert('This endpoint requires an API Key. Please enter an API Key.');
      return;
    }

    setTestLoading(true);
    setTestResponse(null);

    try {
      const method = testingEndpoint.http_method;
      const path = testingEndpoint.endpoint_id || testingEndpoint.path;
      // Use server's actual network IP address
      const ip = serverIp || window.location.hostname;
      const url = `http://${ip}:3000/api/v1/${path}`;

      const headers = {};
      if (testApiKey) {
        headers['Authorization'] = `Bearer ${testApiKey}`;
      }

      let paramDefs = [];
      try {
        if (typeof testingEndpoint.parameters === 'string') {
          paramDefs = JSON.parse(testingEndpoint.parameters);
        } else if (Array.isArray(testingEndpoint.parameters)) {
          paramDefs = testingEndpoint.parameters;
        }
      } catch (e) { paramDefs = []; }

      const queryParams = {};
      const bodyData = {};

      Object.entries(testParams).forEach(([key, value]) => {
        const def = paramDefs.find(p => p.name === key);
        if (def && def.in === 'body') {
          bodyData[key] = value;
        } else {
          queryParams[key] = value;
        }
      });

      const config = {
        method,
        url,
        headers,
        params: queryParams,
        data: bodyData
      };

      const response = await axios(config);

      setTestResponse({
        success: true,
        status: response.status,
        data: response.data
      });

    } catch (error) {
      setTestResponse({
        success: false,
        status: error.response?.status || 'Error',
        data: error.response?.data || error.message
      });
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">API Endpoints</h1>

        <div className="flex flex-1 flex-col md:flex-row gap-3 w-full md:w-auto md:max-w-2xl">
          <div className="relative flex-1">
            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
            <input
              type="text"
              placeholder="Search by name, path or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="input md:w-48"
          >
            <option value="">All Groups</option>
            {groups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <input
            type="file"
            id="import-endpoints-file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files[0];
              if (!file) return;

              try {
                const reader = new FileReader();
                reader.onload = async (event) => {
                  try {
                    const json = JSON.parse(event.target.result);
                    let importData = [];
                    if (Array.isArray(json)) {
                      importData = json;
                    } else if (json.data && Array.isArray(json.data)) {
                      importData = json.data;
                    } else {
                      alert('Invalid file format. Please upload a valid API Endpoints export file.');
                      return;
                    }

                    if (!confirm(`Import ${importData.length} endpoints?`)) return;

                    setLoading(true);
                    const result = await apiEndpointService.importData(importData);

                    let msg = result.data?.message || result.message || 'Import completed';

                    const details = result.data?.details || result.details;
                    if (details?.errors?.length > 0) {
                      msg += `\n\nErrors:\n${details.errors.slice(0, 5).join('\n')}${details.errors.length > 5 ? '\n...' : ''}`;
                    }
                    alert(msg);
                    fetchEndpoints();
                  } catch (err) {
                    console.error('Import error:', err);
                    alert('Failed to parse or import file: ' + err.message);
                  } finally {
                    setLoading(false);
                    // Reset input
                    e.target.value = '';
                  }
                };
                reader.readAsText(file);
              } catch (err) {
                alert('Error reading file');
              }
            }}
          />
          <button onClick={() => document.getElementById('import-endpoints-file').click()} className="btn btn-secondary whitespace-nowrap" title="Import Endpoints from JSON">
            <i className="bi bi-upload mr-2"></i> Import
          </button>

          <button onClick={() => apiEndpointService.exportData()} className="btn btn-secondary whitespace-nowrap" title="Export Endpoints as JSON">
            <i className="bi bi-download mr-2"></i> Export
          </button>

          <button onClick={handleCreate} className="btn btn-primary whitespace-nowrap">
            <i className="bi bi-plus-lg mr-2"></i> Create Endpoint
          </button>
        </div>
      </div>

      {endpoints.length === 0 ? (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-12 text-center">
          <p className="text-slate-400 mb-4">No API endpoints yet. Create your first one!</p>
          <button onClick={handleCreate} className="btn btn-primary">Create API Endpoint</button>
        </div>
      ) : (
        <div className="space-y-4">
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className="bg-dark-900 border border-dark-800 rounded-xl p-4 md:p-6 shadow-sm transition-all hover:border-dark-700">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded border whitespace-nowrap ${endpoint.http_method === 'GET' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                        endpoint.http_method === 'POST' ? 'bg-teal-600/10 text-teal-500 border-teal-600/20' :
                          endpoint.http_method === 'PUT' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                        {endpoint.http_method}
                      </span>
                      <h3 className="text-lg font-bold text-white break-words sm:break-normal">{endpoint.name}</h3>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-1 md:mt-0">
                      <span className={`px-2 py-0.5 text-xs rounded-full border whitespace-nowrap ${endpoint.is_active ? 'bg-teal-600/10 text-teal-500 border-teal-600/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                        {endpoint.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {endpoint.group_name && (
                        <span className="px-2 py-0.5 text-xs rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20 whitespace-nowrap">
                          📁 {endpoint.group_name}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs rounded-full border whitespace-nowrap ${endpoint.is_public ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        }`}>
                        {endpoint.is_public ? '🌐 Public' : '🔒 API Key'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full border whitespace-nowrap ${endpoint.is_private ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-teal-500/10 text-teal-500 border-teal-500/20'
                        }`}>
                        {endpoint.is_private ? '🔒 Private' : '🔓 Shared'}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded-full border bg-dark-800 text-slate-400 border-dark-700 whitespace-nowrap">
                        👤 {endpoint.creator_name || 'System'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4">
                    <code className="text-sm bg-dark-950 text-teal-500 px-3 py-1.5 rounded-lg border border-dark-800 font-mono break-all max-w-full">
                      /api/v1/{endpoint.endpoint_id || endpoint.path}
                    </code>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => copyEndpointUrl(endpoint.endpoint_id || endpoint.path)}
                        className="text-sm text-slate-400 light:text-slate-600 hover:text-white light:hover:text-black transition-colors flex items-center gap-1 bg-dark-800 light:bg-white md:bg-transparent px-2 py-1 md:px-0 md:py-0 rounded border md:border-0 border-dark-700 light:border-slate-300 whitespace-nowrap"
                        title="Copy URL"
                      >
                        <i className="bi bi-clipboard"></i> Copy
                      </button>
                      <button
                        onClick={() => handleTestApi(endpoint)}
                        className="text-sm text-teal-600 hover:text-teal-500 font-medium flex items-center gap-1 md:ml-2 pl-2 border-l-0 md:border-l border-dark-800 whitespace-nowrap bg-teal-900/10 md:bg-transparent px-2 py-1 md:px-0 md:py-0 rounded"
                      >
                        <i className="bi bi-rocket-takeoff"></i> Test API
                      </button>
                    </div>
                  </div>

                  {endpoint.description && (<p className="text-sm text-slate-400 mb-3 leading-relaxed">{endpoint.description}</p>)}

                  <div className="flex items-center gap-6 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <i className="bi bi-sliders"></i>
                      <span>Parameters: <span className="text-slate-300 font-medium">{endpoint.parameters?.length || 0}</span></span>
                    </div>
                  </div>

                </div>

                <div className="flex items-center gap-2 mt-4 lg:mt-0 lg:ml-6 flex-wrap justify-end">
                  {(user?.role === 'admin' || endpoint.created_by === user?.id) ? (
                    <>
                      <button onClick={() => handleTogglePrivacy(endpoint)} className="p-2 text-amber-500 hover:bg-amber-600/10 rounded-lg transition-colors" title={endpoint.is_private ? 'Make Shared' : 'Make Private'}>
                        <i className={`bi ${endpoint.is_private ? 'bi-lock-fill' : 'bi-unlock-fill'} text-lg`}></i>
                      </button>
                      <button onClick={() => handleDuplicate(endpoint)} className="p-2 text-teal-500 hover:bg-teal-600/10 rounded-lg transition-colors" title="Duplicate"><i className="bi bi-files text-lg"></i></button>
                      <button onClick={() => handleEdit(endpoint)} className="p-2 text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors" title="Edit"><i className="bi bi-pencil-square text-lg"></i></button>
                      <button onClick={() => handleDelete(endpoint.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete"><i className="bi bi-trash3 text-lg"></i></button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <i className={`bi ${endpoint.is_private ? 'bi-lock-fill text-amber-500' : 'bi-unlock-fill text-teal-500'} text-lg p-2`} title="Shared Resource"></i>
                      <span className="text-xs text-slate-500 italic">Read-only</span>
                    </div>
                  )}
                </div>
              </div>

              {(endpoint.sql_query || endpoint.query) && (
                <details className="mt-4 group relative border-t border-dark-800/50 pt-4">
                  <summary className="cursor-pointer text-sm font-medium text-slate-400 hover:text-white transition-colors list-none flex items-center gap-2">
                    <i className="bi bi-chevron-right text-xs transition-transform group-open:rotate-90"></i>
                    View Query
                  </summary>
                  <div className="mt-2 relative">
                    <button
                      onClick={() => {
                        const query = endpoint.sql_query || endpoint.query;
                        if (navigator.clipboard && window.isSecureContext) {
                          navigator.clipboard.writeText(query).then(() => alert('Query copied!'));
                        } else {
                          fallbackCopyTextToClipboard(query, 'Query copied!');
                        }
                      }}
                      className="absolute top-2 right-2 text-xs bg-dark-800 hover:bg-dark-700 text-slate-300 px-2 py-1 rounded transition-colors flex items-center gap-1 border border-dark-700 z-10"
                      title="Copy SQL Query"
                    >
                      <i className="bi bi-clipboard"></i> Copy
                    </button>
                    <pre className="text-xs bg-dark-950 text-slate-300 p-4 rounded-lg border border-dark-800 overflow-auto font-mono custom-scrollbar pt-8">
                      {endpoint.sql_query || endpoint.query}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEndpoint && editingEndpoint.id ? 'Edit API Endpoint' : (editingEndpoint ? 'Create Copy' : 'Create API Endpoint')} size="xl">
        <ApiEndpointForm
          endpoint={editingEndpoint}
          existingGroups={groups}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Test API Modal */}
      <Modal isOpen={testModalOpen} onClose={() => setTestModalOpen(false)} title={`Test API: ${testingEndpoint?.name || ''}`} size="lg">
        <div className="space-y-4">
          {testingEndpoint && !testingEndpoint.is_public && (
            <div className="p-4 bg-orange-900/20 border border-orange-900/50 rounded">
              <label className="block text-sm font-medium text-orange-400 mb-2">🔒 API Key (Required)</label>
              <input
                type="text"
                value={testApiKey}
                onChange={(e) => setTestApiKey(e.target.value)}
                className="input w-full"
                placeholder="Enter your API Key..."
                required
                disabled={testLoading}
              />
            </div>
          )}

          <p className="text-sm text-slate-400">
            Enter parameter values to test this API:
          </p>

          {testingEndpoint && (() => {
            let params = [];
            try {
              if (typeof testingEndpoint.parameters === 'string') {
                params = JSON.parse(testingEndpoint.parameters);
              } else if (Array.isArray(testingEndpoint.parameters)) {
                params = testingEndpoint.parameters;
              }
            } catch (e) {
              params = [];
            }

            const whereParams = params.filter(p => p.selectedForWhere);
            const setParams = params.filter(p => p.selectedForSet);

            if (whereParams.length === 0 && setParams.length === 0) {
              if (!testResponse) {
                return (
                  <div className="text-center py-4 text-slate-400">
                    This endpoint has no parameters. Click Execute Request to test.
                  </div>
                );
              }
            }

            const renderParamInput = (param) => (
              <div key={param.name}>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  {param.name}
                  <span className="text-xs text-slate-400 ml-2">({param.operator || '='})</span>
                </label>
                <input
                  type={param.type === 'number' ? 'number' : param.type === 'date' ? 'date' : 'text'}
                  value={testParams[param.name] || ''}
                  onChange={(e) => setTestParams(prev => ({
                    ...prev,
                    [param.name]: e.target.value
                  }))}
                  className="input w-full"
                  placeholder={param.description || (param.type === 'datetime' ? 'YYYY-MM-DD HH:mm:ss' : `Enter ${param.name}`)}
                  disabled={testLoading}
                />
              </div>
            );

            return (
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {whereParams.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-teal-500 uppercase border-b border-teal-900/30 pb-1">Filter (WHERE)</h4>
                    {whereParams.map(renderParamInput)}
                  </div>
                )}

                {setParams.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-orange-400 uppercase border-b border-orange-900/30 pb-1">Update Values (SET)</h4>
                    {setParams.map(renderParamInput)}
                  </div>
                )}
              </div>
            );
          })()}

          {testResponse && (
            <div className={`mt-4 p-4 rounded border ${testResponse.success ? 'bg-teal-900/20 border-teal-900/50' : 'bg-red-900/20 border-red-900/50'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className={`font-bold ${testResponse.success ? 'text-teal-500' : 'text-red-400'}`}>
                  {testResponse.success ? 'Success' : 'Failed'} (Status: {testResponse.status})
                </span>
              </div>
              <pre className="text-xs bg-dark-950/50 p-3 rounded overflow-auto max-h-60 custom-scrollbar text-slate-300 font-mono">
                {JSON.stringify(testResponse.data, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-800">
            <button onClick={() => setTestModalOpen(false)} className="btn btn-secondary" disabled={testLoading}>Close</button>
            <button onClick={handleTestSubmit} className="btn btn-primary" disabled={testLoading}>
              {testLoading ? (
                <>
                  <span className="animate-spin inline-block mr-2">⟳</span> Testing...
                </>
              ) : (
                <>🚀 Execute Request</>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
