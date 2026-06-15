const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

const validDeviceTypes = ["PROJECTOR", "TV", "AIR_CONDITIONER", "COMPUTER", "SPEAKER", "TABLE_CHAIR", "OTHER"];
const validDeviceStatuses = ["GOOD", "BROKEN", "REPAIRING"];

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

router.get("/", authenticate, authorize("ADMIN", "TECHNICIAN", "REPORTER"), async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const type = String(req.query.type || "").trim();
    const status = String(req.query.status || "").trim();
    const roomId = req.query.roomId ? Number(req.query.roomId) : null;

    const devices = await prisma.device.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } }
              ]
            }
          : {}),
        ...(type && validDeviceTypes.includes(type) ? { type } : {}),
        ...(status && validDeviceStatuses.includes(status) ? { status } : {}),
        ...(Number.isInteger(roomId) ? { roomId } : {})
      },
      include: {
        room: { select: { id: true, code: true, type: true } }
      },
      orderBy: { code: "asc" }
    });

    return res.json(devices);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.get("/:id/repair-logs", authenticate, authorize("ADMIN", "TECHNICIAN"), async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID thiết bị không hợp lệ" });
    }

    const device = await prisma.device.findUnique({
      where: { id },
      include: { room: { select: { id: true, code: true } } }
    });

    if (!device) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" });
    }

    const repairLogs = await prisma.repairLog.findMany({
      where: { deviceId: id },
      include: {
        technician: { select: { id: true, fullName: true, username: true, role: true } },
        report: { select: { id: true, description: true, status: true } }
      },
      orderBy: { repairedAt: "desc" }
    });

    return res.json({ device, repairLogs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.put("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const code = normalizeCode(req.body.code);
    const { name, type, status } = req.body;
    const roomId = req.body.roomId ? Number(req.body.roomId) : undefined;
    const importedAt = req.body.importedAt ? new Date(req.body.importedAt) : undefined;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID thiết bị không hợp lệ" });
    }

    if (!code || !name || !type || !status) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin thiết bị" });
    }

    if (!validDeviceTypes.includes(type)) {
      return res.status(400).json({ message: "Loại thiết bị không hợp lệ" });
    }

    if (!validDeviceStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái thiết bị không hợp lệ" });
    }

    if (roomId !== undefined && !Number.isInteger(roomId)) {
      return res.status(400).json({ message: "Phòng học không hợp lệ" });
    }

    if (importedAt && Number.isNaN(importedAt.getTime())) {
      return res.status(400).json({ message: "Ngày nhập không hợp lệ" });
    }

    const device = await prisma.device.update({
      where: { id },
      data: {
        code,
        name: name.trim(),
        type,
        status,
        ...(roomId !== undefined ? { roomId } : {}),
        ...(importedAt ? { importedAt } : {})
      },
      include: { room: { select: { id: true, code: true, type: true } } }
    });

    return res.json(device);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Mã thiết bị đã tồn tại" });
    }

    if (error.code === "P2025") {
      return res.status(404).json({ message: "Không tìm thấy thiết bị hoặc phòng học" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.patch("/:id/status", authenticate, authorize("ADMIN", "TECHNICIAN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID thiết bị không hợp lệ" });
    }

    if (!validDeviceStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái thiết bị không hợp lệ" });
    }

    const device = await prisma.device.update({
      where: { id },
      data: { status },
      include: { room: { select: { id: true, code: true, type: true } } }
    });

    return res.json(device);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.delete("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID thiết bị không hợp lệ" });
    }

    await prisma.device.delete({ where: { id } });

    return res.json({ message: "Xóa thiết bị thành công" });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" });
    }

    if (error.code === "P2003") {
      return res.status(409).json({ message: "Không thể xóa thiết bị đã có phiếu báo hỏng hoặc lịch sử sửa chữa" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;