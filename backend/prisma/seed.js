require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

// Prisma yêu cầu mã enum nội bộ; dữ liệu seed bên dưới dùng nhãn tiếng Việt có dấu.
const vaiTro = {
  "Quản trị viên": "ADMIN",
  "Kỹ thuật viên": "TECHNICIAN",
  "Người báo hỏng": "REPORTER"
};

const trangThaiNguoiDung = {
  "Hoạt động": "ACTIVE",
  "Đã khóa": "LOCKED"
};

const loaiPhong = {
  "Phòng lý thuyết": "THEORY",
  "Phòng máy tính": "COMPUTER_LAB",
  "Phòng thực hành": "LAB"
};

const trangThaiPhong = {
  "Đang sử dụng": "ACTIVE",
  "Đang bảo trì": "MAINTENANCE"
};

const loaiThietBi = {
  "Máy chiếu": "PROJECTOR",
  "Tivi": "TV",
  "Điều hòa": "AIR_CONDITIONER",
  "Máy tính": "COMPUTER",
  "Loa": "SPEAKER",
  "Bàn ghế": "TABLE_CHAIR",
  "Thiết bị khác": "OTHER"
};

const trangThaiThietBi = {
  "Tốt": "GOOD",
  "Hỏng": "BROKEN",
  "Đang sửa chữa": "REPAIRING"
};

const trangThaiPhieu = {
  "Chờ xử lý": "PENDING",
  "Đang xử lý": "IN_PROGRESS",
  "Hoàn thành": "COMPLETED"
};

const loaiThongBao = {
  "Phiếu báo hỏng": "DAMAGE_REPORT",
  "Thông báo quản trị": "ADMIN_ANNOUNCEMENT",
  "Cập nhật sửa chữa": "REPAIR_UPDATE"
};

function at(value) {
  return new Date(value.includes("T") ? value : `${value}T08:00:00+07:00`);
}

function indexBy(items, key) {
  return Object.fromEntries(items.map((item) => [item[key], item]));
}

async function clearData() {
  await prisma.notification.deleteMany();
  await prisma.repairLog.deleteMany();
  await prisma.damageReportDevice.deleteMany();
  await prisma.damageReport.deleteMany();
  await prisma.device.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
}

