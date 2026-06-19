import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberAccount, setRememberAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await api.post("/auth/login", { username, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không kết nối được backend. Hãy kiểm tra backend đang chạy và CORS đúng port frontend."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="Đăng nhập hệ thống quản lý cơ sở vật chất">
        <aside className="login-brand-panel">
          <div className="login-logo" aria-label="Hệ thống quản lý cơ sở vật chất">
            <span>CSVC</span>
            <small>Quản lý thiết bị</small>
          </div>

          <div className="login-brand-copy">
            <h1>Hệ thống quản lý cơ sở vật chất</h1>
            <p>Quản lý phòng học, thiết bị, phiếu báo hỏng và lịch sử sửa chữa.</p>
          </div>

          <p className="login-brand-footer">Nhóm quản lý cơ sở vật chất</p>
        </aside>

        <form className="login-form-panel" onSubmit={handleLogin}>
          <div className="login-form-heading">
            <h2>Đăng nhập hệ thống</h2>
            <p className="login-welcome">Chào mừng bạn quay lại</p>
            <p className="login-helper">Đăng nhập bằng tài khoản được cấp trong hệ thống</p>
          </div>

          <label className="login-field" htmlFor="username">
            <span>Email / Mã đăng nhập</span>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Email hoặc mã đăng nhập..."
            />
          </label>

          <label className="login-field" htmlFor="password">
            <span>Mật khẩu</span>
            <div className="password-control">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="********"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </label>

          <label className="remember-row">
            <input
              type="checkbox"
              checked={rememberAccount}
              onChange={(e) => setRememberAccount(e.target.checked)}
            />
            <span>Lưu tài khoản</span>
          </label>

          {error && <p className="error-message login-error">{error}</p>}

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}
