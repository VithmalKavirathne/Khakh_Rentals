import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

const USERS_API = `${API_BASE_URL}/api/users`;
const REPAIRERS_API = `${API_BASE_URL}/api/repairers`;

const emptyCreateForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'user',
};

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'user',
    isActive: true,
    password: '',
  });
  const [repairers, setRepairers] = useState([]);
  const [repairersLoading, setRepairersLoading] = useState(true);
  const [newRepairerName, setNewRepairerName] = useState('');
  const [creatingRepairer, setCreatingRepairer] = useState(false);
  const [editingRepairerId, setEditingRepairerId] = useState(null);
  const [editRepairerName, setEditRepairerName] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(USERS_API);
      setUsers(response.data.users || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRepairers = useCallback(async () => {
    setRepairersLoading(true);
    try {
      const response = await axios.get(`${REPAIRERS_API}?all=true`);
      setRepairers(response.data.repairers || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load repairer centers');
    } finally {
      setRepairersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadRepairers();
  }, [loadUsers, loadRepairers]);

  const handleCreateRepairer = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const name = newRepairerName.trim();
    if (!name) {
      setError('Repairer center name is required');
      return;
    }

    setCreatingRepairer(true);
    try {
      await axios.post(REPAIRERS_API, { name });
      setNewRepairerName('');
      setMessage('Repairer center added successfully');
      await loadRepairers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add repairer center');
    } finally {
      setCreatingRepairer(false);
    }
  };

  const startRepairerEdit = (repairer) => {
    setEditingRepairerId(repairer.id);
    setEditRepairerName(repairer.name);
    setError('');
    setMessage('');
  };

  const cancelRepairerEdit = () => {
    setEditingRepairerId(null);
    setEditRepairerName('');
  };

  const handleUpdateRepairer = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const name = editRepairerName.trim();
    if (!name) {
      setError('Repairer center name is required');
      return;
    }

    try {
      await axios.patch(`${REPAIRERS_API}/${editingRepairerId}`, { name });
      setMessage('Repairer center updated successfully');
      cancelRepairerEdit();
      await loadRepairers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update repairer center');
    }
  };

  const handleDeactivateRepairer = async (id) => {
    if (!window.confirm('Remove this repairer center from the dropdown? Existing invoices will keep their saved repairer name.')) {
      return;
    }
    setError('');
    setMessage('');
    try {
      await axios.delete(`${REPAIRERS_API}/${id}`);
      setMessage('Repairer center removed from dropdown');
      await loadRepairers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove repairer center');
    }
  };

  const handleReactivateRepairer = async (id) => {
    setError('');
    setMessage('');
    try {
      await axios.patch(`${REPAIRERS_API}/${id}`, { isActive: true });
      setMessage('Repairer center reactivated');
      await loadRepairers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reactivate repairer center');
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (createForm.password !== createForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setCreating(true);
    try {
      await axios.post(USERS_API, {
        fullName: createForm.fullName,
        email: createForm.email,
        phone: createForm.phone || null,
        password: createForm.password,
        role: createForm.role || 'user',
      });
      setCreateForm(emptyCreateForm);
      setMessage('User created successfully');
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditForm({
      fullName: row.fullName,
      email: row.email,
      phone: row.phone || '',
      role: row.role,
      isActive: row.isActive,
      password: '',
    });
    setError('');
    setMessage('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      fullName: '',
      email: '',
      phone: '',
      role: 'user',
      isActive: true,
      password: '',
    });
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const payload = {
      fullName: editForm.fullName,
      email: editForm.email,
      phone: editForm.phone || null,
      role: editForm.role,
      isActive: editForm.isActive,
    };
    if (editForm.password) {
      payload.password = editForm.password;
    }

    try {
      await axios.patch(`${USERS_API}/${editingId}`, payload);
      setMessage('User updated successfully');
      cancelEdit();
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this user? They will no longer be able to log in.')) {
      return;
    }
    setError('');
    setMessage('');
    try {
      await axios.delete(`${USERS_API}/${id}`);
      setMessage('User deactivated');
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to deactivate user');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center mb-6">
          <div className="bg-black rounded-xl px-10 py-4 shadow-lg">
            <img src={logo} alt="KHAKH RENTALS" className="h-20 w-auto" />
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-600">Manage users and repairer centers</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link to="/" className="text-red-600 hover:text-red-700 font-semibold">
              Back to app
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="text-gray-600 hover:text-gray-800 font-semibold"
            >
              Log out ({user?.fullName || user?.email})
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create user</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                placeholder="Full name"
                required
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                type="email"
                placeholder="Email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                type="text"
                placeholder="Phone (optional)"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                type="password"
                placeholder="Password"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                type="password"
                placeholder="Confirm password"
                required
                value={createForm.confirmPassword}
                onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-md bg-red-600 py-2 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {creating ? 'Creating...' : 'Create user'}
              </button>
            </form>
          </section>

          {editingId && (
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit user #{editingId}</h2>
              <form onSubmit={handleUpdate} className="space-y-3">
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  />
                  Active
                </label>
                <input
                  type="password"
                  placeholder="New password (optional)"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-md bg-red-600 py-2 text-white font-semibold hover:bg-red-700"
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 rounded-md border border-gray-300 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          </div>
          {loading ? (
            <p className="px-6 py-8 text-gray-500">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="px-6 py-8 text-gray-500">No users yet. Create one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">{row.fullName}</td>
                      <td className="px-4 py-3">{row.email}</td>
                      <td className="px-4 py-3">{row.phone || '—'}</td>
                      <td className="px-4 py-3 capitalize">{row.role}</td>
                      <td className="px-4 py-3">
                        {row.isActive ? (
                          <span className="text-green-700">Active</span>
                        ) : (
                          <span className="text-gray-500">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Edit
                          </button>
                          {row.isActive && (
                            <button
                              type="button"
                              onClick={() => handleDeactivate(row.id)}
                              className="text-gray-600 hover:text-gray-800 font-medium"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Repairer centers</h2>
            <p className="text-sm text-gray-500 mt-1">
              Centers added here appear in the Repairer Name dropdown for all users.
            </p>
          </div>

          <div className="p-6 border-b border-gray-200">
            <form onSubmit={handleCreateRepairer} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="New repairer center name"
                value={newRepairerName}
                onChange={(e) => setNewRepairerName(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2"
              />
              <button
                type="submit"
                disabled={creatingRepairer}
                className="rounded-md bg-red-600 px-4 py-2 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {creatingRepairer ? 'Adding...' : 'Add center'}
              </button>
            </form>
          </div>

          {repairersLoading ? (
            <p className="px-6 py-8 text-gray-500">Loading repairer centers...</p>
          ) : repairers.length === 0 ? (
            <p className="px-6 py-8 text-gray-500">No repairer centers yet. Add one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {repairers.map((repairer) => (
                    <tr key={repairer.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        {editingRepairerId === repairer.id ? (
                          <form onSubmit={handleUpdateRepairer} className="flex gap-2">
                            <input
                              type="text"
                              required
                              value={editRepairerName}
                              onChange={(e) => setEditRepairerName(e.target.value)}
                              className="flex-1 rounded-md border border-gray-300 px-2 py-1"
                            />
                            <button
                              type="submit"
                              className="text-red-600 hover:text-red-700 font-medium"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelRepairerEdit}
                              className="text-gray-600 hover:text-gray-800 font-medium"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          repairer.name
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {repairer.isActive ? (
                          <span className="text-green-700">Active</span>
                        ) : (
                          <span className="text-gray-500">Hidden</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {repairer.isActive && editingRepairerId !== repairer.id && (
                            <>
                              <button
                                type="button"
                                onClick={() => startRepairerEdit(repairer)}
                                className="text-red-600 hover:text-red-700 font-medium"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeactivateRepairer(repairer.id)}
                                className="text-gray-600 hover:text-gray-800 font-medium"
                              >
                                Remove
                              </button>
                            </>
                          )}
                          {!repairer.isActive && (
                            <button
                              type="button"
                              onClick={() => handleReactivateRepairer(repairer.id)}
                              className="text-red-600 hover:text-red-700 font-medium"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