function buildDeviceRows() {
  const rows = [];
  const statusOverrides = {
    "MC-P101-01": trangThaiThietBi["Hỏng"],
    "AC-P102-01": trangThaiThietBi["Đang sửa chữa"],
    "SP-P102-01": trangThaiThietBi["Hỏng"],
    "AC-P201-01": trangThaiThietBi["Hỏng"],
    "MC-P202-01": trangThaiThietBi["Đang sửa chữa"],
    "TV-P204-01": trangThaiThietBi["Hỏng"],
    "SP-P204-01": trangThaiThietBi["Hỏng"],
    "AC-P301-01": trangThaiThietBi["Đang sửa chữa"],
    "SP-P302-01": trangThaiThietBi["Hỏng"],
    "PC-LAB01-07": trangThaiThietBi["Hỏng"],
    "PC-LAB02-03": trangThaiThietBi["Hỏng"],
    "SW-LAB02-01": trangThaiThietBi["Đang sửa chữa"],
    "PC-LAB-MANG-05": trangThaiThietBi["Đang sửa chữa"],
    "SW-LAB-MANG-01": trangThaiThietBi["Hỏng"],
    "HT-LAB-HOA-01": trangThaiThietBi["Hỏng"],
    "TB-LAB-DT-01": trangThaiThietBi["Đang sửa chữa"]
  };

  function addDevice({ code, roomCode, name, type, importedAt }) {
    rows.push({
      code,
      roomCode,
      name,
      type,
      status: statusOverrides[code] || trangThaiThietBi["Tốt"],
      importedAt: at(importedAt)
    });
  }

  function addStandardRoomDevices(roomCode, importedAt) {
    [
      { prefix: "MC", name: "Máy chiếu Epson EB-X51", type: loaiThietBi["Máy chiếu"] },
      { prefix: "TV", name: "Tivi Samsung 55 inch", type: loaiThietBi["Tivi"] },
      { prefix: "AC", name: "Điều hòa Daikin 18000BTU", type: loaiThietBi["Điều hòa"] },
      { prefix: "SP", name: "Loa trợ giảng", type: loaiThietBi["Loa"] },
      { prefix: "BC", name: "Bộ bàn ghế giảng viên", type: loaiThietBi["Bàn ghế"] }
    ].forEach((device) => {
      addDevice({
        code: `${device.prefix}-${roomCode}-01`,
        roomCode,
        name: `${device.name} ${roomCode}`,
        type: device.type,
        importedAt
      });
    });
  }

  function addComputerLab(roomCode, pcCount, importedAt) {
    for (let index = 1; index <= pcCount; index += 1) {
      const number = String(index).padStart(2, "0");
      addDevice({
        code: `PC-${roomCode}-${number}`,
        roomCode,
        name: index === 1 ? `Máy tính giảng viên ${roomCode}` : `Máy tính sinh viên ${roomCode}-${number}`,
        type: loaiThietBi["Máy tính"],
        importedAt
      });
    }

    [
      { code: `MC-${roomCode}-01`, name: `Máy chiếu phòng ${roomCode}`, type: loaiThietBi["Máy chiếu"] },
      { code: `SW-${roomCode}-01`, name: `Bộ chuyển mạch mạng ${roomCode}`, type: loaiThietBi["Thiết bị khác"] },
      { code: `SP-${roomCode}-01`, name: `Loa phòng ${roomCode}`, type: loaiThietBi["Loa"] },
      { code: `AC-${roomCode}-01`, name: `Điều hòa ${roomCode}`, type: loaiThietBi["Điều hòa"] }
    ].forEach((device) => addDevice({ ...device, roomCode, importedAt }));
  }

  function addScienceLab(roomCode, importedAt, subjectName) {
    [
      { code: `TB-${roomCode}-01`, name: `Bộ thiết bị thực hành ${subjectName}`, type: loaiThietBi["Thiết bị khác"] },
      { code: `HT-${roomCode}-01`, name: `Hệ thống hút khí ${roomCode}`, type: loaiThietBi["Thiết bị khác"] },
      { code: `BC-${roomCode}-01`, name: `Bàn thí nghiệm ${roomCode}`, type: loaiThietBi["Bàn ghế"] },
      { code: `MC-${roomCode}-01`, name: `Máy chiếu phòng ${roomCode}`, type: loaiThietBi["Máy chiếu"] },
      { code: `AC-${roomCode}-01`, name: `Điều hòa ${roomCode}`, type: loaiThietBi["Điều hòa"] }
    ].forEach((device) => addDevice({ ...device, roomCode, importedAt }));
  }

  [
    ["P101", "2025-09-01"],
    ["P102", "2025-09-02"],
    ["P201", "2025-10-01"],
    ["P202", "2025-10-02"],
    ["P203", "2025-10-05"],
    ["P204", "2025-10-05"],
    ["P301", "2026-01-08"],
    ["P302", "2026-01-08"]
  ].forEach(([roomCode, importedAt]) => addStandardRoomDevices(roomCode, importedAt));

  addComputerLab("LAB01", 12, "2026-02-01");
  addComputerLab("LAB02", 12, "2026-02-10");
  addComputerLab("LAB-MANG", 12, "2026-03-01");

  addScienceLab("LAB-HOA", "2026-03-15", "hóa học");
  addScienceLab("LAB-LY", "2026-03-20", "vật lý");
  addScienceLab("LAB-DT", "2026-04-01", "điện tử");

  return rows;
}

