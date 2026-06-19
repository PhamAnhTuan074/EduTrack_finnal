import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import AppLayout from "../components/AppLayout";

const typeLabels = {
  DAMAGE_REPORT: "Phiếu báo hỏng",
  ADMIN_ANNOUNCEMENT: "Admin",
  REPAIR_UPDATE: "Sửa chữa"
};

const typeIcons = {
  DAMAGE_REPORT: "!",
  ADMIN_ANNOUNCEMENT: "i",
  REPAIR_UPDATE: "✓"
};

const tabs = [
  { key: "all", label: "Tất cả" },
  { key: "unread", label: "Chưa đọc" },
  { key: "read", label: "Đã đọc" }
];

const typeFilters = [
  { key: "all", label: "Tất cả loại" },
  { key: "DAMAGE_REPORT", label: "Phiếu báo hỏng" },
  { key: "ADMIN_ANNOUNCEMENT", label: "Admin" },
  { key: "REPAIR_UPDATE", label: "Sửa chữa" }
];

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString("vi-VN");
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);

  const [activeTab, setActiveTab] = useState("all");
  const [activeType, setActiveType] = useState("all");
<<<<<<< HEAD
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("created-desc");
=======
>>>>>>> 741e98d4b626de725b1b0468532cf241254b368a
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [counts, setCounts] = useState({ all: 0, unread: 0, read: 0 });
  const [adminForm, setAdminForm] = useState({ title: "", message: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadNotifications(nextTab = activeTab) {
    setIsLoading(true);
    setError("");

    try {
      const res = await api.get("/notifications", { params: { filter: nextTab } });
      setNotifications(res.data.notifications);
      setCounts(res.data.counts);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách thông báo");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications(activeTab);
  }, [activeTab]);

  async function markAsRead(notification) {
    if (notification.isRead) {
      return;
    }

    try {
      await api.patch(`/notifications/${notification.id}/read`);
      await loadNotifications(activeTab);
    } catch (err) {
      setError(err.response?.data?.message || "Không cập nhật được thông báo");
    }
  }

  async function markAllAsRead() {
    try {
      await api.patch("/notifications/mark-all-read");
      setMessage("Đã đánh dấu tất cả thông báo là đã đọc");
      await loadNotifications(activeTab);
    } catch (err) {
      setError(err.response?.data?.message || "Không đánh dấu được thông báo");
    }
  }

  async function createAdminNotification(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      await api.post("/notifications/admin", adminForm);
      setAdminForm({ title: "", message: "" });
      setMessage("Đã gửi thông báo từ admin");
      await loadNotifications(activeTab);
    } catch (err) {
      setError(err.response?.data?.message || "Không gửi được thông báo admin");
    }
  }

  function openNotification(notification) {
    markAsRead(notification);
    setSelectedNotification(notification);
  }

  function openRelatedReport() {
    setSelectedNotification(null);
    navigate("/reports");
  }

<<<<<<< HEAD
  const normalizedSearch = search.trim().toLowerCase();
  const filteredNotifications = useMemo(() => {
    const nextNotifications = notifications.filter((notification) => {
      const matchesType = activeType === "all" ? true : notification.type === activeType;
      const searchableText = [
        notification.title,
        notification.message,
        notification.type,
        typeLabels[notification.type],
        notification.createdAt?.slice(0, 10)
      ].join(" ").toLowerCase();

      return matchesType && searchableText.includes(normalizedSearch);
    });

    return [...nextNotifications].sort((a, b) => {
      switch (sortOption) {
        case "created-asc":
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case "title-asc":
          return a.title.localeCompare(b.title, "vi", { numeric: true });
        case "type-asc":
          return (typeLabels[a.type] || a.type).localeCompare(typeLabels[b.type] || b.type, "vi");
        default:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });
  }, [activeType, normalizedSearch, notifications, sortOption]);
=======
  const filteredNotifications = activeType === "all"
    ? notifications
    : notifications.filter((notification) => notification.type === activeType);
>>>>>>> 741e98d4b626de725b1b0468532cf241254b368a

  function countByType(type) {
    return type === "all"
      ? notifications.length
      : notifications.filter((notification) => notification.type === type).length;
  }

  return (
    <AppLayout
      active="notifications"
      title="Trung tâm thông báo"
      subtitle="Xem thông báo phiếu báo hỏng, cập nhật sửa chữa và thông báo từ admin."
      user={user}
    >
      <div className="notification-page">
        <div className="notification-tabs-row">
          <div className="notification-tabs" role="tablist" aria-label="Lọc thông báo">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeTab === tab.key ? "active" : ""}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {counts[tab.key] > 0 && <span>{counts[tab.key]}</span>}
              </button>
            ))}
          </div>

          <button type="button" className="mark-all-button" onClick={markAllAsRead}>
            ✓ Đánh dấu tất cả đã đọc
          </button>
        </div>

