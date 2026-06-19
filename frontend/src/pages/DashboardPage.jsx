import { useEffect, useMemo, useState } from "react";
import api from "../api";
import AppLayout from "../components/AppLayout";

const roleLabels = {
  ADMIN: "Quản trị viên",
  TECHNICIAN: "Kỹ thuật viên",
  REPORTER: "Người báo hỏng"
};

<<<<<<< HEAD
const deviceTypeLabels = {
  PROJECTOR: "Máy chiếu",
  TV: "Tivi",
  AIR_CONDITIONER: "Điều hòa",
  COMPUTER: "Máy tính",
  SPEAKER: "Loa",
  TABLE_CHAIR: "Bàn ghế",
  OTHER: "Khác"
};

const deviceStatusLabels = {
  GOOD: "Hoạt động tốt",
  BROKEN: "Hỏng",
  REPAIRING: "Đang sửa chữa"
};

const reportStatusLabels = {
  PENDING: "Chờ xử lý",
  IN_PROGRESS: "Đang sửa",
  COMPLETED: "Hoàn thành"
};

const roomTypeLabels = {
  THEORY: "Phòng lý thuyết",
  COMPUTER_LAB: "Phòng máy tính",
  LAB: "Phòng thực hành"
};

function buildChartItems(summary, labelMap, keyName) {
  const countByKey = new Map(summary.map((item) => [item[keyName], item.count]));

  return Object.entries(labelMap).map(([key, label]) => ({
    key,
    label,
    count: countByKey.get(key) || 0
  }));
}

function HorizontalBarChart({ items, emptyText }) {
  const maxCount = Math.max(...items.map((item) => item.count), 0);
  const totalCount = items.reduce((sum, item) => sum + item.count, 0);

  if (totalCount === 0) {
    return <p className="chart-empty">{emptyText}</p>;
  }

  return (
    <div className="dashboard-bar-chart">
      {items.map((item) => {
        const percent = maxCount ? Math.round((item.count / maxCount) * 100) : 0;
        const share = totalCount ? Math.round((item.count / totalCount) * 100) : 0;

        return (
          <div key={item.key} className="chart-row">
            <div className="chart-row-label">
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </div>
            <div className="chart-track" aria-label={`${item.label}: ${item.count}`}>
              <div className="chart-fill" style={{ width: `${percent}%`, minWidth: item.count > 0 ? "3px" : 0 }} />
            </div>
            <small>{share}%</small>
          </div>
        );
      })}
    </div>
  );
}

