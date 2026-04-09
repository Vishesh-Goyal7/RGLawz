import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import UserFormModal from "./UserFormModal";
import "../styles/UserManagement.css";

const UserManagement = () => {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users", authHeaders);
      setUsers(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
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

  const closeModal = () => {
    setEditingUser(null);
    setIsFormOpen(false);
  };

  const handleDelete = async (userId) => {
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;

    try {
      await api.delete(`/users/${userId}`, authHeaders);
      await fetchUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert(error.response?.data?.message || "Failed to delete user.");
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = window.prompt("Enter new password for this user:");
    if (!newPassword) return;

    try {
      await api.patch(`/users/${userId}/reset-password`, { newPassword }, authHeaders);
      alert("Password reset successfully.");
    } catch (error) {
      console.error("Failed to reset password:", error);
      alert(error.response?.data?.message || "Failed to reset password.");
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      const text = searchText.toLowerCase();

      const matchesSearch =
        item.name?.toLowerCase().includes(text) ||
        item.email?.toLowerCase().includes(text) ||
        item.phone?.toLowerCase().includes(text);

      const matchesRole = roleFilter ? item.role === roleFilter : true;

      const matchesStatus =
        statusFilter === "active"
          ? item.isActive === true
          : statusFilter === "inactive"
          ? item.isActive === false
          : true;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchText, roleFilter, statusFilter]);

  if (storedUser.role !== "admin") {
    return (
      <div className="user-management">
        <div className="restricted-card">
          <h2>Access Restricted</h2>
          <p>You do not have permission to view this section. Please contact an administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-toolbar">
        <div>
          <h2>Users</h2>
          <p>Manage team members and their access roles.</p>
        </div>

        <button className="primary-btn" onClick={openCreateModal}>
          + Add User
        </button>
      </div>

      <div className="user-filters">
        <input
          type="text"
          placeholder="Search by name, email, or phone"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="junior">Junior</option>
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
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
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item) => (
                  <tr key={item._id}>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td>{item.phone || "N/A"}</td>
                    <td>
                      <span className={`role-badge ${item.role}`}>{item.role}</span>
                    </td>
                    <td>{item.isActive ? "Active" : "Inactive"}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="secondary-btn" onClick={() => openEditModal(item)}>
                          Edit
                        </button>
                        <button className="secondary-btn" onClick={() => handleResetPassword(item._id)}>
                          Reset Password
                        </button>
                        <button className="danger-btn" onClick={() => handleDelete(item._id)}>
                          Delete
                        </button>
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
          onClose={closeModal}
          onSuccess={fetchUsers}
          editingUser={editingUser}
          authHeaders={authHeaders}
        />
      )}
    </div>
  );
};

export default UserManagement;