<<<<<<< HEAD
        <div className="admin-page-toolbar">
          <div className="admin-search-box">
            <span>⌕</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tiêu đề, nội dung thông báo..." />
          </div>
          <select className="sort-select" value={sortOption} onChange={(e) => setSortOption(e.target.value)} aria-label="Sắp xếp thông báo">
            <option value="created-desc">Mới nhất trước</option>
            <option value="created-asc">Cũ nhất trước</option>
            <option value="title-asc">Tiêu đề A-Z</option>
            <option value="type-asc">Loại A-Z</option>
          </select>
        </div>

=======
>>>>>>> 741e98d4b626de725b1b0468532cf241254b368a
        <div className="notification-filter-pills">
          {typeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={activeType === filter.key ? "active" : ""}
              onClick={() => setActiveType(filter.key)}
            >
              {filter.label}
              <strong>{countByType(filter.key)}</strong>
            </button>
          ))}
        </div>

        {user?.role === "ADMIN" && (
          <form className="admin-notification-form" onSubmit={createAdminNotification}>
            <h2>Gửi thông báo từ admin</h2>
            <input
              value={adminForm.title}
              onChange={(e) => setAdminForm((current) => ({ ...current, title: e.target.value }))}
              placeholder="Tiêu đề thông báo"
            />
            <textarea
              value={adminForm.message}
              onChange={(e) => setAdminForm((current) => ({ ...current, message: e.target.value }))}
              placeholder="Nội dung thông báo"
              rows="3"
            />
            <button type="submit">Gửi thông báo</button>
          </form>
        )}

        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}

        <section className="notification-list" aria-label="Danh sách thông báo">
          {isLoading ? (
            <p className="notification-empty">Đang tải thông báo...</p>
          ) : filteredNotifications.length === 0 ? (
            <p className="notification-empty">Chưa có thông báo phù hợp</p>
          ) : filteredNotifications.map((notification) => (
            <article
              key={notification.id}
              className={notification.isRead ? "notification-item is-read" : "notification-item is-unread"}
            >
              <div className="notification-icon">{typeIcons[notification.type] || "i"}</div>
              <button type="button" className="notification-content" onClick={() => openNotification(notification)}>
                <div className="notification-title-row">
                  <h2>{notification.title}</h2>
                  <span>{typeLabels[notification.type] || "Thông báo"}</span>
                </div>
                <p>{notification.message}</p>
                <small>› Xem chi tiết</small>
              </button>
              <time>{formatDate(notification.createdAt)}</time>
              {!notification.isRead && <i aria-label="Chưa đọc" />}
            </article>
          ))}
        </section>

        {selectedNotification && (
          <div className="notification-detail-backdrop" role="presentation" onClick={() => setSelectedNotification(null)}>
            <section
              className="notification-detail-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="notification-detail-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="notification-detail-header">
                <div className="notification-icon">{typeIcons[selectedNotification.type] || "i"}</div>
                <div>
                  <span>{typeLabels[selectedNotification.type] || "Thông báo"}</span>
                  <h2 id="notification-detail-title">{selectedNotification.title}</h2>
                  <time>{formatDate(selectedNotification.createdAt)}</time>
                </div>
                <button type="button" onClick={() => setSelectedNotification(null)} aria-label="Đóng chi tiết">×</button>
              </div>

              <div className="notification-detail-body">
                <p>{selectedNotification.message}</p>
              </div>

              <div className="notification-detail-actions">
                {selectedNotification.reportId && user?.role !== "REPORTER" && (
                  <button type="button" onClick={openRelatedReport}>Xem phiếu liên quan</button>
                )}
                <button type="button" className="secondary-button" onClick={() => setSelectedNotification(null)}>Đóng</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
