/**
 * Data Sources Page
 */

import { useEffect, useState } from 'react';
import dataSourceService from '../services/dataSource.service';
import Modal from '../components/Modal';
import DataSourceForm from '../components/DataSourceForm';
import { useAuth } from '../context/AuthContext';

const DataSources = () => {
  const [dataSources, setDataSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const { user } = useAuth();

  // Search and Filter State
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetchDataSources();
  }, [search, selectedGroup]);

  const fetchDataSources = async () => {
    try {
      const data = await dataSourceService.getAll({
        search: search || undefined,
        groupName: selectedGroup || undefined
      });
      setDataSources(data.data);

      // Only maintain groups list if not currently filtering by group
      if (!selectedGroup && !search) {
        const uniqueGroups = [...new Set(data.data.map(e => e.group_name).filter(Boolean))].sort();
        setGroups(uniqueGroups);
      }
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSource(null);
    setIsModalOpen(true);
  };

  const handleEdit = (source) => {
    setEditingSource(source);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingSource) {
        await dataSourceService.update(editingSource.id, formData);
      } else {
        await dataSourceService.create(formData);
      }
      setIsModalOpen(false);
      fetchDataSources();
    } catch (error) {
      console.error('Failed to save data source:', error);
      alert('Failed to save data source: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this data source?')) return;

    try {
      await dataSourceService.delete(id);
      fetchDataSources();
    } catch (error) {
      console.error('Failed to delete data source:', error);
      alert('Failed to delete data source: ' + error.message);
    }
  };

  const handleTogglePrivacy = async (ds) => {
    try {
      await dataSourceService.update(ds.id, { is_private: !ds.is_private });
      fetchDataSources();
    } catch (error) {
      console.error('Failed to toggle privacy:', error);
      alert('Failed to toggle privacy: ' + error.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Data Sources</h1>

        <div className="flex flex-1 flex-col md:flex-row gap-3 w-full md:w-auto md:max-w-2xl">
          <div className="relative flex-1">
            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
            <input
              type="text"
              placeholder="Search by name, host or database..."
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
            id="import-file"
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
                    console.log('Importing file content:', json);
                    let importData = [];
                    if (Array.isArray(json)) {
                      importData = json;
                    } else if (json.data && Array.isArray(json.data)) {
                      importData = json.data;
                    } else {
                      alert('Invalid file format. Please upload a valid Data Sources export file.');
                      return;
                    }

                    if (!confirm(`Import ${importData.length} data sources?`)) return;

                    setLoading(true);
                    const result = await dataSourceService.importData(importData);

                    let msg = result.data?.message || result.message || 'Import completed';
                    if (result.data?.details?.errors?.length > 0) {
                      msg += `\n\nErrors:\n${result.data.details.errors.slice(0, 3).join('\n')}${result.data.details.errors.length > 3 ? '\n...' : ''}`;
                    } else if (result.details?.errors?.length > 0) {
                      msg += `\n\nErrors:\n${result.details.errors.slice(0, 3).join('\n')}${result.details.errors.length > 3 ? '\n...' : ''}`;
                    }

                    alert(msg);
                    fetchDataSources();
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
          <button onClick={() => document.getElementById('import-file').click()} className="btn btn-secondary whitespace-nowrap" title="Import Data Sources from JSON">
            <i className="bi bi-upload mr-2"></i> Import
          </button>

          <button onClick={() => dataSourceService.exportData()} className="btn btn-secondary whitespace-nowrap" title="Export Data Sources as JSON">
            <i className="bi bi-download mr-2"></i> Export
          </button>

          <button onClick={handleCreate} className="btn btn-primary whitespace-nowrap">
            <i className="bi bi-plus-lg mr-2"></i> Add Data Source
          </button>
        </div>
      </div>

      {dataSources.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 mb-4">No data sources yet. Create your first one!</p>
          <button onClick={handleCreate} className="btn btn-primary">
            Create Data Source
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="whitespace-nowrap">Name</th>
                  <th className="whitespace-nowrap">Type</th>
                  <th className="whitespace-nowrap">Host</th>
                  <th className="whitespace-nowrap">Database</th>
                  <th className="whitespace-nowrap">Creator</th>
                  <th className="whitespace-nowrap">Privacy</th>
                  <th className="whitespace-nowrap">Status</th>
                  <th className="whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dataSources.map((ds) => (
                  <tr key={ds.id}>
                    <td className="font-medium">
                      {ds.name}
                      {ds.group_name && (
                        <span className="block text-[10px] text-blue-400 mt-1">
                          📁 {ds.group_name}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="capitalize">{ds.db_type}</span>
                    </td>
                    <td className="text-sm text-slate-400 whitespace-nowrap">
                      {ds.host}:{ds.port}
                    </td>
                    <td className="text-sm">{ds.database_name}</td>
                    <td>
                      <span className="text-xs px-2 py-0.5 bg-dark-800 text-slate-400 rounded-full border border-dark-700 whitespace-nowrap">
                        {ds.creator_name || 'System'}
                      </span>
                    </td>
                    <td>
                      {(user?.role === 'admin' || ds.created_by === user?.id) ? (
                        <button
                          onClick={() => handleTogglePrivacy(ds)}
                          className="btn btn-sm btn-ghost text-slate-400 hover:text-teal-400"
                          title={ds.is_private ? 'Private (Click to share)' : 'Shared (Click to make private)'}
                        >
                          <i className={`bi ${ds.is_private ? 'bi-lock-fill text-orange-400' : 'bi-unlock-fill text-teal-400'}`}></i>
                        </button>
                      ) : (
                        <div className="text-slate-500 py-1 px-2" title="Viewing Shared Resource">
                          <i className={`bi ${ds.is_private ? 'bi-lock-fill' : 'bi-unlock-fill'}`}></i>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full border ${ds.is_active
                        ? 'status-badge status-active'
                        : 'status-badge status-inactive'}`}>
                        {ds.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {(user?.role === 'admin' || ds.created_by === user?.id) ? (
                          <>
                            <button
                              onClick={() => handleEdit(ds)}
                              className="btn btn-sm btn-ghost text-indigo-400 hover:text-indigo-300"
                              title="Edit"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(ds.id)}
                              className="btn btn-sm btn-ghost text-red-400 hover:text-red-300"
                              title="Delete"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Read-only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSource ? 'Edit Data Source' : 'Create Data Source'}
        size="lg"
      >
        <DataSourceForm
          dataSource={editingSource}
          existingGroups={groups}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default DataSources;
