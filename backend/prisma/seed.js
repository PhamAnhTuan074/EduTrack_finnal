const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  await prisma.notification.deleteMany();
  await prisma.repairLog.deleteMany();
  await prisma.damageReportDevice.deleteMany();
  await prisma.damageReport.deleteMany();
  await prisma.device.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.create({
    data: {
      fullName: "Quản trị viên CSVC",
      username: "admin",
      passwordHash,
      role: "ADMIN"
    }
  });

  const technician = await prisma.user.create({
    data: {
      fullName: "Nguyễn Văn Nam",
      username: "tech",
      passwordHash,
      role: "TECHNICIAN"
    }
  });

  const reporter = await prisma.user.create({
    data: {
      fullName: "Lê Minh Tuấn",
      username: "reporter",
      passwordHash,
      role: "REPORTER"
    }
  });

  const p101 = await prisma.room.create({ data: { code: "P101", type: "THEORY", capacity: 60, status: "ACTIVE" } });
  const p102 = await prisma.room.create({ data: { code: "P102", type: "THEORY", capacity: 50, status: "MAINTENANCE" } });
  const lab01 = await prisma.room.create({ data: { code: "LAB01", type: "COMPUTER_LAB", capacity: 35, status: "ACTIVE" } });
  const p201 = await prisma.room.create({ data: { code: "P201", type: "THEORY", capacity: 70, status: "ACTIVE" } });
  const p202 = await prisma.room.create({ data: { code: "P202", type: "THEORY", capacity: 55, status: "ACTIVE" } });
  const lab02 = await prisma.room.create({ data: { code: "LAB02", type: "COMPUTER_LAB", capacity: 40, status: "ACTIVE" } });
  const labChem = await prisma.room.create({ data: { code: "LAB-HOA", type: "LAB", capacity: 30, status: "MAINTENANCE" } });
  const labPhysics = await prisma.room.create({ data: { code: "LAB-LY", type: "LAB", capacity: 32, status: "ACTIVE" } });

  const projector = await prisma.device.create({
    data: { code: "MC-P101-01", name: "Máy chiếu P101", type: "PROJECTOR", status: "BROKEN", roomId: p101.id }
  });

  const tv = await prisma.device.create({
    data: { code: "TV-P101-01", name: "Tivi P101", type: "TV", status: "BROKEN", roomId: p101.id }
  });

  const airConditioner = await prisma.device.create({
    data: { code: "AC-P102-01", name: "Điều hòa P102", type: "AIR_CONDITIONER", status: "REPAIRING", roomId: p102.id }
  });

  const teacherComputer = await prisma.device.create({
    data: { code: "PC-LAB01-01", name: "Máy tính giảng viên LAB01", type: "COMPUTER", status: "GOOD", roomId: lab01.id }
  });

  const speaker = await prisma.device.create({
    data: { code: "SP-LAB01-01", name: "Loa phòng LAB01", type: "SPEAKER", status: "BROKEN", roomId: lab01.id }
  });

  await prisma.device.createMany({
    data: [
      { code: "MC-P201-01", name: "Máy chiếu Epson EB-X51 P201", type: "PROJECTOR", status: "GOOD", roomId: p201.id, importedAt: new Date("2026-01-05") },
      { code: "TV-P201-01", name: "Tivi Samsung 55 inch P201", type: "TV", status: "GOOD", roomId: p201.id, importedAt: new Date("2026-01-05") },
      { code: "AC-P201-01", name: "Điều hòa Daikin P201", type: "AIR_CONDITIONER", status: "BROKEN", roomId: p201.id, importedAt: new Date("2026-01-08") },
      { code: "SP-P201-01", name: "Loa treo tường P201", type: "SPEAKER", status: "GOOD", roomId: p201.id, importedAt: new Date("2026-01-08") },
      { code: "BC-P201-01", name: "Bộ bàn ghế giảng viên P201", type: "TABLE_CHAIR", status: "GOOD", roomId: p201.id, importedAt: new Date("2026-01-10") },

      { code: "MC-P202-01", name: "Máy chiếu Panasonic P202", type: "PROJECTOR", status: "REPAIRING", roomId: p202.id, importedAt: new Date("2026-02-02") },
      { code: "TV-P202-01", name: "Tivi LG 50 inch P202", type: "TV", status: "GOOD", roomId: p202.id, importedAt: new Date("2026-02-02") },
      { code: "AC-P202-01", name: "Điều hòa Casper P202", type: "AIR_CONDITIONER", status: "GOOD", roomId: p202.id, importedAt: new Date("2026-02-04") },
      { code: "SP-P202-01", name: "Loa bluetooth trợ giảng P202", type: "SPEAKER", status: "BROKEN", roomId: p202.id, importedAt: new Date("2026-02-04") },

      { code: "PC-LAB02-01", name: "Máy tính giảng viên LAB02", type: "COMPUTER", status: "GOOD", roomId: lab02.id, importedAt: new Date("2026-03-01") },
      { code: "PC-LAB02-02", name: "Máy tính sinh viên LAB02-02", type: "COMPUTER", status: "GOOD", roomId: lab02.id, importedAt: new Date("2026-03-01") },
      { code: "PC-LAB02-03", name: "Máy tính sinh viên LAB02-03", type: "COMPUTER", status: "BROKEN", roomId: lab02.id, importedAt: new Date("2026-03-01") },
      { code: "MC-LAB02-01", name: "Máy chiếu phòng LAB02", type: "PROJECTOR", status: "GOOD", roomId: lab02.id, importedAt: new Date("2026-03-03") },
      { code: "SW-LAB02-01", name: "Switch mạng LAB02", type: "OTHER", status: "REPAIRING", roomId: lab02.id, importedAt: new Date("2026-03-05") },

      { code: "TB-HOA-01", name: "Bộ dụng cụ thí nghiệm hóa cơ bản", type: "OTHER", status: "GOOD", roomId: labChem.id, importedAt: new Date("2026-04-01") },
      { code: "HT-HOA-01", name: "Hệ thống hút khí LAB-HOA", type: "OTHER", status: "BROKEN", roomId: labChem.id, importedAt: new Date("2026-04-02") },
      { code: "BC-HOA-01", name: "Bàn thí nghiệm LAB-HOA", type: "TABLE_CHAIR", status: "GOOD", roomId: labChem.id, importedAt: new Date("2026-04-02") },

      { code: "TB-LY-01", name: "Bộ thí nghiệm điện học LAB-LY", type: "OTHER", status: "GOOD", roomId: labPhysics.id, importedAt: new Date("2026-05-01") },
      { code: "MC-LY-01", name: "Máy chiếu phòng LAB-LY", type: "PROJECTOR", status: "GOOD", roomId: labPhysics.id, importedAt: new Date("2026-05-03") },
      { code: "AC-LY-01", name: "Điều hòa LAB-LY", type: "AIR_CONDITIONER", status: "GOOD", roomId: labPhysics.id, importedAt: new Date("2026-05-03") }
    ]
  });

  const reportProjector = await prisma.damageReport.create({
    data: {
      reporterId: reporter.id,
      roomId: p101.id,
      description: "Máy chiếu không lên hình khi bắt đầu tiết học.",
      status: "PENDING",
      devices: { create: [{ deviceId: projector.id }] }
    }
  });

  const reportAc = await prisma.damageReport.create({
    data: {
      reporterId: reporter.id,
      roomId: p102.id,
      description: "Điều hòa phát tiếng ồn lớn và làm mát yếu.",
      status: "IN_PROGRESS",
      devices: { create: [{ deviceId: airConditioner.id }] }
    }
  });

  const reportSpeaker = await prisma.damageReport.create({
    data: {
      reporterId: reporter.id,
      roomId: lab01.id,
      description: "Loa bị rè khi mở âm lượng lớn.",
      status: "COMPLETED",
      devices: { create: [{ deviceId: speaker.id }] }
    }
  });

  await prisma.repairLog.createMany({
    data: [
      {
        deviceId: airConditioner.id,
        reportId: reportAc.id,
        technicianId: technician.id,
        quantity: 1,
        repairedAt: new Date("2026-06-10"),
        content: "Vệ sinh lưới lọc, kiểm tra gas lạnh, thiết bị cần theo dõi thêm.",
        afterStatus: "REPAIRING"
      },
      {
        deviceId: speaker.id,
        reportId: reportSpeaker.id,
        technicianId: technician.id,
        quantity: 1,
        repairedAt: new Date("2026-06-11"),
        content: "Thay dây tín hiệu âm thanh và kiểm tra lại cổng kết nối.",
        afterStatus: "GOOD"
      },
      {
        deviceId: teacherComputer.id,
        reportId: null,
        technicianId: technician.id,
        quantity: 1,
        repairedAt: new Date("2026-06-12"),
        content: "Cài lại driver máy chiếu và cập nhật phần mềm trình chiếu.",
        afterStatus: "GOOD"
      }
    ]
  });

  await prisma.device.update({ where: { id: speaker.id }, data: { status: "GOOD" } });
  await prisma.notification.createMany({
    data: [
      {
        type: "DAMAGE_REPORT",
        title: `Phiếu báo hỏng mới #${reportProjector.id}`,
        message: `Lê Minh Tuấn báo hỏng tại phòng ${p101.code}: Máy chiếu P101.`,
        recipientId: admin.id,
        actorId: reporter.id,
        reportId: reportProjector.id,
        isRead: false
      },
      {
        type: "DAMAGE_REPORT",
        title: `Phiếu báo hỏng đang xử lý #${reportAc.id}`,
        message: `Phiếu điều hòa tại phòng ${p102.code} đang được kỹ thuật viên xử lý.`,
        recipientId: admin.id,
        actorId: technician.id,
        reportId: reportAc.id,
        isRead: false
      },
      {
        type: "REPAIR_UPDATE",
        title: `Phiếu báo hỏng đã hoàn thành #${reportSpeaker.id}`,
        message: `Loa phòng ${lab01.code} đã được sửa và chuyển về trạng thái tốt.`,
        recipientId: reporter.id,
        actorId: technician.id,
        reportId: reportSpeaker.id,
        isRead: true
      },
      {
        type: "ADMIN_ANNOUNCEMENT",
        title: "Thông báo kiểm tra thiết bị cuối tuần",
        message: "Admin yêu cầu rà soát máy chiếu, TV và điều hòa tại các phòng học trước buổi học đầu tuần.",
        recipientId: technician.id,
        actorId: admin.id,
        isRead: false
      }
    ]
  });

  console.log(`Seed completed: admin=${admin.username}, tech=${technician.username}, reporter=${reporter.username}`);
  console.log(`Demo rooms: ${p101.code}, ${p102.code}, ${lab01.code}, ${p201.code}, ${p202.code}, ${lab02.code}, ${labChem.code}, ${labPhysics.code}`);
  console.log(`Demo devices include: ${projector.code}, ${tv.code}, ${airConditioner.code}, ${teacherComputer.code}, MC-P201-01, PC-LAB02-03, HT-HOA-01`);
}

main()
  .then(() => console.log("Seed completed"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
