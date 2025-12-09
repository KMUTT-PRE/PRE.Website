const express = require("express");
const router = express.Router();

const New_data = [
  {
    Img: "/images/Homepage/Homepage-new1.jpg",
    Title: "DEK69 วิศวกรรมอุตสาหการ",
    Description:
      "วิศวกรรมอุตสาหการเปิดรับสมัครรอบที่ 1 ตั้งแต่ 12 พฤจิกายน 2568 - 6 มกราคม 2569",
    Date: "12 พฤศจิกายน 2568",
  },
  {
    Img: "/images/Homepage/Homepage-new2.jpg",
    Title: "วิศวกรรมระบบอุตสาหกรรมและการประกอบการธุรกิจ",
    Description: "หลักสูตรใหม่ ISEE",
    Date: "06 พฤศจิกายน 2568",
  },
  {
    Img: "/images/Homepage/Homepage-new3.jpg",
    Title: "เปิดรับสมัครนักศึกษาใหม่ ระดับปริญญาโท",
    Description:
      "สาขาวิชาวิศวกรรมอุตสาหการและระบบการผลิต หลักสูตรปรับปรุง พ.ศ.2568",
    Date: "21 ตุลาคม 2568",
  },
  {
    Img: "/images/Homepage/Homepage-new4.jpg",
    Title: "รับสมัครนักศึกษาปริญญาโท-เอก",
    Description:
      "สาขาวิชาวิศวกรรมอุตสาหการและระบบการผลิต อาจารย์ที่ปรึกษา รศ. ดร.พร้อมพงษ์ ปานดี",
    Date: "10 ตุลาคม 2568",
  },
  {
    Img: "/images/Homepage/Homepage-new5.jpg",
    Title: "โครงการทุนเพชรพระจอมเกล้ามหาบัณฑิต เปิดรับสมัครแล้ว",
    Description: "ระดับปริญญาโท ภาคการศึกษาที่ 2/2568",
    Date: "02 ตุลาคม 2568",
  },
  {
    Img: "/images/Homepage/Homepage-new6.jpg",
    Title: "กำหนดการรับสมัคร มจธ. ปี 2569",
    Description:
      "โอกาสเป็นส่วนหนึ่งของมหาวิทยาลัยชั้นนำในไทยมาแล้ว!เล็งคณะไหนไว้ ลุยเลย❗️",
    Date: "17 กันยายน 2568",
  },
];

router.get("/", (req, res) => {
  res.render("pages/Home", { New_data });
});

module.exports = router;
