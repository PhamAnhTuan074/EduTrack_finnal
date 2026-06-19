const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();
const validReportStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED"];

const reportStatusLabels = {
  PENDING: "Chờ xử lý",
  IN_PROGRESS: "Đang sửa",
  COMPLETED: "Hoàn thành"
};

function normalizeDeviceIds(body) {
  if (Array.isArray(body.deviceIds)) {
    return [...new Set(body.deviceIds.map(Number).filter(Number.isInteger))];
  }

  if (body.deviceId) {
    const deviceId = Number(body.deviceId);
    return Number.isInteger(deviceId) ? [deviceId] : [];
  }

  return [];
}

async function createReportNotifications(tx, report, actorId) {
  const recipients = await tx.user.findMany({
    where: { role: { in: ["ADMIN", "TECHNICIAN"] } },
    select: { id: true }
  });

  if (recipients.length === 0) {
    return;
  }

  const deviceNames = report.devices.map((item) => item.device.name).join(", ");

  await tx.notification.createMany({
    data: recipients.map((recipient) => ({
      type: "DAMAGE_REPORT",
      title: `Phiếu báo hỏng mới #${report.id}`,
      message: `${report.reporter.fullName} báo hỏng tại phòng ${report.room.code}: ${deviceNames}.`,
      recipientId: recipient.id,
      actorId,
      reportId: report.id
    }))
  });
}

async function createStatusNotification(report, actorId, status) {
  await prisma.notification.create({
    data: {
      type: "REPAIR_UPDATE",
      title: `Cập nhật phiếu báo hỏng #${report.id}`,
      message: `Phiếu báo hỏng tại phòng ${report.room.code} đã chuyển sang trạng thái: ${reportStatusLabels[status]}.`,
      recipientId: report.reporter.id,
      actorId,
      reportId: report.id
    }
  });
}

router.post("/", authenticate, async (req, res) => {
  try {
    const roomId = Number(req.body.roomId);
    const deviceIds = normalizeDeviceIds(req.body);
    const description = String(req.body.description || "").trim();

    if (!Number.isInteger(roomId)) {
      return res.status(400).json({ message: "Vui lòng chọn phòng học" });
    }

    if (deviceIds.length === 0) {
      return res.status(400).json({ message: "Vui lòng chọn thiết bị bị hỏng" });
    }

    if (!description) {
      return res.status(400).json({ message: "Vui lòng nhập mô tả sự cố" });
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });

    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng học" });
    }

    const devices = await prisma.device.findMany({
      where: {
        id: { in: deviceIds },
        roomId
      }
    });

    if (devices.length !== deviceIds.length) {
      return res.status(400).json({ message: "Thiết bị không thuộc phòng đã chọn" });
    }

    const report = await prisma.$transaction(async (tx) => {
      const createdReport = await tx.damageReport.create({
        data: {
          reporterId: req.user.id,
          roomId,
          description,
          devices: {
            create: deviceIds.map((deviceId) => ({ deviceId }))
          }
        },
        include: {
          reporter: { select: { id: true, fullName: true, username: true, role: true } },
          room: { select: { id: true, code: true } },
          devices: {
            include: {
              device: { select: { id: true, code: true, name: true, status: true } }
            }
          }
        }
      });

      await tx.device.updateMany({
        where: { id: { in: deviceIds } },
        data: { status: "BROKEN" }
      });

      await createReportNotifications(tx, createdReport, req.user.id);

      return createdReport;
    });

    return res.status(201).json(report);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.get("/", authenticate, authorize("ADMIN", "TECHNICIAN"), async (req, res) => {
  try {
    const reports = await prisma.damageReport.findMany({
      include: {
        reporter: { select: { id: true, fullName: true, username: true, role: true } },
        room: { select: { id: true, code: true } },
        devices: {
          include: {
            device: { select: { id: true, code: true, name: true, status: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(reports);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.patch("/:id/status", authenticate, authorize("ADMIN", "TECHNICIAN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID phiếu báo hỏng không hợp lệ" });
    }

    if (!validReportStatuses.includes(status)) {
      return res.status(400).json({ message: "Trạng thái phiếu không hợp lệ" });
    }

    const report = await prisma.damageReport.update({
      where: { id },
      data: { status },
      include: {
        reporter: { select: { id: true, fullName: true, username: true, role: true } },
        room: { select: { id: true, code: true } },
        devices: {
          include: {
            device: { select: { id: true, code: true, name: true, status: true } }
          }
        }
      }
    });

    await createStatusNotification(report, req.user.id, status);

    return res.json(report);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Không tìm thấy phiếu báo hỏng" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
