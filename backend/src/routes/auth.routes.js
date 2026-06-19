const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();
const MAX_FAILED_LOGIN = 5;
const LOCK_MINUTES = 15;

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Vui lòng nhập tên đăng nhập và mật khẩu" });
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }

    const now = new Date();

    if (user.status === "LOCKED" && user.lockedUntil && user.lockedUntil > now) {
      return res.status(403).json({ message: "Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau." });
    }

    if (user.status === "LOCKED" && user.lockedUntil && user.lockedUntil <= now) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          status: "ACTIVE",
          failedLoginCount: 0,
          lockedUntil: null
        }
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      const failedLoginCount = user.failedLoginCount + 1;
      const shouldLock = failedLoginCount >= MAX_FAILED_LOGIN;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount,
          status: shouldLock ? "LOCKED" : "ACTIVE",
          lockedUntil: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null
        }
      });

      if (shouldLock) {
        return res.status(403).json({ message: "Tài khoản đã bị khóa 15 phút do nhập sai mật khẩu 5 lần" });
      }

      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        status: "ACTIVE",
        lockedUntil: null
      }
    });

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    return res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        fullName: true,
        username: true,
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    return res.json(user);
  } catch {
    return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
});

module.exports = router;