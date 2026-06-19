const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();
const validDeviceStatuses = ["GOOD", "BROKEN", "REPAIRING"];

function buildCompletedMessage(report) {
  const deviceNames = report.devices
    .map((item) => item.device?.name)
    .filter(Boolean)
    .join(", ");

  return deviceNames
    ? `Phiếu báo hỏng tại phòng ${report.room.code} đã được sửa hoàn tất. Thiết bị đã hoạt động tốt: ${deviceNames}.`
    : `Phiếu báo hỏng tại phòng ${report.room.code} đã được sửa hoàn tất.`;
}

async function createCompletedNotification(tx, report, actorId) {
  if (!report.reporterId) {
    return;
  }

  await tx.notification.create({
    data: {
      type: "REPAIR_UPDATE",
      title: `Hoàn thành phiếu báo hỏng #${report.id}`,
      message: buildCompletedMessage(report),
      recipientId: report.reporterId,
      actorId,
      reportId: report.id
    }
  });
}

router.post("/", authenticate, authorize("ADMIN", "TECHNICIAN"), async (req, res) => {
  try {
    const deviceId = Number(req.body.deviceId);
    const reportId = req.body.reportId ? Number(req.body.reportId) : null;
    const completeReport = Boolean(req.body.completeReport);
    const quantity = Number(req.body.quantity || 1);
    const repairedAt = req.body.repairedAt ? new Date(req.body.repairedAt) : new Date();
    const content = String(req.body.content || "").trim();
    const { afterStatus } = req.body;

    if (!completeReport && !Number.isInteger(deviceId)) {
      return res.status(400).json({ message: "Vui lòng chọn thiết bị cần ghi nhận sửa chữa" });
    }

    if (reportId !== null && !Number.isInteger(reportId)) {
      return res.status(400).json({ message: "ID phiếu báo hỏng không hợp lệ" });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: "Số lượng sửa chữa phải là số nguyên lớn hơn 0" });
    }

    if (Number.isNaN(repairedAt.getTime())) {
      return res.status(400).json({ message: "Ngày sửa chữa không hợp lệ" });
    }

    if (!content) {
      return res.status(400).json({ message: "Vui lòng nhập nội dung sửa chữa" });
    }

    if (!validDeviceStatuses.includes(afterStatus)) {
      return res.status(400).json({ message: "Trạng thái sau sửa không hợp lệ" });
    }

    if (completeReport && reportId === null) {
      return res.status(400).json({ message: "Vui lòng chọn phiếu báo hỏng cần hoàn thành" });
    }

    if (completeReport && afterStatus !== "GOOD") {
      return res.status(400).json({ message: "Hoàn thành phiếu yêu cầu trạng thái sau sửa là Tốt" });
    }

    const device = completeReport ? null : await prisma.device.findUnique({ where: { id: deviceId } });

    if (!completeReport && !device) {
      return res.status(404).json({ message: "Không tìm thấy thiết bị" });
    }

    if (!completeReport && reportId !== null) {
      const reportDevice = await prisma.damageReportDevice.findUnique({
        where: {
          reportId_deviceId: {
            reportId,
            deviceId
          }
        }
      });

      if (!reportDevice) {
        return res.status(400).json({ message: "Thiết bị không thuộc phiếu báo hỏng đã chọn" });
      }
    }

    const repairLog = await prisma.$transaction(async (tx) => {
      if (completeReport) {
        const report = await tx.damageReport.findUnique({
          where: { id: reportId },
          include: {
            room: { select: { id: true, code: true } },
            devices: {
              include: {
                device: { select: { id: true, name: true } }
              }
            }
          }
        });

        if (!report) {
          throw Object.assign(new Error("REPORT_NOT_FOUND"), { statusCode: 404 });
        }

        const deviceIds = report.devices.map((item) => item.device.id);

        if (deviceIds.length === 0) {
          throw Object.assign(new Error("REPORT_HAS_NO_DEVICES"), { statusCode: 400 });
        }

        await tx.repairLog.createMany({
          data: deviceIds.map((currentDeviceId) => ({
            deviceId: currentDeviceId,
            reportId,
            technicianId: req.user.id,
            quantity,
            repairedAt,
            content,
            afterStatus
          }))
        });

        await tx.device.updateMany({
          where: { id: { in: deviceIds } },
          data: { status: "GOOD" }
        });

        await tx.damageReport.update({
          where: { id: reportId },
          data: { status: "COMPLETED" }
        });

        if (report.status !== "COMPLETED") {
          await createCompletedNotification(tx, report, req.user.id);
        }

        return tx.repairLog.findMany({
          where: { reportId, deviceId: { in: deviceIds } },
          orderBy: { id: "desc" },
          take: deviceIds.length,
          include: {
            device: { include: { room: { select: { id: true, code: true } } } },
            report: true,
            technician: { select: { id: true, fullName: true, username: true, role: true } }
          }
        });
      }

      const createdLog = await tx.repairLog.create({
        data: {
          deviceId,
          reportId,
          technicianId: req.user.id,
          quantity,
          repairedAt,
          content,
          afterStatus
        },
        include: {
          device: { include: { room: { select: { id: true, code: true } } } },
          report: true,
          technician: { select: { id: true, fullName: true, username: true, role: true } }
        }
      });

      await tx.device.update({
        where: { id: deviceId },
        data: { status: afterStatus }
      });

      if (reportId !== null) {
        const report = await tx.damageReport.findUnique({
          where: { id: reportId },
          include: {
            room: { select: { id: true, code: true } },
            devices: {
              include: {
                device: { select: { id: true, name: true, status: true } }
              }
            }
          }
        });

        if (!report) {
          throw Object.assign(new Error("REPORT_NOT_FOUND"), { statusCode: 404 });
        }

        const allDevicesGood = report.devices.every((item) =>
          item.deviceId === deviceId ? afterStatus === "GOOD" : item.device.status === "GOOD"
        );
        const nextReportStatus = allDevicesGood ? "COMPLETED" : "IN_PROGRESS";

        await tx.damageReport.update({
          where: { id: reportId },
          data: { status: nextReportStatus }
        });

        if (nextReportStatus === "COMPLETED" && report.status !== "COMPLETED") {
          await createCompletedNotification(tx, report, req.user.id);
        }
      }

      return createdLog;
    });

    return res.status(201).json(repairLog);
  } catch (error) {
    if (error.statusCode === 404 && error.message === "REPORT_NOT_FOUND") {
      return res.status(404).json({ message: "Không tìm thấy phiếu báo hỏng" });
    }

    if (error.statusCode === 400 && error.message === "REPORT_HAS_NO_DEVICES") {
      return res.status(400).json({ message: "Phiếu báo hỏng chưa có thiết bị" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
