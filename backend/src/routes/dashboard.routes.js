const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/stats", authenticate, authorize("ADMIN", "TECHNICIAN", "REPORTER"), async (req, res) => {
  try {
    const [totalRooms, brokenDevices, pendingReports, brokenGroups] = await Promise.all([
      prisma.room.count(),
      prisma.device.count({ where: { status: "BROKEN" } }),
      prisma.damageReport.count({ where: { status: "PENDING" } }),
      prisma.device.groupBy({
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
      brokenDevices,
      pendingReports,
      topBrokenRooms
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
