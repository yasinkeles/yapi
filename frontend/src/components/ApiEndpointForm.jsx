/**
 * API Endpoint Form Component
 */

import { useState, useEffect } from 'react';
import apiEndpointService from '../services/apiEndpoint.service';
import dataSourceService from '../services/dataSource.service';

const ApiEndpointForm = ({ endpoint, existingGroups = [], onSubmit, onCancel }) => {
  const [dataSources, setDataSources] = useState([]);
  const [formData, setFormData] = useState({
    name: endpoint?.name || '',
    path: endpoint?.path || '',
    http_method: endpoint?.http_method || 'GET',
    data_source_id: endpoint?.data_source_id || '',
    query: endpoint?.query || '',
    description: endpoint?.description || '',
    is_active: endpoint?.is_active !== undefined ? endpoint.is_active : true,
    is_private: endpoint?.is_private !== undefined ? endpoint.is_private : false,
    auth_mode: endpoint?.auth_mode || 'public', // public, api_key, both
    parameters: endpoint?.parameters || [],
    group_name: endpoint?.group_name || ''
  });

  const [testParams, setTestParams] = useState({});
  const [analyzing, setAnalyzing] = useState(false);

  // Initialize new group mode if the current group name is not in the existing list (and not empty)
  const [isNewGroup, setIsNewGroup] = useState(() =>
    endpoint?.group_name && existingGroups.length > 0 && !existingGroups.includes(endpoint.group_name)
  );

  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    try {
      const data = await dataSourceService.getAll();
      setDataSources(data.data || []);
    } catch (error) {
      console.error('Failed to fetch data sources:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Auto-detect parameters when query changes
    if (name === 'query') {
      detectParameters(value);
    }
  };

  const detectParameters = (query) => {
    if (!query) return;

    // Detect different parameter formats
    const patterns = [
      { regex: /:(\w+)/g, format: 'Oracle/Named' },           // :param_name (Oracle)
      { regex: /\$(\d+)/g, format: 'PostgreSQL' },            // $1, $2 (PostgreSQL)
      { regex: /@(\w+)/g, format: 'MSSQL' },                  // @param_name (MSSQL)
    ];

    const detectedParams = new Set();
    const currentParamNames = new Set(formData.parameters.map(p => p.name));

    patterns.forEach(({ regex }) => {
      const matches = query.matchAll(regex);
      for (const match of matches) {
        const paramName = match[1];
        if (paramName && !currentParamNames.has(paramName)) {
          detectedParams.add(paramName);
        }
      }
    });

    // Add newly detected parameters
    if (detectedParams.size > 0) {
      const newParams = Array.from(detectedParams).map(paramName => ({
        name: paramName,
        type: 'string',
        required: false, // Default to optional, user can mark as required if needed
        in: 'query',
        description: ''
      }));

      setFormData(prev => ({
        ...prev,
        parameters: [...prev.parameters, ...newParams]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formData);
  };



  const handleAnalyzeQuery = async () => {
    if (!formData.data_source_id) {
      alert('Please select a Data Source first');
      return;
    }

    if (!formData.query || formData.query.trim() === '') {
      alert('Please enter an SQL query');
      return;
    }

    setAnalyzing(true);
    try {
      const result = await apiEndpointService.analyzeQuery(formData.data_source_id, formData.query);

      // Replace existing parameters with suggested ones (add selectedForSelect and selectedForWhere fields)
      setFormData(prev => ({
        ...prev,
        parameters: (result.suggestedParameters || []).map(param => ({
          ...param,
          selectedForSelect: param.selectedForSelect || false,
          selectedForWhere: param.selectedForWhere || false,
          selectedForSet: param.selectedForSet || false,
          operator: '='             // Default operator for WHERE conditions
        }))
      }));

      alert(`✓ ${result.columns.length} columns detected and added as parameters!`);
    } catch (error) {
      console.error('Query analysis failed:', error);
      alert('Query analysis failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setAnalyzing(false);
    }
  };

  const removeParameter = (index) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.filter((_, i) => i !== index)
    }));
  };

  const updateParameter = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.map((param, i) => {
        if (i !== index) return param;

        const updates = { [field]: value };

        // Auto-switch location to 'body' when selected for SET
        if (field === 'selectedForSet' && value === true) {
          updates.in = 'body';
        }

        return { ...param, ...updates };
      })
    }));
  };

  const toggleAllSelect = () => {
    const allSelectedForSelect = formData.parameters.every(p => p.selectedForSelect);
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.map(param => ({
        ...param,
        selectedForSelect: !allSelectedForSelect
      }))
    }));
  };

  const toggleAllWhere = () => {
    const allSelectedForWhere = formData.parameters.every(p => p.selectedForWhere);
    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.map(param => ({
        ...param,
        selectedForWhere: !allSelectedForWhere
      }))
    }));
  };

  const toggleAllSet = () => {
    const allSelectedForSet = formData.parameters.every(p => p.selectedForSet);
    const newValue = !allSelectedForSet;

    setFormData(prev => ({
      ...prev,
      parameters: prev.parameters.map(param => ({
        ...param,
        selectedForSet: newValue,
        // Auto-switch location to 'body' when selected for SET
        ...(newValue ? { in: 'body' } : {})
      }))
    }));
  };

  const updateQuery = () => {
    const selectParams = formData.parameters.filter(p => p.selectedForSelect);
    const whereParams = formData.parameters.filter(p => p.selectedForWhere);
    const setParams = formData.parameters.filter(p => p.selectedForSet);

    let currentQuery = formData.query.trim();
    let messages = [];

    // Detect Query Type (SELECT vs UPDATE)
    const isUpdate = /^UPDATE\s+/i.test(currentQuery);

    // Extract table name (simple regex)
    let tableName = '[table_name]';
    if (isUpdate) {
      const match = currentQuery.match(/^UPDATE\s+(\S+)/i);
      if (match) tableName = match[1];
    } else {
      const match = currentQuery.match(/FROM\s+(\S+)/i);
      if (match) tableName = match[1];
    }

    if (isUpdate || setParams.length > 0) {
      // BUILD UPDATE QUERY

      // 1. Build SET clause
      const setClause = setParams.map(param => {
        const columnName = param.columnName || param.name;
        // Basic mapping: col = :param
        return `${columnName} = :${param.name}`;
      }).join(', ');

      // 2. Build WHERE clause
      const whereConditions = whereParams.map(param => {
        const columnName = param.columnName || param.name;
        const operator = param.operator || '=';
        if (operator === 'LIKE') return `${columnName} LIKE '%' || :${param.name} || '%'`;
        if (operator === 'IN') return `${columnName} IN (:${param.name})`;
        return `${columnName} ${operator} :${param.name}`;
      }).join(' AND ');

      let newQuery = `UPDATE ${tableName}`;
      if (setClause) {
        newQuery += `\nSET ${setClause}`;
        messages.push(`SET: ${setParams.length} columns`);
      } /*else {
        newQuery += `\nSET [col] = :val`; // Placeholder if no set params
      }*/

      if (whereParams.length > 0) {
        newQuery += `\nWHERE ${whereConditions}`;
        messages.push(`WHERE: ${whereParams.length} conditions`);
      }

      currentQuery = newQuery;

    } else {
      // BUILD SELECT QUERY (Default)

      // 1. Update SELECT clause
      if (selectParams.length === 0) {
        // If it was empty or invalid, rebuild basic
        if (!/SELECT\s+[^FROM]+FROM/i.test(currentQuery)) {
          currentQuery = `SELECT * FROM ${tableName}`;
        } else {
          currentQuery = currentQuery.replace(/SELECT\s+[^FROM]+FROM/i, `SELECT * FROM`);
        }
        messages.push('SELECT *');
      } else {
        const columnNames = selectParams.map(param =>
          param.columnName || param.name.toUpperCase()
        ).join(', ');

        if (/SELECT\s+[^FROM]+FROM/i.test(currentQuery)) {
          currentQuery = currentQuery.replace(/SELECT\s+[^FROM]+FROM/i, `SELECT ${columnNames} FROM`);
        } else {
          currentQuery = `SELECT ${columnNames} FROM ${tableName}`;
        }
        messages.push(`SELECT: ${selectParams.length} columns`);
      }

      // 2. Update WHERE clause
      currentQuery = currentQuery.replace(/\s*WHERE\s+[\s\S]*?(?=(ORDER\s+BY|GROUP\s+BY|$))/i, '');

      if (whereParams.length > 0) {
        const whereConditions = whereParams.map(param => {
          const columnName = param.columnName || param.name.toUpperCase();
          const operator = param.operator || '=';
          if (operator === 'LIKE') return `${columnName} LIKE '%' || :${param.name} || '%'`;
          if (operator === 'IN') return `${columnName} IN (:${param.name})`;
          return `${columnName} ${operator} :${param.name}`;
        }).join(' AND ');

        const hasOrderBy = /ORDER\s+BY/i.test(currentQuery);
        const hasGroupBy = /GROUP\s+BY/i.test(currentQuery);

        if (hasOrderBy) {
          currentQuery = currentQuery.replace(/(ORDER\s+BY)/i, `WHERE ${whereConditions}\n$1`);
        } else if (hasGroupBy) {
          currentQuery = currentQuery.replace(/(GROUP\s+BY)/i, `WHERE ${whereConditions}\n$1`);
        } else {
          currentQuery = `${currentQuery}\nWHERE ${whereConditions}`;
        }
        messages.push(`WHERE: ${whereParams.length} parameters`);
      }
    }

    setFormData(prev => ({
      ...prev,
      query: currentQuery.trim()
    }));

    alert(`✓ Query updated!\n${messages.join(' | ') || 'No changes detected'}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status & Security - Moved to Top */}
      {/* Status & Security - Moved to Top */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start bg-dark-900/50 p-4 rounded border border-dark-800">
        <div className="flex flex-row md:flex-col gap-4 md:gap-3 md:pt-4 justify-start">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="mr-2 md:mr-3 w-5 h-5 accent-teal-500 rounded"
            />
            <span className="text-sm font-bold text-white">Active</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="is_private"
              checked={formData.is_private}
              onChange={handleChange}
              className="mr-2 md:mr-3 w-5 h-5 accent-amber-500 rounded"
            />
            <span className="text-sm font-bold text-amber-500">🔒 Private</span>
          </label>
        </div>
        <div className="col-span-1 md:col-span-3">
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Authentication Mode
          </label>
          <p className="text-xs text-slate-400 mb-2 font-mono truncate">
            {formData.auth_mode === 'public' && '🌐 Anyone can use, no API key required'}
            {formData.auth_mode === 'api_key' && '🔑 Can only be called with a valid API Key'}
          </p>
          <select
            name="auth_mode"
            value={formData.auth_mode}
            onChange={handleChange}
            className="input w-full"
          >
            <option value="public">Public (No Auth Required)</option>
            <option value="api_key">API Key Required</option>
          </select>
        </div>
      </div>
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b border-dark-800 pb-2">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Endpoint Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input w-full"
              placeholder="Get User By ID"
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Endpoint Group (Category)
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
                {/* Fallback check: if we have a custom group name that isn't in list, we might want to show input automatically, 
                    but the value logic above handles it by showing __NEW__ if it doesn't match. 
                    However, to actually EDIT a custom name that isn't in the list yet, we strictly need the input.
                    The logic above forces __NEW__ selection if name exists but not in list. 
                    Better UX: If name exists and not in list, auto-switch to Input mode on init. */}
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

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Path *
            </label>
            <input
              type="text"
              name="path"
              value={formData.path}
              onChange={handleChange}
              required
              className="input w-full"
              placeholder="get-user"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              HTTP Method *
            </label>
            <select
              name="http_method"
              value={formData.http_method}
              onChange={handleChange}
              required
              className="input w-full"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div className="col-span-1 md:col-span-2">
            <p className="text-xs text-slate-400">
              Will be accessible at: /api/v1/{formData.path || 'your-path'}
            </p>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Data Source *
            </label>
            <select
              name="data_source_id"
              value={formData.data_source_id}
              onChange={handleChange}
              required
              className="input w-full"
            >
              <option value="">Select a data source</option>
              {dataSources.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.db_type})
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="input w-full"
              placeholder="Optional description"
            />
          </div>
        </div>
      </div>

      {/* SQL Query */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-dark-800 pb-2">
          <h3 className="text-lg font-semibold">SQL Query</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAnalyzeQuery}
              disabled={analyzing || !formData.data_source_id}
              className="btn btn-primary text-sm"
              title="Detect table columns in SQL and add as parameters"
            >
              {analyzing ? '⏳ Analyzing...' : '🔍 Detect Columns'}
            </button>
            <button
              type="button"
              onClick={() => detectParameters(formData.query)}
              className="btn btn-secondary text-sm"
              title="Detect parameters in :param_name format in SQL"
            >
              🔧 Detect Parameters
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Query *
          </label>
          <textarea
            name="query"
            value={formData.query}
            onChange={handleChange}
            required
            rows={10}
            className="input font-mono text-sm w-full"
            placeholder="SELECT * FROM table WHERE ... OR UPDATE table SET ..."
          />
          <div className="mt-2 p-3 bg-dark-800/10 border border-dark-800/30 rounded">
            <p className="text-xs text-teal-400 font-semibold mb-1">💡 Tip: Parameters are auto-detected</p>
            <p className="text-xs text-teal-300">
              Use your parameters in these formats when writing SQL:
            </p>
            <ul className="text-xs text-teal-300 ml-4 mt-1 space-y-1">
              <li>• <code className="bg-dark-800/30 px-1 rounded text-teal-200">:param_name</code> - Oracle/Generic</li>
              <li>• <code className="bg-dark-800/30 px-1 rounded text-teal-200">$1, $2, $3</code> - PostgreSQL</li>
              <li>• <code className="bg-dark-800/30 px-1 rounded text-teal-200">@param_name</code> - MS SQL Server</li>
            </ul>
            <p className="text-xs text-teal-300 mt-2">
              Parameters will be automatically listed below.
            </p>
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-dark-800 pb-2">
          <h3 className="text-lg font-semibold">Parameters (Auto-Detected)</h3>
          <div className="flex gap-2 items-center">
            {formData.parameters.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={toggleAllSet}
                  className="btn btn-secondary text-xs text-orange-400 border-orange-500/30"
                  title="Select/deselect all parameters for SET"
                >
                  {formData.parameters.every(p => p.selectedForSet) ? '❌ Deselect All for SET' : '✓ Select All for SET'}
                </button>
                <button
                  type="button"
                  onClick={toggleAllSelect}
                  className="btn btn-secondary text-xs text-teal-400 border-teal-500/30"
                  title="Select/deselect all parameters for SELECT"
                >
                  {formData.parameters.every(p => p.selectedForSelect) ? '❌ Deselect All for SELECT' : '✓ Select All for SELECT'}
                </button>
                <button
                  type="button"
                  onClick={toggleAllWhere}
                  className="btn btn-secondary text-xs text-teal-500 border-teal-600/30"
                  title="Select/deselect all parameters for WHERE"
                >
                  {formData.parameters.every(p => p.selectedForWhere) ? '❌ Deselect All for WHERE' : '✓ Select All for WHERE'}
                </button>
                <button
                  type="button"
                  onClick={updateQuery}
                  className="btn btn-primary text-xs"
                  title="Update SELECT and WHERE based on selected parameters"
                >
                  🔄 Rebuild Query
                </button>
              </>
            )}
            <span className="text-xs text-slate-400 bg-dark-800 px-3 py-1 rounded">
              {formData.parameters.length} parameters
            </span>
          </div>
        </div>

        {formData.parameters.length === 0 ? (
          <div className="text-center py-6 bg-dark-900 rounded border-2 border-dashed border-dark-700">
            <p className="text-sm text-slate-400 mb-2">No parameters found in your SQL</p>
            <p className="text-xs text-slate-400">
              Add parameters in <code className="bg-dark-800 text-slate-300 px-2 py-0.5 rounded">:param_name</code> format in SQL
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 mb-3">
              ✓ {formData.parameters.length} parameters detected. You can optionally edit type and description:
            </p>
            {formData.parameters.map((param, index) => (
              <div key={index} className="border border-dark-700 rounded p-3 bg-dark-900 hover:bg-dark-800 transition">
                <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-center">
                  {/* SELECT Checkbox */}
                  <div className="col-span-1 md:col-span-1 flex flex-col items-center justify-center gap-1">
                    <label className="text-[10px] font-bold text-teal-400">SEL</label>
                    <input
                      type="checkbox"
                      checked={param.selectedForSelect || false}
                      onChange={(e) => updateParameter(index, 'selectedForSelect', e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-teal-500"
                      title="Select to add to SELECT"
                    />
                  </div>

                  {/* SET Checkbox (New) */}
                  <div className="col-span-1 md:col-span-1 flex flex-col items-center justify-center gap-1">
                    <label className="text-[10px] font-bold text-orange-400">SET</label>
                    <input
                      type="checkbox"
                      checked={param.selectedForSet || false}
                      onChange={(e) => updateParameter(index, 'selectedForSet', e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-orange-500"
                      title="Select to add to SET"
                    />
                  </div>

                  {/* WHERE Checkbox */}
                  <div className="col-span-1 md:col-span-1 flex flex-col items-center justify-center gap-1 md:border-r border-dark-700 md:pr-2">
                    <label className="text-[10px] font-bold text-teal-500">WHR</label>
                    <input
                      type="checkbox"
                      checked={param.selectedForWhere || false}
                      onChange={(e) => updateParameter(index, 'selectedForWhere', e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-teal-600"
                      title="Select to add to WHERE"
                    />
                  </div>

                  <div className="col-span-2 md:col-span-2">
                    <label className="text-xs text-slate-500">Name</label>
                    <input
                      type="text"
                      value={param.name}
                      onChange={(e) => updateParameter(index, 'name', e.target.value)}
                      placeholder="Parameter name"
                      className="input text-sm py-1 px-2 font-mono h-8"
                      readOnly
                    />
                  </div>

                  <div className="col-span-2 md:col-span-2">
                    <label className="text-xs text-slate-500">Operator</label>
                    <select
                      value={param.operator || '='}
                      onChange={(e) => updateParameter(index, 'operator', e.target.value)}
                      className="input text-sm py-1 h-8"
                      title="Operator to use in WHERE condition"
                    >
                      <option value="=">=</option>
                      <option value="!=">!=</option>
                      <option value=">">{'>'}</option>
                      <option value="<">{'<'}</option>
                      <option value="LIKE">LIKE</option>
                      <option value="IN">IN</option>
                    </select>
                  </div>

                  <div className="col-span-2 md:col-span-2">
                    <label className="text-xs text-slate-500">Type</label>
                    <select
                      value={param.type}
                      onChange={(e) => updateParameter(index, 'type', e.target.value)}
                      className="input text-sm py-1 h-8"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="date">Date</option>
                      <option value="datetime">Date Time</option>
                    </select>
                  </div>

                  <div className="col-span-2 md:col-span-2">
                    <label className="text-xs text-slate-500">Location</label>
                    <select
                      value={param.in}
                      onChange={(e) => updateParameter(index, 'in', e.target.value)}
                      className="input text-sm py-1 h-8"
                    >
                      <option value="query">Query</option>
                      <option value="body">Body</option>
                    </select>
                  </div>

                  <div className="col-span-2 md:col-span-1 flex items-end justify-center pb-1">
                    <button
                      type="button"
                      onClick={() => removeParameter(index)}
                      className="text-red-400 hover:text-red-300"
                      title="Delete parameter"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>



      <div className="flex justify-between pt-4 border-t border-dark-800">
        <div></div> {/* Spacer */}

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
            {endpoint && endpoint.id ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ApiEndpointForm;