=======
>>>>>>> 741e98d4b626de725b1b0468532cf241254b368a
export default function DashboardPage() {
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);

  const [stats, setStats] = useState({
    totalRooms: 0,
<<<<<<< HEAD
    totalDevices: 0,
    brokenDevices: 0,
    pendingReports: 0,
    deviceStatusSummary: [],
    deviceTypeSummary: [],
    reportStatusSummary: [],
    roomTypeSummary: [],
=======
    brokenDevices: 0,
    pendingReports: 0,
>>>>>>> 741e98d4b626de725b1b0468532cf241254b368a
    topBrokenRooms: []
  });
  const [error, setError] = useState("");

  async function loadStats() {
    try {
      const res = await api.get("/dashboard/stats");
<<<<<<< HEAD
      setStats((current) => ({ ...current, ...res.data }));
=======
      setStats(res.data);
>>>>>>> 741e98d4b626de725b1b0468532cf241254b368a
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được dữ liệu dashboard");
    }
  }

  useEffect(() => {
    if (user?.role) {
      loadStats();
    }
  }, [user?.role]);

  async function openExport(path, filename) {
    try {
      const res = await api.get(`/export/${path}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Không xuất được file báo cáo");
    }
  }

  const displayName = user?.fullName || user?.username || "Người dùng";
  const displayRole = roleLabels[user?.role] || user?.role || "Chưa có vai trò";
<<<<<<< HEAD
  const deviceStatusChart = useMemo(
    () => buildChartItems(stats.deviceStatusSummary || [], deviceStatusLabels, "status"),
    [stats.deviceStatusSummary]
  );
  const deviceTypeChart = useMemo(
    () => buildChartItems(stats.deviceTypeSummary || [], deviceTypeLabels, "type"),
    [stats.deviceTypeSummary]
  );
  const reportStatusChart = useMemo(
    () => buildChartItems(stats.reportStatusSummary || [], reportStatusLabels, "status"),
    [stats.reportStatusSummary]
  );
  const roomTypeChart = useMemo(
    () => buildChartItems(stats.roomTypeSummary || [], roomTypeLabels, "type"),
    [stats.roomTypeSummary]
  );
  const topBrokenChart = useMemo(
    () => (stats.topBrokenRooms || []).map((room) => ({
      key: room.roomId,
      label: room.roomCode,
      count: room.brokenCount
    })),
    [stats.topBrokenRooms]
  );
=======
>>>>>>> 741e98d4b626de725b1b0468532cf241254b368a

  return (
    <AppLayout
      active="dashboard"
      title="Trang chủ"
      subtitle={`Xin chào, ${displayName}`}
      user={user}
    >
      {error && <p className="error-message">{error}</p>}

      <div className="summary-grid dashboard-grid">
        <article className="summary-card">
          <span>Tổng số phòng học</span>
          <strong>{stats.totalRooms}</strong>
        </article>
        <article className="summary-card">
<<<<<<< HEAD
          <span>Tổng số thiết bị</span>
          <strong>{stats.totalDevices}</strong>
        </article>
        <article className="summary-card">
=======
>>>>>>> 741e98d4b626de725b1b0468532cf241254b368a
          <span>Thiết bị đang hỏng</span>
          <strong>{stats.brokenDevices}</strong>
        </article>
        <article className="summary-card">
          <span>Phiếu mới chưa xử lý</span>
          <strong>{stats.pendingReports}</strong>
        </article>
        <article className="summary-card">
          <span>Vai trò hiện tại</span>
          <strong>{displayRole}</strong>
        </article>
      </div>

<<<<<<< HEAD
      <section className="dashboard-chart-grid" aria-label="Biểu đồ tổng quan">
        <article className="dashboard-chart-card">
          <div className="chart-card-header">
            <h2>Tình trạng thiết bị</h2>
            <span>{stats.totalDevices} thiết bị</span>
          </div>
          <HorizontalBarChart items={deviceStatusChart} emptyText="Chưa có thiết bị trong hệ thống" />
        </article>

        <article className="dashboard-chart-card">
          <div className="chart-card-header">
            <h2>Loại thiết bị</h2>
            <span>Theo danh mục</span>
          </div>
          <HorizontalBarChart items={deviceTypeChart} emptyText="Chưa có dữ liệu loại thiết bị" />
        </article>

        <article className="dashboard-chart-card">
          <div className="chart-card-header">
            <h2>Trạng thái phiếu</h2>
            <span>{stats.pendingReports} phiếu chờ</span>
          </div>
          <HorizontalBarChart items={reportStatusChart} emptyText="Chưa có phiếu báo hỏng" />
        </article>

        <article className="dashboard-chart-card">
          <div className="chart-card-header">
            <h2>Loại phòng học</h2>
            <span>{stats.totalRooms} phòng</span>
          </div>
          <HorizontalBarChart items={roomTypeChart} emptyText="Chưa có phòng học trong hệ thống" />
        </article>
      </section>

      <section className="dashboard-chart-card dashboard-section">
        <div className="chart-card-header">
          <h2>Biểu đồ phòng có thiết bị hỏng</h2>
          <span>Top 5 phòng</span>
        </div>
        <HorizontalBarChart items={topBrokenChart} emptyText="Chưa có thiết bị hỏng" />
      </section>

=======
>>>>>>> 741e98d4b626de725b1b0468532cf241254b368a
      <section className="table-section dashboard-section">
        <div className="section-heading-row">
          <h2>Top 5 phòng có nhiều thiết bị hỏng</h2>
          <div className="form-actions inline-actions">
            <button type="button" className="secondary-button" onClick={() => openExport("devices", "danh-sach-thiet-bi.csv")}>Xuất thiết bị</button>
            <button type="button" className="secondary-button" onClick={() => openExport("repair-logs", "lich-su-sua-chua.csv")}>Xuất lịch sử sửa</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Phòng</th>
              <th>Loại phòng</th>
              <th>Số thiết bị hỏng</th>
            </tr>
          </thead>
          <tbody>
            {stats.topBrokenRooms.length === 0 ? (
              <tr><td colSpan="3">Chưa có thiết bị hỏng</td></tr>
            ) : stats.topBrokenRooms.map((room) => (
              <tr key={room.roomId}>
                <td>{room.roomCode}</td>
                <td>{room.roomType}</td>
                <td>{room.brokenCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppLayout>
  );
}
