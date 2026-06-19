import { useEffect, useMemo, useState } from "react";
import api from "../api";
import AppLayout from "../components/AppLayout";

const emptyForm = { fullName: "", username: "", password: "", role: "REPORTER", status: "ACTIVE" };
const roleLabels = { ADMIN: "Quản trị viên", TECHNICIAN: "Kỹ thuật viên", REPORTER: "Người dùng" };
const statusLabels = { ACTIVE: "Hoạt động", LOCKED: "Đã khóa" };

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("vi-VN");
}

export default function UsersPage() {
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sortOption, setSortOption] = useState("name-asc");
  const [form, setForm] = useState(emptyForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadUsers() {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get("/users", { params: { ...(search ? { search } : {}), ...(roleFilter ? { role: roleFilter } : {}) } });
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách người dùng");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, [roleFilter]);

  const adminCount = users.filter((item) => item.role === "ADMIN").length;
  const techCount = users.filter((item) => item.role === "TECHNICIAN").length;
  const reporterCount = users.filter((item) => item.role === "REPORTER").length;
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      switch (sortOption) {
        case "name-desc":
          return b.fullName.localeCompare(a.fullName, "vi", { numeric: true });
        case "username-asc":
          return a.username.localeCompare(b.username, "vi", { numeric: true });
        case "role-asc":
          return (roleLabels[a.role] || a.role).localeCompare(roleLabels[b.role] || b.role, "vi");
        case "status-asc":
          return (statusLabels[a.status] || a.status).localeCompare(statusLabels[b.status] || b.status, "vi");
        case "created-newest":
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case "created-oldest":
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        default:
          return a.fullName.localeCompare(b.fullName, "vi", { numeric: true });
      }
    });
  }, [sortOption, users]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateForm() {
    setEditingUserId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
    setIsFormOpen(true);
  }

  function startEdit(item) {
    setEditingUserId(item.id);
    setForm({ fullName: item.fullName, username: item.username, password: "", role: item.role, status: item.status });
    setMessage("");
    setError("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingUserId(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      if (editingUserId) {
        await api.put(`/users/${editingUserId}`, form);
        setMessage("Cập nhật người dùng thành công");
      } else {
        await api.post("/users", { ...form, password: form.password || "123456" });
        setMessage("Thêm người dùng thành công");
      }
      closeForm();
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Không lưu được người dùng");
    }
  }

  async function toggleStatus(item) {
    setMessage("");
    setError("");
    try {
      const nextStatus = item.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
      await api.patch(`/users/${item.id}/status`, { status: nextStatus });
      setMessage(nextStatus === "LOCKED" ? "Đã khóa người dùng" : "Đã mở khóa người dùng");
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Không cập nhật được trạng thái người dùng");
    }
  }

  if (user?.role !== "ADMIN") {
    return <AppLayout active="users" title="Quản lý người dùng" subtitle="Chỉ ADMIN được truy cập" user={user}><p className="error-message">Bạn không có quyền thực hiện thao tác này</p></AppLayout>;
  }

  return (
    <AppLayout active="users" title="Quản lý người dùng" subtitle={`${users.length} người dùng trong hệ thống`} user={user}>
      <div className="admin-page-toolbar">
        <div className="admin-search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") loadUsers(); }} placeholder="Tìm tên, email, username..." /></div>
        <select className="sort-select" value={sortOption} onChange={(e) => setSortOption(e.target.value)} aria-label="Sắp xếp người dùng">
          <option value="name-asc">Tên A-Z</option>
          <option value="name-desc">Tên Z-A</option>
          <option value="username-asc">Username A-Z</option>
          <option value="role-asc">Vai trò A-Z</option>
          <option value="status-asc">Trạng thái A-Z</option>
          <option value="created-newest">Mới tạo trước</option>
          <option value="created-oldest">Cũ nhất trước</option>
        </select>
        <button type="button" className="primary-action" onClick={openCreateForm}>+ Thêm người dùng</button>
      </div>

      <div className="filter-pills">
        <button type="button" className={!roleFilter ? "active" : ""} onClick={() => setRoleFilter("")}>Tất cả ({users.length})</button>
        <button type="button" className={roleFilter === "ADMIN" ? "active" : ""} onClick={() => setRoleFilter("ADMIN")}>Quản trị viên ({adminCount})</button>
        <button type="button" className={roleFilter === "TECHNICIAN" ? "active" : ""} onClick={() => setRoleFilter("TECHNICIAN")}>Kỹ thuật viên ({techCount})</button>
        <button type="button" className={roleFilter === "REPORTER" ? "active" : ""} onClick={() => setRoleFilter("REPORTER")}>Người dùng ({reporterCount})</button>
        <button type="button" onClick={loadUsers}>Tìm kiếm</button>
      </div>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <section className="dark-table-wrap">
        <table className="admin-data-table users-table">
          <thead><tr><th>Người dùng</th><th>Username</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan="7">Đang tải dữ liệu...</td></tr> : sortedUsers.length === 0 ? <tr><td colSpan="7">Chưa có người dùng</td></tr> : sortedUsers.map((item) => (
              <tr key={item.id}>
                <td><div className="user-row"><span>{item.fullName?.charAt(0).toUpperCase()}</span><strong>{item.fullName}</strong></div></td>
                <td className="code-cell">{item.username}</td>
                <td>{item.username}@school.edu.vn</td>
                <td><span className="type-badge">{roleLabels[item.role]}</span></td>
                <td><span className={item.status === "ACTIVE" ? "status-pill good" : "status-pill danger"}>● {statusLabels[item.status]}</span></td>
                <td>{formatDate(item.createdAt)}</td>
                <td className="table-actions"><button type="button" onClick={() => startEdit(item)}>Sửa</button><button type="button" className="danger-button" onClick={() => toggleStatus(item)}>{item.status === "ACTIVE" ? "Khóa" : "Mở khóa"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="admin-modal" onSubmit={handleSubmit}>
            <div className="modal-header"><h2>{editingUserId ? "Sửa người dùng" : "Thêm người dùng"}</h2><button type="button" onClick={closeForm}>×</button></div>
            <div className="modal-grid">
              <label>Họ tên *<input value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="Nguyễn Văn A" /></label>
              <label>Username *<input value={form.username} onChange={(e) => updateField("username", e.target.value)} placeholder="user01" /></label>
              <label>Mật khẩu {editingUserId ? "mới" : "*"}<input type="password" value={form.password} onChange={(e) => updateField("password", e.target.value)} placeholder={editingUserId ? "Để trống nếu không đổi" : "123456"} /></label>
              <label>Vai trò *<select value={form.role} onChange={(e) => updateField("role", e.target.value)}><option value="ADMIN">Quản trị viên</option><option value="TECHNICIAN">Kỹ thuật viên</option><option value="REPORTER">Người dùng</option></select></label>
              <label className="span-2">Trạng thái<select value={form.status} onChange={(e) => updateField("status", e.target.value)}><option value="ACTIVE">Hoạt động</option><option value="LOCKED">Khóa</option></select></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={closeForm}>Hủy</button><button type="submit">Lưu thay đổi</button></div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
