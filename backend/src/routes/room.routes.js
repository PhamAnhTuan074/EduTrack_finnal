const express = require("express");
const prisma = require("../prisma");
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const router = express.Router();

const validRoomTypes = ["THEORY", "COMPUTER_LAB", "LAB"];
const validRoomStatuses = ["ACTIVE", "MAINTENANCE"];

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function validateRoomInput({code, type, status, capacity}){
  if (!code || !type || !capacity) {
      return "Vui lòng nhập đầy đủ thông tin phòng học";
  }

  if (!validRoomTypes.includes(type)) {
    return "Loại phòng học không hợp lệ";
  }

  if (status && !validRoomStatuses.includes(status)) {
    return "Trạng thái phòng học không hợp lệ";
  }

  if (!Number.isInteger(capacity) || capacity <= 0) {
    return "Sức chứa phải là số nguyên lớn hơn 0";
  }

  return null;
}

router.get("/", authenticate, authorize("ADMIN", "TECHNICIAN", "REPORTER"), async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    const rooms = await prisma.room.findMany({
      where: search
        ? { code: { contains: search, mode: "insensitive" } }
        : undefined,
      include: {
        _count: {
          select: { devices: true }
        }
      },
      orderBy: { code: "asc" }
    });

    return res.json(rooms);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const code = normalizeCode(req.body.code);
    const { type, status } = req.body;
    const capacity = Number(req.body.capacity);
    const validateError = validateRoomInput({code, type, status, capacity});


    if (validateError){
      return res.status(400).json({message: validateError});
    }
    // if (!code || !type || !capacity) {
    //   return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin phòng học" });
    // }

    // if (!validRoomTypes.includes(type)) {
    //   return res.status(400).json({ message: "Loại phòng học không hợp lệ" });
    // }

    // if (status && !validRoomStatuses.includes(status)) {
    //   return res.status(400).json({ message: "Trạng thái phòng học không hợp lệ" });
    // }

    // if (!Number.isInteger(capacity) || capacity <= 0) {
    //   return res.status(400).json({ message: "Sức chứa phải là số nguyên lớn hơn 0" });
    // }

    const room = await prisma.room.create({
      data: {
        code,
        type,
        capacity,
        status: status || "ACTIVE"
      }
    });

    return res.status(201).json(room);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Mã phòng đã tồn tại" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.put("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const code = normalizeCode(req.body.code);
    const { type, status } = req.body;
    const capacity = Number(req.body.capacity);
    const validateError = validateRoomInput({code, type, status, capacity});

    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: "ID phòng học không hợp lệ" });
    }

    // if (!code || !type || !capacity) {
    //   return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin phòng học" });
    // }

    // if (!validRoomTypes.includes(type)) {
    //   return res.status(400).json({ message: "Loại phòng học không hợp lệ" });
    // }

    // if (status && !validRoomStatuses.includes(status)) {
    //   return res.status(400).json({ message: "Trạng thái phòng học không hợp lệ" });
    // }

    // if (!Number.isInteger(capacity) || capacity <= 0) {
    //   return res.status(400).json({ message: "Sức chứa phải là số nguyên lớn hơn 0" });
    // }

    if (validateError){
      return res.status(400).json({message: validateError});
    }

    const room = await prisma.room.update({
      where: { id },
      data: {
        code,
        type,
        capacity,
        status
      }
    });

    return res.json(room);

  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Mã phòng đã tồn tại" });
    }

    if (error.code === "P2025") {
      return res.status(404).json({ message: "Không tìm thấy phòng học" });
    }

    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

router.delete("/:id", authenticate, authorize("ADMIN"), async(req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)){
      return res.status(400).json({message: "ID phòng không hợp lệ"});
    }

    const deviceCount = await prisma.device.count({where: {roomId: id}});

    if (deviceCount > 0){
      return res.status(400).json({message: "Không thể xoá phòng đang chứa thiết bị"});
    } 

    await prisma.room.delete({ where: { id } });
    
    return res.json({message: "Xoá phòng học thành công"});
  } catch(error) {
    if (error.code === "P2025"){
      return res.status(404).json({message: "Không tìm thấy phòng học"});
    }

    console.error(error);
    return res.status(500).json({message: "Lỗi server"});
  }
});

// router.delete("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
//   try {
//     const id = Number(req.params.id);

//     if (!Number.isInteger(id)) {
//       return res.status(400).json({ message: "ID phòng học không hợp lệ" });
//     }

//     const deviceCount = await prisma.device.count({ where: { roomId: id } });

//     if (deviceCount > 0) {
//       return res.status(409).json({ message: "Không thể xóa phòng học đang chứa thiết bị" });
//     }

//     await prisma.room.delete({ where: { id } });

//     return res.json({ message: "Xóa phòng học thành công" });

//   } catch (error) {
//     if (error.code === "P2025") {
//       return res.status(404).json({ message: "Không tìm thấy phòng học" });
//     }

//     console.error(error);
//     return res.status(500).json({ message: "Lỗi server" });
//   }
// });

module.exports = router;