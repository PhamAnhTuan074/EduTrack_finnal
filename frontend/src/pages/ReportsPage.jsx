import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import AppLayout from "../components/AppLayout";

const statusLabels = {
  PENDING: "Chờ xử lý",
  IN_PROGRESS: "Đang sửa",
  COMPLETED: "Hoàn thành"
};

const reportTabs = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "IN_PROGRESS", label: "Đang sửa" },
  { value: "COMPLETED", label: "Hoàn thành" }
];

export default function ReportsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);

  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOption, setSortOption] = useState("created-desc");
  const [openActionReportId, setOpenActionReportId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadReports() {
    setIsLoading(true);
    setError("");

    try {
      const res = await api.get("/reports");
      setReports(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách phiếu báo hỏng");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  async function updateStatus(report, status) {
    setMessage("");
    setError("");
    setOpenActionReportId(null);

    try {
      await api.patch(`/reports/${report.id}/status`, { status });
      setMessage(`Đã cập nhật phiếu #${report.id}`);
      await loadReports();
    } catch (err) {
      setError(err.response?.data?.message || "Không cập nhật được trạng thái phiếu");
    }
  }

  function openReportDetail(report) {
    setSelectedReport(report);
    setOpenActionReportId(null);
    setMessage("");
    setError("");
  }

  async function confirmReport(report) {
    setMessage("");
    setError("");

    try {
      const res = await api.patch(`/reports/${report.id}/status`, { status: "IN_PROGRESS" });
      setSelectedReport(res.data);
      setMessage(`Đã xác nhận phiếu #${report.id} và chuyển sang Đang sửa`);
      await loadReports();
    } catch (err) {
      setError(err.response?.data?.message || "Không xác nhận được phiếu báo hỏng");
    }
  }

  function openRepairForm(report) {
    setOpenActionReportId(null);

    if (!report.devices?.length) {
      setError("Phiếu này chưa có thiết bị để ghi sửa chữa");
      return;
    }

    navigate(`/repair-logs/new?reportId=${report.id}&complete=1`);
  }

  const normalizedSearch = search.trim().toLowerCase();
  const visibleReports = useMemo(() => {
    const filteredReports = reports.filter((report) => {
      const matchesStatus = statusFilter ? report.status === statusFilter : true;
      const deviceNames = report.devices.map((item) => item.device.name).join(" ");
      const searchableText = [
        `#${report.id}`,
        String(report.id),
        report.room?.code,
        deviceNames,
        report.reporter?.fullName,
        report.reporter?.username,
        report.description,
        report.status,
        statusLabels[report.status],
        report.createdAt?.slice(0, 10)
      ].join(" ").toLowerCase();

      return matchesStatus && searchableText.includes(normalizedSearch);
    });

    return [...filteredReports].sort((a, b) => {
      switch (sortOption) {
        case "created-asc":
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case "id-asc":
          return a.id - b.id;
        case "id-desc":
          return b.id - a.id;
        case "room-asc":
          return (a.room?.code || "").localeCompare(b.room?.code || "", "vi", { numeric: true });
        case "status-asc":
          return (statusLabels[a.status] || a.status).localeCompare(statusLabels[b.status] || b.status, "vi");
        default:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });
  }, [normalizedSearch, reports, sortOption, statusFilter]);

  function countByStatus(status) {
    return status ? reports.filter((report) => report.status === status).length : reports.length;
  }

  return (
    <AppLayout
      active="reports"
      title="Danh sách phiếu báo hỏng"
      subtitle={`${user?.fullName || user?.username || "Người dùng"} - ${user?.role || ""}`}
      user={user}
    >
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="admin-page-toolbar">
        <div className="admin-search-box">
          <span>⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm phiếu, phòng, thiết bị..." />
        </div>
        <select className="sort-select" value={sortOption} onChange={(e) => setSortOption(e.target.value)} aria-label="Sắp xếp phiếu báo hỏng">
          <option value="created-desc">Mới nhất trước</option>
          <option value="created-asc">Cũ nhất trước</option>
          <option value="id-desc">ID giảm dần</option>
          <option value="id-asc">ID tăng dần</option>
          <option value="room-asc">Phòng A-Z</option>
          <option value="status-asc">Trạng thái A-Z</option>
        </select>
      </div>

      <div className="filter-pills">
        {reportTabs.map((tab) => (
          <button
            key={tab.value || "all"}
            type="button"
            className={statusFilter === tab.value ? "active" : ""}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label} ({countByStatus(tab.value)})
          </button>
        ))}
      </div>

      <section className="table-section reports-table-section">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Phòng</th>
              <th>Thiết bị</th>
              <th>Người báo cáo</th>
              <th>Mô tả</th>
              <th>Trạng thái</th>
              <th>Ngày báo cáo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="8">Đang tải dữ liệu...</td></tr>
            ) : visibleReports.length === 0 ? (
              <tr><td colSpan="8">Chưa có phiếu báo hỏng</td></tr>
            ) : visibleReports.map((report) => (
              <tr key={report.id}>
                <td>#{report.id}</td>
                <td>{report.room?.code}</td>
                <td>{report.devices.map((item) => item.device.name).join(", ")}</td>
                <td>{report.reporter?.fullName}</td>
                <td>{report.description}</td>
                <td>{statusLabels[report.status]}</td>
                <td>{report.createdAt?.slice(0, 10)}</td>
                <td className="table-actions">
                  <div className={openActionReportId === report.id ? "action-menu is-open" : "action-menu"}>
                    <button
                      type="button"
                      className="action-menu-trigger"
                      aria-expanded={openActionReportId === report.id}
                      aria-label={`Mở thao tác cho phiếu #${report.id}`}
                      onClick={() => setOpenActionReportId((current) => current === report.id ? null : report.id)}
                    >
                      ☰
                    </button>
                    {openActionReportId === report.id && (
                      <div className="action-menu-list action-menu-list-wide">
                        <span className="action-menu-label">Phiếu #{report.id}</span>
                        <button type="button" className="action-primary" onClick={() => openReportDetail(report)}>Xem chi tiết</button>
                        <button type="button" className="action-primary" onClick={() => openRepairForm(report)}>Hoàn thành</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selectedReport && (
        <div className="report-detail-backdrop" role="presentation" onClick={() => setSelectedReport(null)}>
          <section
            className="report-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="report-detail-header">
              <div>
                <span>Phiếu báo hỏng #{selectedReport.id}</span>
                <h2 id="report-detail-title">{selectedReport.room?.code || "Không rõ phòng"}</h2>
                <p>{statusLabels[selectedReport.status] || selectedReport.status}</p>
              </div>
              <button type="button" onClick={() => setSelectedReport(null)} aria-label="Đóng chi tiết">×</button>
            </div>

            <div className="report-detail-body">
              <div className="report-detail-grid">
                <section>
                  <span>Người báo cáo</span>
                  <strong>{selectedReport.reporter?.fullName || selectedReport.reporter?.username || "Không rõ"}</strong>
                </section>
                <section>
                  <span>Ngày báo cáo</span>
                  <strong>{selectedReport.createdAt?.slice(0, 10)}</strong>
                </section>
                <section>
                  <span>Phòng</span>
                  <strong>{selectedReport.room?.code || "Không rõ"}</strong>
                </section>
                <section>
                  <span>Trạng thái</span>
                  <strong>{statusLabels[selectedReport.status] || selectedReport.status}</strong>
                </section>
              </div>

              <section className="report-detail-block">
                <span>Thiết bị báo hỏng</span>
                <div className="report-device-list">
                  {selectedReport.devices?.map((item) => (
                    <strong key={item.device?.id || item.deviceId}>{item.device?.name || "Thiết bị không rõ"}</strong>
                  ))}
                </div>
              </section>

              <section className="report-detail-block">
                <span>Mô tả sự cố</span>
                <p>{selectedReport.description}</p>
              </section>
            </div>

            <div className="report-detail-actions">
              {selectedReport.status === "PENDING" && (
                <button type="button" onClick={() => confirmReport(selectedReport)}>Xác nhận</button>
              )}
              <button type="button" className="secondary-button" onClick={() => setSelectedReport(null)}>Đóng</button>
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}
