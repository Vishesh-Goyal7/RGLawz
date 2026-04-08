import React, { useEffect, useState } from "react";
import api from "../services/api";
import "../styles/UserManagement.css";

const UserFormModal = ({ onClose, onSuccess, editingUser, authHeaders }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "junior",
    phone: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || "",
        email: editingUser.email || "",
        password: "",
        role: editingUser.role || "junior",
        phone: editingUser.phone || "",
        isActive: editingUser.isActive ?? true,
      });
    }
  }, [editingUser]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (editingUser) {
        await api.put(
          `/users/${editingUser._id}`,
          {
            name: formData.name,
            email: formData.email,
            role: formData.role,
            phone: formData.phone,
            isActive: formData.isActive,
          },
          authHeaders
        );
      } else {
        await api.post(
          "/users",
          {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            phone: formData.phone,
          },
          authHeaders
        );
      }

      await onSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{editingUser ? "Edit User" : "Add User"}</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="user-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {!editingUser && (
            <div className="form-group">
              <label>Password</label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="junior">Junior</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          {editingUser && (
            <div className="form-group checkbox-row">
              <label>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                Active User
              </label>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Saving..." : editingUser ? "Update User" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
