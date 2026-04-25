let DATA = null;
let currentMode = 'line'; 
let currentSectionIndex = 0;
let inspections = JSON.parse(localStorage.getItem("inspections") || "[]");

const DATA_FILES = {
    line: 'data.json',
    ffs: 'data_ffs.json'
};

// 1. Установка режима (Line/FFS)
function setMode(mode) {
    currentMode = mode;
    document.getElementById('btn-line').classList.toggle('active', mode === 'line');
    document.getElementById('btn-ffs').classList.toggle('active', mode === 'ffs');
}

// 2. Запуск проверки
async function startInspection() {
    const fio = document.getElementById("fio").value;
    if (!fio) return alert("Пожалуйста, введите ФИО");

    try {
        const response = await fetch(DATA_FILES[currentMode]);
        DATA = await response.json();
        
        // Инициализируем структуру для хранения ответов
        DATA.checklists.forEach(section => {
            section.items.forEach(item => {
                item.answer_ok = false;
                item.answer_note = "";
                item.answer_img = null;
            });
        });

        currentSectionIndex = 0;
        renderSection();
        show('screen-test');
    } catch (e) {
        alert("Ошибка загрузки данных. Проверьте наличие data.json и data_ffs.json");
    }
}

// 3. Отрисовка текущего блока (Preflight / Takeoff и т.д.)
function renderSection() {
    const section = DATA.checklists[currentSectionIndex];
    document.getElementById("section-title").innerText = section.name;
    
    const container = document.getElementById("checklist");
    container.innerHTML = "";

    section.items.forEach(item => {
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `
            <p class="item-label">${item.label}</p>
            <div class="item-inputs">
                <label class="checkbox-label">
                    <input type="checkbox" id="c_${item.id}" ${item.answer_ok ? 'checked' : ''}> OK
                </label>
                <textarea id="n_${item.id}" placeholder="Комментарий">${item.answer_note}</textarea>
                <input type="file" accept="image/*" id="f_${item.id}" class="file-input">
                <div id="p_${item.id}" class="img-preview">
                    ${item.answer_img ? `<img src="${item.answer_img}">` : ''}
                </div>
            </div>
        `;
        container.appendChild(div);

        // Обработка фото (сразу в Base64 для сохранения состояния)
        const fileInput = div.querySelector(`#f_${item.id}`);
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                const base64 = await toBase64(e.target.files[0]);
                item.answer_img = base64;
                div.querySelector(`#p_${item.id}`).innerHTML = `<img src="${base64}">`;
            }
        });
    });

    updateNavigationButtons();
}

// 4. Навигация между блоками
function updateNavigationButtons() {
    const isFirst = currentSectionIndex === 0;
    const isLast = currentSectionIndex === DATA.checklists.length - 1;

    document.getElementById("btn-prev").classList.toggle("hidden", isFirst);
    document.getElementById("btn-next").classList.toggle("hidden", isLast);
    document.getElementById("btn-finish").classList.toggle("hidden", !isLast);
    
    window.scrollTo(0,0);
}

function nextSection() {
    saveCurrentAnswers();
    currentSectionIndex++;
    renderSection();
}

function prevSection() {
    saveCurrentAnswers();
    currentSectionIndex--;
    renderSection();
}

function saveCurrentAnswers() {
    const section = DATA.checklists[currentSectionIndex];
    section.items.forEach(item => {
        item.answer_ok = document.getElementById(`c_${item.id}`).checked;
        item.answer_note = document.getElementById(`n_${item.id}`).value;
    });
}

// 5. Завершение и формирование отчета
async function finishInspection() {
    saveCurrentAnswers();
    
    const container = document.getElementById("report_items_container");
    container.innerHTML = "";

    DATA.checklists.forEach(section => {
        const secDiv = document.createElement("div");
        secDiv.className = "report-section";
        secDiv.innerHTML = `<h3>${section.name}</h3>`;

        section.items.forEach(item => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "report-row";
            itemDiv.innerHTML = `
                <p><b>${item.label}</b></p>
                <p>Статус: ${item.answer_ok ? "✅ OK" : "❌ Нарушение"}</p>
                <p>Комментарий: ${item.answer_note || "-"}</p>
                ${item.answer_img ? `<img src="${item.answer_img}" class="report-img">` : ""}
                <hr>
            `;
            secDiv.appendChild(itemDiv);
        });
        container.appendChild(secDiv);
    });

    // Мета данные
    document.getElementById("r_fio").innerText = document.getElementById("fio").value;
    document.getElementById("r_license").innerText = document.getElementById("license").value;
    document.getElementById("r_date").innerText = new Date().toLocaleString();
    document.getElementById("r_mode").innerText = currentMode.toUpperCase();

    saveToHistory();
    show("screen-report");
    setTimeout(initSignature, 100); // Небольшая задержка для прорисовки canvas
}

// 6. Подпись (Canvas)
function initSignature() {
    const canvas = document.getElementById("signature");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let drawing = false;

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e) => { drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); };
    const draw = (e) => { 
        if (!drawing) return; 
        e.preventDefault(); 
        const p = getPos(e); 
        ctx.lineTo(p.x, p.y); 
        ctx.stroke(); 
    };
    const stop = () => drawing = false;

    canvas.onmousedown = start; canvas.onmousemove = draw; canvas.onmouseup = stop;
    canvas.ontouchstart = start; canvas.ontouchmove = draw; canvas.ontouchend = stop;
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#000";
}

// 7. Экспорт PDF
function exportPDF() {
    const element = document.getElementById("report-to-export");
    const opt = {
        margin: 10,
        filename: `Report_${currentMode.toUpperCase()}_${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

// 8. Утилиты и LocalStorage
function saveToHistory() {
    const record = {
        fio: document.getElementById("fio").value,
        mode: currentMode.toUpperCase(),
        date: new Date().toLocaleString()
    };
    inspections.unshift(record);
    localStorage.setItem("inspections", JSON.stringify(inspections.slice(0, 20)));
}

function showHistory() {
    const list = document.getElementById("historyList");
    list.innerHTML = inspections.map(i => `
        <div class="history-item">
            <b>${i.fio}</b> [${i.mode}]<br><small>${i.date}</small>
        </div>
    `).join("");
    show("screen-history");
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function resetApp() {
    if (confirm("Начать новую проверку? Текущие данные будут сброшены.")) location.reload();
}

// Service Worker (PWA)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
