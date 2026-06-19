const express = require("express");
const bcrypt = require("bcrypt");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();
const validRoles = ["ADMIN", "TECHNICIAN", "REPORTER"];
const validStatuses = ["ACTIVE", "LOCKED"];

function selectUser() {
  return {
    id: true,
    fullName: true,
    username: true,
    role: true,
    status: true,
    failedLoginCount: true,
    lockedUntil: true,
    createdAt: true
  };
}

router.get("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const role = String(req.query.role || "").trim();

    const users = await prisma.user.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { username: { contains: search, mode: "insensitive" } }
              ]
            }
          : {}),
        ...(role && validRoles.includes(role) ? { role } : {})
      },
      select: selectUser(),
      orderBy: { id: "asc" }
    });

    return res.json(users);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "123456");
    const role = String(req.body.role || "REPORTER");
    const status = String(req.body.status || "ACTIVE");

    if (!fullName || !username || !password) {
      return res.status(400).json({ message: "Vui lòng nhập tên, username và mật khẩu" });
    }

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Vai trò không hợp lệ" });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        fullName,
        username,
        passwordHash,
        role,
        status,
        lockedUntil: status === "LOCKED" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null
      },
      select: selectUser()
    });

    return res.status(201).json(user);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Username đã tồn tại" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.put("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fullName = String(req.body.fullName || "").trim();
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "").trim();
    const role = String(req.body.role || "REPORTER");
    const status = String(req.body.status || "ACTIVE");

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    if (!fullName || !username) {
      return res.status(400).json({ message: "Vui lòng nhập tên và username" });
    }

    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Vai trò không hợp lệ" });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        fullName,
        username,
        role,
        status,
        failedLoginCount: status === "ACTIVE" ? 0 : undefined,
        lockedUntil: status === "LOCKED" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {})
      },
      select: selectUser()
    });

    return res.json(user);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Username đã tồn tại" });
    }

    if (error.code === "P2025") {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.patch("/:id/status", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body.status || "");

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        status,
        failedLoginCount: status === "ACTIVE" ? 0 : undefined,
        lockedUntil: status === "LOCKED" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null
      },
      select: selectUser()
    });

    return res.json(user);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;