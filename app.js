// Yıl bilgisini footer'a yaz
document.getElementById("year").textContent = new Date().getFullYear();

const loginForm = document.getElementById("loginForm");
const statusEl = document.getElementById("status");

loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    // Basit validasyon
    if (!email || !password) {
        showStatus("Please fill in both email and password.", "error");
        return;
    }

    // Şimdilik DEMO login: gerçek sistemde burada API çağrısı olacak
    // TODO: Buraya backend / Firebase / kendi API'n için istek koyacağız.
    setTimeout(() => {
        showStatus(`Demo login successful. Welcome, ${email}!`, "ok");
    }, 400);
});

function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.classList.remove("ok", "error");
    if (type) statusEl.classList.add(type);
}