async function main() {
  await clearData();

  const passwordHash = await bcrypt.hash("123456", 10);

  await prisma.user.createMany({
    data: [
      { fullName: "Quản trị viên CSVC", username: "admin", passwordHash, role: vaiTro["Quản trị viên"] },
      { fullName: "Nguyễn Văn Nam", username: "tech", passwordHash, role: vaiTro["Kỹ thuật viên"] },
      { fullName: "Trần Quốc Huy", username: "tech_it", passwordHash, role: vaiTro["Kỹ thuật viên"] },
      { fullName: "Phạm Minh Đức", username: "tech_audio", passwordHash, role: vaiTro["Kỹ thuật viên"] },
      { fullName: "Lê Minh Tuấn", username: "reporter", passwordHash, role: vaiTro["Người báo hỏng"] },
      { fullName: "Đỗ Thị Thu Hà", username: "gv_hoa", passwordHash, role: vaiTro["Người báo hỏng"] },
      { fullName: "Vũ Anh Khoa", username: "gv_vatly", passwordHash, role: vaiTro["Người báo hỏng"] },
      { fullName: "Ngô Mai Linh", username: "gv_tin", passwordHash, role: vaiTro["Người báo hỏng"] },
      { fullName: "Hoàng Gia Bảo", username: "gv_anh", passwordHash, role: vaiTro["Người báo hỏng"] },
      {
        fullName: "Tài khoản thử nghiệm bị khóa",
        username: "locked_user",
        passwordHash,
        role: vaiTro["Người báo hỏng"],
        status: trangThaiNguoiDung["Đã khóa"],
        failedLoginCount: 5,
        lockedUntil: at("2026-06-25T08:00:00+07:00")
      }
    ]
  });

  await prisma.room.createMany({
    data: [
      { code: "P101", type: loaiPhong["Phòng lý thuyết"], capacity: 60, status: trangThaiPhong["Đang sử dụng"] },
      { code: "P102", type: loaiPhong["Phòng lý thuyết"], capacity: 50, status: trangThaiPhong["Đang bảo trì"] },
      { code: "P201", type: loaiPhong["Phòng lý thuyết"], capacity: 70, status: trangThaiPhong["Đang sử dụng"] },
      { code: "P202", type: loaiPhong["Phòng lý thuyết"], capacity: 55, status: trangThaiPhong["Đang sử dụng"] },
      { code: "P203", type: loaiPhong["Phòng lý thuyết"], capacity: 65, status: trangThaiPhong["Đang sử dụng"] },
      { code: "P204", type: loaiPhong["Phòng lý thuyết"], capacity: 60, status: trangThaiPhong["Đang bảo trì"] },
      { code: "P301", type: loaiPhong["Phòng lý thuyết"], capacity: 80, status: trangThaiPhong["Đang sử dụng"] },
      { code: "P302", type: loaiPhong["Phòng lý thuyết"], capacity: 75, status: trangThaiPhong["Đang sử dụng"] },
      { code: "LAB01", type: loaiPhong["Phòng máy tính"], capacity: 35, status: trangThaiPhong["Đang sử dụng"] },
      { code: "LAB02", type: loaiPhong["Phòng máy tính"], capacity: 40, status: trangThaiPhong["Đang sử dụng"] },
      { code: "LAB-MANG", type: loaiPhong["Phòng máy tính"], capacity: 32, status: trangThaiPhong["Đang bảo trì"] },
      { code: "LAB-HOA", type: loaiPhong["Phòng thực hành"], capacity: 30, status: trangThaiPhong["Đang bảo trì"] },
      { code: "LAB-LY", type: loaiPhong["Phòng thực hành"], capacity: 32, status: trangThaiPhong["Đang sử dụng"] },
      { code: "LAB-DT", type: loaiPhong["Phòng thực hành"], capacity: 28, status: trangThaiPhong["Đang sử dụng"] }
    ]
  });

  const users = indexBy(await prisma.user.findMany(), "username");
  const rooms = indexBy(await prisma.room.findMany(), "code");
  const deviceRows = buildDeviceRows();

  await prisma.device.createMany({
    data: deviceRows.map(({ roomCode, ...device }) => ({
      ...device,
      roomId: rooms[roomCode].id
    }))
  });

  const devices = indexBy(await prisma.device.findMany(), "code");
  const reportRows = [
    {
      key: "projector-p101",
      reporter: "reporter",
      roomCode: "P101",
      deviceCodes: ["MC-P101-01"],
      status: trangThaiPhieu["Chờ xử lý"],
      createdAt: "2026-06-14T08:10:00+07:00",
      summary: "Máy chiếu P101",
      description: "Máy chiếu không lên hình khi bắt đầu tiết học, đã thử đổi cáp HDMI nhưng chưa khắc phục."
    },
    {
      key: "ac-p102",
      reporter: "gv_anh",
      roomCode: "P102",
      deviceCodes: ["AC-P102-01"],
      status: trangThaiPhieu["Đang xử lý"],
      createdAt: "2026-06-13T09:20:00+07:00",
      summary: "Điều hòa P102",
      description: "Điều hòa phát tiếng ồn lớn và làm mát yếu, lớp học phải chuyển phòng trong ca sáng."
    },
    {
      key: "speaker-p102",
      reporter: "reporter",
      roomCode: "P102",
      deviceCodes: ["SP-P102-01"],
      status: trangThaiPhieu["Chờ xử lý"],
      createdAt: "2026-06-18T13:45:00+07:00",
      summary: "Loa trợ giảng P102",
      description: "Loa trợ giảng mất nguồn, giảng viên không sử dụng được micrô không dây."
    },
    {
      key: "speaker-lab01",
      reporter: "gv_tin",
      roomCode: "LAB01",
      deviceCodes: ["SP-LAB01-01"],
      status: trangThaiPhieu["Hoàn thành"],
      createdAt: "2026-06-08T15:00:00+07:00",
      summary: "Loa phòng LAB01",
      description: "Loa bị rè khi mở âm lượng lớn, ảnh hưởng phần nghe trong giờ thực hành."
    },
    {
      key: "pc-lab01-07",
      reporter: "gv_tin",
      roomCode: "LAB01",
      deviceCodes: ["PC-LAB01-07"],
      status: trangThaiPhieu["Chờ xử lý"],
      createdAt: "2026-06-19T07:55:00+07:00",
      summary: "Máy tính sinh viên LAB01-07",
      description: "Máy tính sinh viên số 07 không khởi động, màn hình báo không nhận ổ cứng."
    },
    {
      key: "switch-lab02",
      reporter: "gv_tin",
      roomCode: "LAB02",
      deviceCodes: ["SW-LAB02-01"],
      status: trangThaiPhieu["Đang xử lý"],
      createdAt: "2026-06-12T10:30:00+07:00",
      summary: "Bộ chuyển mạch mạng LAB02",
      description: "Một dãy máy trong LAB02 mất kết nối mạng nội bộ, nghi ngờ bộ chuyển mạch bị lỗi cổng."
    },
    {
      key: "pc-lab02-03",
      reporter: "gv_tin",
      roomCode: "LAB02",
      deviceCodes: ["PC-LAB02-03"],
      status: trangThaiPhieu["Chờ xử lý"],
      createdAt: "2026-06-17T14:35:00+07:00",
      summary: "Máy tính sinh viên LAB02-03",
      description: "Máy tính số 03 treo ở màn hình đăng nhập và tự khởi động lại liên tục."
    },
    {
      key: "tv-p201",
      reporter: "gv_anh",
      roomCode: "P201",
      deviceCodes: ["TV-P201-01"],
      status: trangThaiPhieu["Hoàn thành"],
      createdAt: "2026-06-02T09:05:00+07:00",
      summary: "Tivi P201",
      description: "Tivi P201 nhấp nháy khi trình chiếu từ máy tính xách tay, cần kiểm tra cổng kết nối."
    },
    {
      key: "ac-p201",
      reporter: "reporter",
      roomCode: "P201",
      deviceCodes: ["AC-P201-01"],
      status: trangThaiPhieu["Chờ xử lý"],
      createdAt: "2026-06-16T16:20:00+07:00",
      summary: "Điều hòa P201",
      description: "Điều hòa P201 chảy nước xuống khu vực bàn giáo viên sau khoảng 20 phút bật máy."
    },
    {
      key: "projector-p202",
      reporter: "gv_anh",
      roomCode: "P202",
      deviceCodes: ["MC-P202-01"],
      status: trangThaiPhieu["Đang xử lý"],
      createdAt: "2026-06-11T08:40:00+07:00",
      summary: "Máy chiếu P202",
      description: "Máy chiếu P202 hình ảnh bị ám vàng và mất nét ở góc trái."
    },
    {
      key: "projector-p203",
      reporter: "reporter",
      roomCode: "P203",
      deviceCodes: ["MC-P203-01"],
      status: trangThaiPhieu["Hoàn thành"],
      createdAt: "2026-05-30T10:15:00+07:00",
      summary: "Máy chiếu P203",
      description: "Máy chiếu P203 báo cần vệ sinh bộ lọc và tự tắt sau thời gian dài sử dụng."
    },
    {
      key: "tv-speaker-p204",
      reporter: "gv_anh",
      roomCode: "P204",
      deviceCodes: ["TV-P204-01", "SP-P204-01"],
      status: trangThaiPhieu["Chờ xử lý"],
      createdAt: "2026-06-18T08:25:00+07:00",
      summary: "Tivi và loa P204",
      description: "Tivi không nhận tín hiệu HDMI, loa trợ giảng cũng không phát âm thanh."
    },
    {
      key: "ac-p301",
      reporter: "reporter",
      roomCode: "P301",
      deviceCodes: ["AC-P301-01"],
      status: trangThaiPhieu["Đang xử lý"],
      createdAt: "2026-06-10T13:10:00+07:00",
      summary: "Điều hòa P301",
      description: "Điều hòa P301 báo lỗi E5, kỹ thuật viên đã kiểm tra sơ bộ và chờ linh kiện."
    },
    {
      key: "speaker-p302",
      reporter: "gv_anh",
      roomCode: "P302",
      deviceCodes: ["SP-P302-01"],
      status: trangThaiPhieu["Chờ xử lý"],
      createdAt: "2026-06-15T11:00:00+07:00",
      summary: "Loa trợ giảng P302",
      description: "Loa trợ giảng P302 bị hú khi bật micrô, không thể dùng trong lớp đông sinh viên."
    },
    {
      key: "switch-lab-mang",
      reporter: "gv_tin",
      roomCode: "LAB-MANG",
      deviceCodes: ["SW-LAB-MANG-01"],
      status: trangThaiPhieu["Chờ xử lý"],
      createdAt: "2026-06-19T09:10:00+07:00",
      summary: "Bộ chuyển mạch mạng LAB-MANG",
      description: "Bộ chuyển mạch trung tâm LAB-MANG mất đèn tín hiệu ở nhiều cổng, ảnh hưởng bài thực hành định tuyến."
    },
    {
      key: "pc-lab-mang-05",
      reporter: "gv_tin",
      roomCode: "LAB-MANG",
      deviceCodes: ["PC-LAB-MANG-05"],
      status: trangThaiPhieu["Đang xử lý"],
      createdAt: "2026-06-09T14:00:00+07:00",
      summary: "Máy tính sinh viên LAB-MANG-05",
      description: "Máy tính số 05 không nhận thẻ mạng rời, cần kiểm tra khe PCI và trình điều khiển."
    },
    {
      key: "vent-hoa",
      reporter: "gv_hoa",
      roomCode: "LAB-HOA",
      deviceCodes: ["HT-LAB-HOA-01"],
      status: trangThaiPhieu["Chờ xử lý"],
      createdAt: "2026-06-18T10:05:00+07:00",
      summary: "Hệ thống hút khí LAB-HOA",
      description: "Hệ thống hút khí hoạt động yếu, mùi hóa chất còn lưu lại sau buổi thực hành."
    },
    {
      key: "bench-hoa",
      reporter: "gv_hoa",
      roomCode: "LAB-HOA",
      deviceCodes: ["BC-LAB-HOA-01"],
      status: trangThaiPhieu["Hoàn thành"],
      createdAt: "2026-05-28T15:25:00+07:00",
      summary: "Bàn thí nghiệm LAB-HOA",
      description: "Một cụm bàn thí nghiệm bị lỏng chân và cần siết lại trước lịch thực hành."
    },
    {
      key: "ac-lab-ly",
      reporter: "gv_vatly",
      roomCode: "LAB-LY",
      deviceCodes: ["AC-LAB-LY-01"],
      status: trangThaiPhieu["Hoàn thành"],
      createdAt: "2026-06-01T08:30:00+07:00",
      summary: "Điều hòa LAB-LY",
      description: "Điều hòa LAB-LY làm lạnh chậm, cần vệ sinh định kỳ trước đợt học thực hành."
    },
    {
      key: "device-lab-dt",
      reporter: "gv_vatly",
      roomCode: "LAB-DT",
      deviceCodes: ["TB-LAB-DT-01"],
      status: trangThaiPhieu["Đang xử lý"],
      createdAt: "2026-06-07T09:40:00+07:00",
      summary: "Bộ thiết bị thực hành điện tử",
      description: "Một bộ nguồn thực hành điện tử không ổn định điện áp đầu ra, cần hiệu chuẩn lại."
    }
  ];

  const reports = {};
  for (const report of reportRows) {
    reports[report.key] = await prisma.damageReport.create({
      data: {
        reporterId: users[report.reporter].id,
        roomId: rooms[report.roomCode].id,
        description: report.description,
        status: report.status,
        createdAt: at(report.createdAt),
        devices: {
          create: report.deviceCodes.map((code) => ({ deviceId: devices[code].id }))
        }
      }
    });
  }

  await prisma.repairLog.createMany({
    data: [
      {
        deviceId: devices["AC-P102-01"].id,
        reportId: reports["ac-p102"].id,
        technicianId: users.tech.id,
        quantity: 1,
        repairedAt: at("2026-06-13T14:30:00+07:00"),
        content: "Vệ sinh lưới lọc, kiểm tra gas lạnh và đặt lịch thay tụ quạt dàn lạnh.",
        afterStatus: trangThaiThietBi["Đang sửa chữa"]
      },
      {
        deviceId: devices["SP-LAB01-01"].id,
        reportId: reports["speaker-lab01"].id,
        technicianId: users.tech_audio.id,
        quantity: 1,
        repairedAt: at("2026-06-09T09:15:00+07:00"),
        content: "Thay dây tín hiệu âm thanh, vệ sinh cổng kết nối và kiểm tra lại micrô.",
        afterStatus: trangThaiThietBi["Tốt"]
      },
      {
        deviceId: devices["SW-LAB02-01"].id,
        reportId: reports["switch-lab02"].id,
        technicianId: users.tech_it.id,
        quantity: 1,
        repairedAt: at("2026-06-12T16:00:00+07:00"),
        content: "Đặt lại cấu hình bộ chuyển mạch, thay thử bộ đổi nguồn, tiếp tục theo dõi cổng số 5.",
        afterStatus: trangThaiThietBi["Đang sửa chữa"]
      },
      {
        deviceId: devices["TV-P201-01"].id,
        reportId: reports["tv-p201"].id,
        technicianId: users.tech.id,
        quantity: 1,
        repairedAt: at("2026-06-03T10:00:00+07:00"),
        content: "Thay cáp HDMI âm tường, cập nhật phần mềm hệ thống của tivi và kiểm tra trình chiếu.",
        afterStatus: trangThaiThietBi["Tốt"]
      },
      {
        deviceId: devices["MC-P202-01"].id,
        reportId: reports["projector-p202"].id,
        technicianId: users.tech.id,
        quantity: 1,
        repairedAt: at("2026-06-11T15:20:00+07:00"),
        content: "Vệ sinh cụm kính, cân chỉnh lại tiêu cự, chờ thay bóng chiếu dự phòng.",
        afterStatus: trangThaiThietBi["Đang sửa chữa"]
      },
      {
        deviceId: devices["MC-P203-01"].id,
        reportId: reports["projector-p203"].id,
        technicianId: users.tech.id,
        quantity: 1,
        repairedAt: at("2026-05-31T08:45:00+07:00"),
        content: "Vệ sinh bộ lọc bụi và reset cảnh báo bảo trì của máy chiếu.",
        afterStatus: trangThaiThietBi["Tốt"]
      },
      {
        deviceId: devices["AC-P301-01"].id,
        reportId: reports["ac-p301"].id,
        technicianId: users.tech.id,
        quantity: 1,
        repairedAt: at("2026-06-10T16:45:00+07:00"),
        content: "Kiểm tra bo điều khiển, xác nhận lỗi cảm biến nhiệt và chờ linh kiện thay thế.",
        afterStatus: trangThaiThietBi["Đang sửa chữa"]
      },
      {
        deviceId: devices["PC-LAB-MANG-05"].id,
        reportId: reports["pc-lab-mang-05"].id,
        technicianId: users.tech_it.id,
        quantity: 1,
        repairedAt: at("2026-06-09T16:30:00+07:00"),
        content: "Cài lại trình điều khiển thẻ mạng, kiểm tra khe PCI, máy cần theo dõi thêm trong ca thực hành.",
        afterStatus: trangThaiThietBi["Đang sửa chữa"]
      },
      {
        deviceId: devices["BC-LAB-HOA-01"].id,
        reportId: reports["bench-hoa"].id,
        technicianId: users.tech.id,
        quantity: 1,
        repairedAt: at("2026-05-29T09:30:00+07:00"),
        content: "Siết lại chân bàn, thay hai ốc hãm và kiểm tra độ cân bằng mặt bàn.",
        afterStatus: trangThaiThietBi["Tốt"]
      },
      {
        deviceId: devices["AC-LAB-LY-01"].id,
        reportId: reports["ac-lab-ly"].id,
        technicianId: users.tech.id,
        quantity: 1,
        repairedAt: at("2026-06-01T14:10:00+07:00"),
        content: "Vệ sinh dàn lạnh, đo áp suất gas và chạy thử 30 phút ổn định.",
        afterStatus: trangThaiThietBi["Tốt"]
      },
      {
        deviceId: devices["TB-LAB-DT-01"].id,
        reportId: reports["device-lab-dt"].id,
        technicianId: users.tech_it.id,
        quantity: 1,
        repairedAt: at("2026-06-07T15:05:00+07:00"),
        content: "Hiệu chỉnh nguồn cấp và đánh dấu bộ cần kiểm định lại sau 7 ngày.",
        afterStatus: trangThaiThietBi["Đang sửa chữa"]
      },
      {
        deviceId: devices["PC-LAB01-01"].id,
        reportId: null,
        technicianId: users.tech_it.id,
        quantity: 1,
        repairedAt: at("2026-06-05T11:20:00+07:00"),
        content: "Cài lại trình điều khiển máy chiếu và cập nhật phần mềm trình chiếu cho máy giảng viên.",
        afterStatus: trangThaiThietBi["Tốt"]
      },
      {
        deviceId: devices["MC-P302-01"].id,
        reportId: null,
        technicianId: users.tech.id,
        quantity: 1,
        repairedAt: at("2026-06-06T10:10:00+07:00"),
        content: "Bảo trì định kỳ, vệ sinh bộ lọc và kiểm tra độ sáng bóng chiếu.",
        afterStatus: trangThaiThietBi["Tốt"]
      },
      {
        deviceId: devices["AC-LAB-HOA-01"].id,
        reportId: null,
        technicianId: users.tech.id,
        quantity: 1,
        repairedAt: at("2026-06-04T15:40:00+07:00"),
        content: "Bảo dưỡng điều hòa phòng thí nghiệm, vệ sinh lưới lọc và kiểm tra thoát nước.",
        afterStatus: trangThaiThietBi["Tốt"]
      }
    ]
  });

  const notificationRows = [];
  const reportByKey = indexBy(reportRows, "key");

  function addNotification({ type, title, message, recipient, actor, reportKey, isRead = false, createdAt }) {
    notificationRows.push({
      type,
      title,
      message,
      isRead,
      recipientId: recipient ? users[recipient].id : null,
      actorId: actor ? users[actor].id : null,
      reportId: reportKey ? reports[reportKey].id : null,
      createdAt: at(createdAt)
    });
  }

  ["projector-p101", "speaker-p102", "pc-lab01-07", "pc-lab02-03", "ac-p201", "tv-speaker-p204", "speaker-p302", "switch-lab-mang", "vent-hoa"].forEach((key, index) => {
    const report = reportByKey[key];
    addNotification({
      type: loaiThongBao["Phiếu báo hỏng"],
      title: `Phiếu báo hỏng mới #${reports[key].id}`,
      message: `${users[report.reporter].fullName} báo hỏng tại phòng ${report.roomCode}: ${report.summary}.`,
      recipient: "admin",
      actor: report.reporter,
      reportKey: key,
      isRead: index < 2,
      createdAt: report.createdAt
    });
    addNotification({
      type: loaiThongBao["Phiếu báo hỏng"],
      title: `Cần phân công xử lý #${reports[key].id}`,
      message: `Phiếu tại phòng ${report.roomCode} đang chờ kỹ thuật viên tiếp nhận: ${report.summary}.`,
      recipient: index % 2 === 0 ? "tech" : "tech_it",
      actor: "admin",
      reportKey: key,
      createdAt: "2026-06-19T10:00:00+07:00"
    });
  });

  ["ac-p102", "switch-lab02", "projector-p202", "ac-p301", "pc-lab-mang-05", "device-lab-dt"].forEach((key) => {
    const report = reportByKey[key];
    addNotification({
      type: loaiThongBao["Cập nhật sửa chữa"],
      title: `Phiếu báo hỏng đang xử lý #${reports[key].id}`,
      message: `Thiết bị ${report.summary} tại phòng ${report.roomCode} đã được kỹ thuật viên tiếp nhận.`,
      recipient: report.reporter,
      actor: "tech",
      reportKey: key,
      createdAt: "2026-06-18T16:10:00+07:00"
    });
  });

  ["speaker-lab01", "tv-p201", "projector-p203", "bench-hoa", "ac-lab-ly"].forEach((key) => {
    const report = reportByKey[key];
    addNotification({
      type: loaiThongBao["Cập nhật sửa chữa"],
      title: `Phiếu báo hỏng đã hoàn thành #${reports[key].id}`,
      message: `${report.summary} tại phòng ${report.roomCode} đã được sửa và chuyển về trạng thái tốt.`,
      recipient: report.reporter,
      actor: "tech",
      reportKey: key,
      isRead: true,
      createdAt: "2026-06-10T17:15:00+07:00"
    });
  });

  Object.values(users)
    .filter((user) => user.status === trangThaiNguoiDung["Hoạt động"])
    .forEach((user, index) => {
      addNotification({
        type: loaiThongBao["Thông báo quản trị"],
        title: "Lịch kiểm kê thiết bị cuối tuần",
        message: "Các phòng học cần hoàn tất kiểm kê máy chiếu, tivi, điều hòa và thiết bị mạng trước 17:00 thứ Sáu.",
        recipient: user.username,
        actor: "admin",
        isRead: index % 3 === 0,
        createdAt: "2026-06-17T08:00:00+07:00"
      });
    });

  await prisma.notification.createMany({ data: notificationRows });

  console.log("Nạp dữ liệu hoàn tất");
  console.log(`Người dùng: ${Object.keys(users).length} tài khoản, mật khẩu mặc định: 123456`);
  console.log(`Phòng học: ${Object.keys(rooms).length}`);
  console.log(`Thiết bị: ${deviceRows.length}`);
  console.log(`Phiếu báo hỏng: ${reportRows.length}`);
  console.log("Lịch sử sửa chữa: 14");
  console.log(`Thông báo: ${notificationRows.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
