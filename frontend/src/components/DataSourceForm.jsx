/**
 * Data Source Form Component
 */

import { useState } from 'react';
import dataSourceService from '../services/dataSource.service';

const DataSourceForm = ({ dataSource, existingGroups = [], onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: dataSource?.name || '',
    db_type: dataSource?.db_type || 'postgresql',
    host: dataSource?.host || '',
    port: dataSource?.port || '',
    database_name: dataSource?.database_name || '',
    username: dataSource?.username || '',
    password: '',
    description: dataSource?.description || '',
    is_active: dataSource?.is_active !== undefined ? dataSource.is_active : true,
    is_private: dataSource?.is_private !== undefined ? dataSource.is_private : true,
    group_name: dataSource?.group_name || ''
  });

  // Initialize new group mode if the current group name is not in the existing list (and not empty)
  const [isNewGroup, setIsNewGroup] = useState(() =>
    dataSource?.group_name && existingGroups.length > 0 && !existingGroups.includes(dataSource.group_name)
  );

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleTest = async () => {
    // Validate required fields before testing
    if (!formData.db_type || !formData.host || !formData.port || !formData.database_name || !formData.username || !formData.password) {
      setTestResult({ success: false, message: 'Please fill in all required fields before testing' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const result = await dataSourceService.testConnectionBeforeSave({
        db_type: formData.db_type,
        host: formData.host,
        port: formData.port,
        database_name: formData.database_name,
        username: formData.username,
        password: formData.password
      });

      setTestResult({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: error.response?.data?.data?.message || error.message || 'Connection test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  // Default ports for different database types
  const defaultPorts = {
    postgresql: 5432,
    mysql: 3306,
    mssql: 1433,
    oracle: 1521
  };

  const handleDbTypeChange = (e) => {
    const dbType = e.target.value;

    if (dbType === 'sqlite') {
      setFormData(prev => ({
        ...prev,
        db_type: dbType,
        port: 0,
        database_name: 'sqlite',
        username: 'sqlite',
        password: 'password' // Dummy password to pass validation
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        db_type: dbType,
        port: defaultPorts[dbType] || '',
        // Clear dummy values if switching from sqlite
        username: prev.username === 'sqlite' ? '' : prev.username,
        // Set default database name for Oracle
        database_name: dbType === 'oracle' ? 'XEPDB1' : (prev.database_name === 'sqlite' ? '' : prev.database_name)
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="input w-full"
            placeholder="My Database"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Database Type *
          </label>
          <select
            name="db_type"
            value={formData.db_type}
            onChange={handleDbTypeChange}
            required
            className="input w-full"
          >
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="mssql">MS SQL Server</option>
            <option value="oracle">Oracle</option>
            <option value="sqlite">SQLite</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Data Source Group (Category)
          </label>
          {!isNewGroup && existingGroups.length > 0 ? (
            <div className="flex gap-2">
              <select
                name="group_name"
                value={existingGroups.includes(formData.group_name) ? formData.group_name : (formData.group_name ? '__NEW__' : '')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__NEW__') {
                    setIsNewGroup(true);
                    setFormData(prev => ({ ...prev, group_name: '' }));
                  } else {
                    setFormData(prev => ({ ...prev, group_name: val }));
                  }
                }}
                className="input w-full cursor-pointer"
              >
                <option value="">-- No Group --</option>
                {existingGroups.map((group, index) => (
                  <option key={index} value={group}>{group}</option>
                ))}
                <option value="__NEW__" className="font-bold text-teal-400 bg-dark-800">+ ✨ Create New Group</option>
              </select>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                name="group_name"
                value={formData.group_name}
                onChange={handleChange}
                className="input w-full"
                placeholder="Enter new group name..."
                autoFocus={isNewGroup}
              />
              {existingGroups.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsNewGroup(false)}
                  className="btn btn-secondary px-3"
                  title="Select from existing groups"
                >
                  <i className="bi bi-list-ul"></i>
                </button>
              )}
            </div>
          )}
        </div>

        {formData.db_type === 'sqlite' ? (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              File Path *
            </label>
            <input
              type="text"
              name="host"
              value={formData.host}
              onChange={handleChange}
              required
              className="input w-full"
              placeholder="data/my-database.sqlite"
            />
            <p className="text-xs text-slate-400 mt-1">
              Absolute path or relative to backend directory.
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Host *
              </label>
              <input
                type="text"
                name="host"
                value={formData.host}
                onChange={handleChange}
                required
                className="input w-full"
                placeholder="localhost"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Port *
              </label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleChange}
                required
                className="input w-full"
                placeholder="5432"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {formData.db_type === 'oracle' ? 'Service Name *' : 'Database Name *'}
              </label>
              <input
                type="text"
                name="database_name"
                value={formData.database_name}
                onChange={handleChange}
                required
                className="input w-full"
                placeholder={formData.db_type === 'oracle' ? 'XEPDB1' : 'mydb'}
              />
              {formData.db_type === 'oracle' && (
                <p className="text-xs text-slate-400 mt-1">
                  Oracle service name (e.g., XEPDB1, ORCL, XE, or your TNS service name)
                </p>
              )}
            </div>
          </>
        )}

        {formData.db_type !== 'sqlite' && (
          <>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Username *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="input w-full"
                placeholder="dbuser"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Password {!dataSource && '*'}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required={!dataSource}
                className="input w-full"
                placeholder={dataSource ? "Leave empty to keep current password" : "Enter password"}
              />
            </div>
          </>
        )}

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="input w-full"
            placeholder="Optional description"
          />
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-sm font-medium text-slate-300">Active</span>
          </label>
        </div>

        <div className="col-span-1 md:col-span-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="is_private"
              checked={formData.is_private}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-sm font-medium text-slate-300">🔒 Private (Only you can manage)</span>
          </label>
        </div>
      </div>

      {
        testResult && (
          <div className={`p-3 rounded border ${testResult.success ? 'bg-teal-900/20 text-teal-500 border-teal-900/50' : 'bg-red-900/20 text-red-400 border-red-900/50'}`}>
            {testResult.message}
          </div>
        )
      }

      <div className="flex justify-between pt-4 border-t border-dark-800">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="btn btn-secondary"
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </button>

        <div className="space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
          >
            {dataSource ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </form >
  );
};

export default DataSourceForm;
