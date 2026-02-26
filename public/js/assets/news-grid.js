// 1. ส่วนของข้อมูลและตัวแปรเริ่มต้น
const images = Array.from(document.querySelectorAll(".container-pic img")).map(
  (img) => img.src
);
let slideIndex = 1;

// ตัวแปรสำหรับระบบ Zoom และ Panning
let zoomLevel = 0; // 0=ปกติ, 1=ซูมระดับ1, 2=ซูมระดับ2
let isDragging = false;
let startX, startY;
let translateX = 0,
  translateY = 0;

// 2. ฟังก์ชันพื้นฐานของ Modal
function openModal() {
  document.getElementById("myModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("myModal").style.display = "none";
  resetZoom(); // รีเซ็ตซูมเมื่อปิด
}

function closeModalOnBackdrop(event) {
  if (event.target.id === "myModal") {
    closeModal();
  }
}

function plusSlides(n) {
  showSlides((slideIndex += n));
}

function currentSlide(n) {
  showSlides((slideIndex = n));
}

// ฟังก์ชันแสดงรูปภาพและรีเซ็ตสถานะการซูม
function showSlides(n) {
  let mainImg = document.getElementById("mainImg");
  let demos = document.getElementsByClassName("demo");

  if (n > images.length) {
    slideIndex = 1;
  }
  if (n < 1) {
    slideIndex = images.length;
  }

  // เปลี่ยนรูป
  mainImg.src = images[slideIndex - 1];

  // ทุกครั้งที่เปลี่ยนรูป ต้องรีเซ็ตการซูมและตำแหน่ง
  resetZoom();

  // จัดการ Thumbnail Active
  for (let i = 0; i < demos.length; i++) {
    demos[i].classList.remove("active");
  }
  if (demos[slideIndex - 1]) {
    demos[slideIndex - 1].classList.add("active");
    demos[slideIndex - 1].scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }
}

// ฟังก์ชันรีเซ็ตค่าการซูมและตำแหน่งลาก
function resetZoom() {
  const mainImg = document.getElementById("mainImg");
  zoomLevel = 0;
  translateX = 0;
  translateY = 0;
  if (mainImg) {
    mainImg.classList.remove("zoom-1", "zoom-2");
    mainImg.style.transform = `scale(1) translate(0px, 0px)`;
  }
}

// 3. ส่วนของการควบคุมด้วยเมาส์ (Zoom & Drag)
document.addEventListener("DOMContentLoaded", () => {
  const mainImg = document.getElementById("mainImg");

  // คลิกที่รูปเพื่อ Zoom 3 ระดับ
  mainImg.addEventListener("click", (e) => {
    // ถ้ากำลังลากอยู่ ไม่ต้องทำงาน (ป้องกันการซูมขณะปล่อยเมาส์จากการลาก)
    if (Math.abs(translateX) > 5 || (Math.abs(translateY) > 5 && isDragging))
      return;

    zoomLevel = (zoomLevel + 1) % 3; // วน 0 -> 1 -> 2 -> 0

    mainImg.classList.remove("zoom-1", "zoom-2");

    if (zoomLevel === 1) {
      mainImg.classList.add("zoom-1");
    } else if (zoomLevel === 2) {
      mainImg.classList.add("zoom-2");
    } else {
      resetZoom();
    }
  });

  // เริ่มต้นการลาก (MouseDown)
  mainImg.addEventListener("mousedown", (e) => {
    if (zoomLevel === 0) return; // ซูมอยู่ถึงจะลากได้
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    mainImg.style.transition = "none"; // ปิด animation ขณะลากเพื่อให้ลื่นตามเมาส์
  });

  // ขณะลาก (MouseMove)
  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();

    translateX = e.clientX - startX;
    translateY = e.clientY - startY;

    // คำนวณ Scale ตามระดับการซูม (ต้องตรงกับ CSS)
    let scale = 1;
    if (zoomLevel === 1) scale = 1.8;

    // เลื่อนรูปตามเมาส์
    mainImg.style.transform = `scale(${scale}) translate(${
      translateX / scale
    }px, ${translateY / scale}px)`;
  });

  // หยุดลาก (MouseUp)
  window.addEventListener("mouseup", () => {
    isDragging = false;
    if (mainImg) {
      mainImg.style.transition = "transform 0.3s ease-out"; // เปิด animation กลับคืน
    }
  });
});
