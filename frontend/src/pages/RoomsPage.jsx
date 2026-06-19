import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import AppLayout from "../components/AppLayout";

const emptyForm = { code: "", type: "THEORY", capacity: "", status: "ACTIVE" };

const roomTypeLabels = {
  THEORY: "Phòng học lý thuyết",
  COMPUTER_LAB: "Phòng máy tính",
  LAB: "Phòng thực hành"
};

const roomStatusLabels = {
  ACTIVE: "Đang sử dụng",
  MAINTENANCE: "Đang bảo trì"
};

const permissionDeniedMessage = "Bạn không có quyền thực hiện thao tác này";

export default function RoomsPage() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOption, setSortOption] = useState("code-asc");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const canManageRooms = user?.role === "ADMIN";

  async function loadRooms(nextSearch = search) {
    setIsLoading(true);
    setError("");

    try {
      const res = await api.get("/rooms", { params: nextSearch ? { search: nextSearch } : undefined });
      setRooms(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách phòng học");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadRooms(""); }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleRooms = useMemo(() => {
    const filteredRooms = rooms.filter((room) => {
      const searchableText = [
        room.code,
        room.type,
        roomTypeLabels[room.type],
        room.status,
        roomStatusLabels[room.status],
        String(room.capacity),
        String(room._count?.devices ?? 0)
      ].join(" ").toLowerCase();
      const matchesSearch = searchableText.includes(normalizedSearch);
      const matchesStatus = statusFilter ? room.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });

    return [...filteredRooms].sort((a, b) => {
      switch (sortOption) {
        case "code-desc":
          return b.code.localeCompare(a.code, "vi", { numeric: true });
        case "capacity-desc":
          return b.capacity - a.capacity;
        case "capacity-asc":
          return a.capacity - b.capacity;
        case "devices-desc":
          return (b._count?.devices ?? 0) - (a._count?.devices ?? 0);
        case "devices-asc":
          return (a._count?.devices ?? 0) - (b._count?.devices ?? 0);
        default:
          return a.code.localeCompare(b.code, "vi", { numeric: true });
      }
    });
  }, [normalizedSearch, rooms, sortOption, statusFilter]);
  const activeCount = rooms.filter((room) => room.status === "ACTIVE").length;
  const maintenanceCount = rooms.filter((room) => room.status === "MAINTENANCE").length;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function showPermissionDenied() {
    setMessage("");
    setError(permissionDeniedMessage);
  }

  function openCreateForm() {
    if (!canManageRooms) {
      showPermissionDenied();
      return;
    }

    setEditingRoomId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
    setIsFormOpen(true);
  }

  function startEdit(room) {
    if (!canManageRooms) {
      showPermissionDenied();
      return;
    }

    setEditingRoomId(room.id);
    setForm({ code: room.code, type: room.type, capacity: String(room.capacity), status: room.status });
    setMessage("");
    setError("");
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingRoomId(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = { ...form, capacity: Number(form.capacity) };

      if (editingRoomId) {
        await api.put(`/rooms/${editingRoomId}`, payload);
        setMessage("Cập nhật phòng học thành công");
      } else {
        await api.post("/rooms", payload);
        setMessage("Thêm phòng học thành công");
      }

      closeForm();
      await loadRooms(search);
    } catch (err) {
      setError(err.response?.data?.message || "Không lưu được phòng học");
    }
  }

  async function deleteRoom(room) {
    if (!canManageRooms) {
      showPermissionDenied();
      return;
    }

    const confirmed = window.confirm(`Xóa phòng ${room.code}?`);
    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      await api.delete(`/rooms/${room.id}`);
      setMessage("Xóa phòng học thành công");
      await loadRooms(search);
    } catch (err) {
      setError(err.response?.data?.message || "Không xóa được phòng học");
    }
  }

  return (
    <AppLayout active="rooms" title="Quản lý phòng học" subtitle={`${rooms.length} phòng học trong hệ thống`} user={user}>
      <div className="admin-page-toolbar">
        <div className="admin-search-box">
          <span>⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã / tên phòng..." />
        </div>
        <select className="sort-select" value={sortOption} onChange={(e) => setSortOption(e.target.value)} aria-label="Sắp xếp phòng học">
          <option value="code-asc">Mã phòng A-Z</option>
          <option value="code-desc">Mã phòng Z-A</option>
          <option value="capacity-desc">Sức chứa cao nhất</option>
          <option value="capacity-asc">Sức chứa thấp nhất</option>
          <option value="devices-desc">Nhiều thiết bị nhất</option>
          <option value="devices-asc">Ít thiết bị nhất</option>
        </select>
        <button type="button" className="primary-action" onClick={openCreateForm}>+ Thêm phòng</button>
      </div>

      <div className="filter-pills">
        <button type="button" className={!statusFilter ? "active" : ""} onClick={() => setStatusFilter("")}>Tất cả ({rooms.length})</button>
        <button type="button" className={statusFilter === "ACTIVE" ? "active" : ""} onClick={() => setStatusFilter("ACTIVE")}>Đang sử dụng ({activeCount})</button>
        <button type="button" className={statusFilter === "MAINTENANCE" ? "active" : ""} onClick={() => setStatusFilter("MAINTENANCE")}>Đang bảo trì ({maintenanceCount})</button>
      </div>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      {isLoading ? (
        <section className="empty-panel">Đang tải dữ liệu...</section>
      ) : visibleRooms.length === 0 ? (
        <section className="empty-panel">Không tìm thấy phòng học phù hợp</section>
      ) : (
        <section className="room-card-grid">
          {visibleRooms.map((room) => (
            <article key={room.id} className="room-card">
              <div className="room-icon">🏫</div>
              <h2>{room.code}</h2>
              <p>{roomTypeLabels[room.type]}</p>
              <span className={room.status === "ACTIVE" ? "status-pill good" : "status-pill warning"}>● {roomStatusLabels[room.status]}</span>
              <div className="room-meta">
                <span>{room.capacity} chỗ</span>
                <span>{room._count?.devices ?? 0} thiết bị</span>
              </div>
              <div className="room-card-actions">
                <button type="button" onClick={() => navigate(`/devices?roomId=${room.id}`)}>Thiết bị</button>
                <button type="button" onClick={() => startEdit(room)}>Sửa</button>
                <button type="button" className="danger-button" onClick={() => deleteRoom(room)}>Xóa</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation">
          <form className="admin-modal" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h2>{editingRoomId ? "Sửa phòng học" : "Thêm phòng học"}</h2>
              <button type="button" onClick={closeForm}>×</button>
            </div>
            <div className="modal-grid">
              <label>Mã phòng *<input value={form.code} onChange={(e) => updateField("code", e.target.value)} placeholder="P101" /></label>
              <label>Loại phòng *<select value={form.type} onChange={(e) => updateField("type", e.target.value)}><option value="THEORY">Phòng học lý thuyết</option><option value="COMPUTER_LAB">Phòng máy tính</option><option value="LAB">Phòng thực hành</option></select></label>
              <label>Sức chứa *<input type="number" min="1" value={form.capacity} onChange={(e) => updateField("capacity", e.target.value)} placeholder="60" /></label>
              <label>Trạng thái *<select value={form.status} onChange={(e) => updateField("status", e.target.value)}><option value="ACTIVE">Đang sử dụng</option><option value="MAINTENANCE">Đang bảo trì</option></select></label>
            </div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={closeForm}>Hủy</button><button type="submit">Lưu thay đổi</button></div>
          </form>
        </div>
      )}
    </AppLayout>
  );
}
