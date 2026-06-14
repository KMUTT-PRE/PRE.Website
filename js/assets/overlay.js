function openModal(imagePath) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");

  // นำ Path รูปภาพที่ส่งมาไปใส่ในแท็ก img ของ Modal
  modalImg.src = imagePath;

  // แสดง Modal ขึ้นมา
  modal.style.display = "flex";

  // ป้องกันการเลื่อนหน้าจอด้านหลัง
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const modal = document.getElementById("imageModal");
  modal.style.display = "none";

  // คืนค่าให้หน้าจอเลื่อนได้ปกติ
  document.body.style.overflow = "auto";
}

// ปิด Modal เมื่อคลิกพื้นที่ว่างนอกรูปภาพ
window.onclick = function (event) {
  const modal = document.getElementById("imageModal");
  if (event.target == modal) {
    closeModal();
  }
};
