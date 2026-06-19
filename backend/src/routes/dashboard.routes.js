const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/stats", authenticate, authorize("ADMIN", "TECHNICIAN", "REPORTER"), async (req, res) => {
  try {
<<<<<<< HEAD
    const [
      totalRooms,
      totalDevices,
      brokenDevices,
      pendingReports,
      deviceStatusGroups,
      deviceTypeGroups,
      reportStatusGroups,
      roomTypeGroups,
      roomStatusGroups,
      brokenGroups
    ] = await Promise.all([
      prisma.room.count(),
      prisma.device.count(),
      prisma.device.count({ where: { status: "BROKEN" } }),
      prisma.damageReport.count({ where: { status: "PENDING" } }),
      prisma.device.groupBy({
        by: ["status"],
        _count: { id: true }
      }),
      prisma.device.groupBy({
        by: ["type"],
        _count: { id: true }
      }),
      prisma.damageReport.groupBy({
        by: ["status"],
        _count: { id: true }
      }),
      prisma.room.groupBy({
        by: ["type"],
        _count: { id: true }
      }),
      prisma.room.groupBy({
        by: ["status"],
        _count: { id: true }
      }),
      prisma.device.groupBy({
=======
    const [totalRooms, brokenDevices, pendingReports, brokenGroups] = await Promise.all([
      prisma.room.count(),
      prisma.device.count({ where: { status: "BROKEN" } }),
      prisma.damageReport.count({ where: { status: "PENDING" } }),
      prisma.device.groupBy({
>>>>>>> 741e98d4b626de725b1b0468532cf241254b368a
        by: ["roomId"],
        where: { status: "BROKEN" },
        _count: { id: true }
      })
    ]);

    const roomIds = brokenGroups.map((item) => item.roomId);
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds } },
      select: { id: true, code: true, type: true }
    });

    const topBrokenRooms = brokenGroups
      .map((item) => {
        const room = rooms.find((currentRoom) => currentRoom.id === item.roomId);
        return {
          roomId: item.roomId,
          roomCode: room?.code || "Không rõ",
          roomType: room?.type || "OTHER",
          brokenCount: item._count.id
        };
      })
      .sort((a, b) => b.brokenCount - a.brokenCount)
      .slice(0, 5);

    return res.json({
      totalRooms,
<<<<<<< HEAD
      totalDevices,
      brokenDevices,
      pendingReports,
      deviceStatusSummary: deviceStatusGroups.map((item) => ({
        status: item.status,
        count: item._count.id
      })),
      deviceTypeSummary: deviceTypeGroups.map((item) => ({
        type: item.type,
        count: item._count.id
      })),
      reportStatusSummary: reportStatusGroups.map((item) => ({
        status: item.status,
        count: item._count.id
      })),
      roomTypeSummary: roomTypeGroups.map((item) => ({
        type: item.type,
        count: item._count.id
      })),
      roomStatusSummary: roomStatusGroups.map((item) => ({
        status: item.status,
        count: item._count.id
      })),
=======
      brokenDevices,
      pendingReports,
>>>>>>> 741e98d4b626de725b1b0468532cf241254b368a
      topBrokenRooms
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
