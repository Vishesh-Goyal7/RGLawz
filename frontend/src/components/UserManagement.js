import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import UserFormModal from "./UserFormModal";
import AssignCaseModal from "./AssignCaseModal";
import "../styles/UserManagement.css";

const UserManagement = () => {
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  const [users, setUsers] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [assignCaseUser, setAssignCaseUser] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    if (currentUser.role === "admin") {
      fetchAll();
    }
    // eslint-disable-next-line
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [usersRes, casesRes] = await Promise.all([
        api.get("/users", authHeaders),
        api.get("/cases", authHeaders),
      ]);

      setUsers(usersRes.data.data || []);
      setCases(casesRes.data.data || []);
    } catch (error) {
      console.error("Failed to fetch users module data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const openAssignModal = (user) => {
    setAssignCaseUser(user);
    setIsAssignModalOpen(true);
  };

  const closeModals = () => {
    setEditingUser(null);
    setIsFormOpen(false);
    setAssignCaseUser(null);
    setIsAssignModalOpen(false);
  };

  const handleDeleteUser = async (userId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this user?"
    );
    if (!confirmed) return;

    try {
      await api.delete(`/users/${userId}`, authHeaders);
      await fetchAll();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete user.");
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await api.put(
        `/users/${user._id}`,
        {
          isActive: !user.isActive,
        },
        authHeaders
      );
      await fetchAll();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update user status.");
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const text = searchText.toLowerCase();

      const matchesSearch =
        user.name?.toLowerCase().includes(text) ||
        user.email?.toLowerCase().includes(text);

      const matchesRole = roleFilter ? user.role === roleFilter : true;
      const matchesStatus =
        statusFilter === ""
          ? true
          : statusFilter === "active"
          ? user.isActive
          : !user.isActive;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchText, roleFilter, statusFilter]);

  if (currentUser.role !== "admin") {
    return (
      <div className="restricted-card">
        <h2>Restricted Area</h2>
        <p>
          You do not have permission to access the Users module. Contact an
          admin for these privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-toolbar">
        <div>
          <h2>Users</h2>
          <p>Manage team members, roles, access, and case assignments.</p>
        </div>

        <button className="primary-btn" onClick={openCreateModal}>
          + Add User
        </button>
      </div>

      <div className="user-filters">
        <input
          type="text"
          placeholder="Search by name or email"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="junior">Junior</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="users-table-card">
        {loading ? (
          <p className="empty-text">Loading users...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="empty-text">No users found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.phone || "N/A"}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          user.isActive ? "active" : "on_hold"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="secondary-btn"
                          onClick={() => openEditModal(user)}
                        >
                          Edit
                        </button>

                        <button
                          className="history-btn"
                          onClick={() => openAssignModal(user)}
                        >
                          Assign Cases
                        </button>

                        <button
                          className="secondary-btn"
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>

                        {currentUser._id !== user._id && (
                          <button
                            className="danger-btn"
                            onClick={() => handleDeleteUser(user._id)}
                          >
                            Delete
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
      </div>

      {isFormOpen && (
        <UserFormModal
          onClose={closeModals}
          onSuccess={fetchAll}
          editingUser={editingUser}
          authHeaders={authHeaders}
        />
      )}

      {isAssignModalOpen && assignCaseUser && (
        <AssignCaseModal
          onClose={closeModals}
          onSuccess={fetchAll}
          selectedUser={assignCaseUser}
          cases={cases}
          authHeaders={authHeaders}
        />
      )}
    </div>
  );
};

export default UserManagement;
