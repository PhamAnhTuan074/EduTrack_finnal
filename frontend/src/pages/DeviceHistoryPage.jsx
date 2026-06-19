import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";

const statusLabels = {
  GOOD: "Tốt",
  BROKEN: "Hỏng",
  REPAIRING: "Đang sửa chữa"
};

const permissionDeniedMessage = "Bạn không có quyền thực hiện thao tác này";

export default function DeviceHistoryPage() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);

  const [device, setDevice] = useState(null);
  const [repairLogs, setRepairLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("repaired-desc");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const canViewRepairHistory = user?.role === "ADMIN" || user?.role === "TECHNICIAN";

  async function loadHistory() {
    if (!canViewRepairHistory) {
      setError(permissionDeniedMessage);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await api.get(`/devices/${deviceId}/repair-logs`);
      setDevice(res.data.device);
      setRepairLogs(res.data.repairLogs);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được lịch sử sửa chữa");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [deviceId, canViewRepairHistory]);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleRepairLogs = useMemo(() => {
    const filteredLogs = repairLogs.filter((log) => {
      const searchableText = [
        log.repairedAt?.slice(0, 10),
        log.content,
        log.technician?.fullName,
        log.technician?.username,
        String(log.quantity),
        log.afterStatus,
        statusLabels[log.afterStatus],
        log.report ? `#${log.report.id}` : ""
      ].join(" ").toLowerCase();

      return searchableText.includes(normalizedSearch);
    });

    return [...filteredLogs].sort((a, b) => {
      switch (sortOption) {
        case "repaired-asc":
          return new Date(a.repairedAt || 0) - new Date(b.repairedAt || 0);
        case "technician-asc":
          return (a.technician?.fullName || "").localeCompare(b.technician?.fullName || "", "vi");
        case "quantity-desc":
          return b.quantity - a.quantity;
        case "status-asc":
          return (statusLabels[a.afterStatus] || a.afterStatus).localeCompare(statusLabels[b.afterStatus] || b.afterStatus, "vi");
        default:
          return new Date(b.repairedAt || 0) - new Date(a.repairedAt || 0);
      }
    });
  }, [normalizedSearch, repairLogs, sortOption]);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <h2>CSVC</h2>
        <Link to="/dashboard">Trang chủ</Link>
        <Link to="/rooms">Phòng học</Link>
        <Link to="/reports/new">Báo hỏng</Link>
        <Link to="/reports">Phiếu báo hỏng</Link>
      </aside>

      <section className="content-panel">
        <nav className="breadcrumb">
          <Link to="/dashboard">Trang chủ</Link>
          <span>/</span>
          <Link to="/rooms">Phòng {device?.room?.code || "..."}</Link>
          <span>/</span>
          <strong>Lịch sử bảo trì</strong>
        </nav>

        <header className="page-header">
          <div>
            <h1>Lịch sử bảo trì: {device?.code || "..."}</h1>
            <p>{device?.name} - {user?.fullName}</p>
          </div>
          <button className="secondary-button" onClick={logout}>Đăng xuất</button>
        </header>

        {error && <p className="error-message">{error}</p>}

        <section className="table-section">
          <div className="toolbar">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm nội dung, kỹ thuật viên, phiếu..." />
            <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} aria-label="Sắp xếp lịch sử bảo trì">
              <option value="repaired-desc">Mới sửa trước</option>
              <option value="repaired-asc">Cũ nhất trước</option>
              <option value="technician-asc">Kỹ thuật viên A-Z</option>
              <option value="quantity-desc">Số lượng giảm dần</option>
              <option value="status-asc">Trạng thái A-Z</option>
            </select>
          </div>

          <table>
            <thead>
              <tr>
                <th>Ngày sửa</th>
                <th>Nội dung sửa</th>
                <th>Kỹ thuật viên</th>
                <th>Số lượng</th>
                <th>Trạng thái sau sửa</th>
                <th>Phiếu liên quan</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="6">Đang tải dữ liệu...</td></tr>
              ) : visibleRepairLogs.length === 0 ? (
                <tr><td colSpan="6">Thiết bị chưa có lịch sử sửa chữa</td></tr>
              ) : visibleRepairLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.repairedAt?.slice(0, 10)}</td>
                  <td>{log.content}</td>
                  <td>{log.technician?.fullName}</td>
                  <td>{log.quantity}</td>
                  <td>{statusLabels[log.afterStatus]}</td>
                  <td>{log.report ? `#${log.report.id}` : "Không có"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
