import { useEffect, useMemo, useState } from "react";
import api from "../api";
import AppLayout from "../components/AppLayout";

export default function ReportCreatePage() {
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);

  const [rooms, setRooms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadRooms() {
    try {
      const res = await api.get("/rooms");
      setRooms(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách phòng học");
    }
  }

  async function loadDevices(nextRoomId) {
    setDevices([]);
    setSelectedDeviceIds([]);

    if (!nextRoomId) {
      return;
    }

    try {
      const res = await api.get(`/rooms/${nextRoomId}/devices`);
      setDevices(res.data.devices);
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được danh sách thiết bị");
    }
  }

  function toggleDevice(deviceId) {
    setSelectedDeviceIds((current) =>
      current.includes(deviceId)
        ? current.filter((id) => id !== deviceId)
        : [...current, deviceId]
    );
  }

  useEffect(() => {
    loadRooms();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      await api.post("/reports", {
        roomId: Number(roomId),
        deviceIds: selectedDeviceIds,
        description
      });

      setMessage("Gửi phiếu báo hỏng thành công");
      setDescription("");
      setSelectedDeviceIds([]);
    } catch (err) {
      setError(err.response?.data?.message || "Không gửi được phiếu báo hỏng");
    }
  }

  return (
    <AppLayout
      active="report-new"
      title="Báo cáo sự cố thiết bị"
      subtitle={`${user?.fullName || user?.username || "Người dùng"} - ${user?.role || ""}`}
      user={user}
    >
      <form className="room-form report-form" onSubmit={handleSubmit}>
        <h2>Thông tin báo hỏng</h2>

        <label>
          Chọn phòng học
          <select value={roomId} onChange={(e) => { setRoomId(e.target.value); loadDevices(e.target.value); }}>
            <option value="">-- Chọn phòng --</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>{room.code}</option>
            ))}
          </select>
        </label>

        <section className="wide-field device-picker" aria-labelledby="device-picker-title">
          <div className="device-picker-header">
            <h3 id="device-picker-title">Chọn thiết bị</h3>
            <span>{selectedDeviceIds.length} đã chọn</span>
          </div>

          {!roomId ? (
            <p className="device-picker-empty">Chọn phòng học trước để xem danh sách thiết bị.</p>
          ) : devices.length === 0 ? (
            <p className="device-picker-empty">Phòng này chưa có thiết bị.</p>
          ) : (
            <div className="device-checkbox-grid">
              {devices.map((device) => (
                <label key={device.id} className="device-checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedDeviceIds.includes(device.id)}
                    onChange={() => toggleDevice(device.id)}
                  />
                  <span>
                    <strong>{device.code}</strong>
                    {device.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        <label className="wide-field">
          Mô tả sự cố
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ví dụ: Máy chiếu không lên hình khi bắt đầu tiết học."
            rows="4"
          />
        </label>

        <div className="form-actions">
          <button type="submit">Gửi yêu cầu báo hỏng</button>
        </div>
      </form>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
    </AppLayout>
  );
}
