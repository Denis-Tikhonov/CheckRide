let DATA = null;
let currentMode = 'line';
let currentSectionIndex = 0;

// Переключение режима
function setMode(mode) {
    currentMode = mode;
    const btnLine = document.getElementById('btn-line');
    const btnFfs = document.getElementById('btn-ffs');
    if(btnLine) btnLine.classList.toggle('active', mode === 'line');
    if(btnFfs) btnFfs.classList.toggle('active', mode === 'ffs');
}

// Начало проверки
async function startInspection() {
    const fio = document.getElementById("fio").value;
    const instructor = document.getElementById("instructor").value;
    
    if (!fio || !instructor) {
        alert("Заполните ФИО проверяемого и ФИО проверяющего");
        return;
    }

    const fileName = currentMode === 'line' ? 'data.json' : 'data_ffs.json';
    
    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error("Файл не найден");
        
        const text = await response.text();
        DATA = JSON.parse(text);
        
        // Подготовка данных
        DATA.checklists.forEach(sec => sec.items.forEach(i => {
            i.ok = false; i.note = ""; i.img = null;
        }));

        currentSectionIndex = 0;
        renderSection();
        show('screen-test');
    } catch (e) {
        alert("Ошибка загрузки данных: " + e.message);
    }
}

// Отрисовка вопросов текущей секции
function renderSection() {
    const section = DATA.checklists[currentSectionIndex];
    
    // Элементы
    const titleEl = document.getElementById("section-title");
    const itemsBox = document.getElementById("checklist-items");
    const detailsBox = document.getElementById("checklist-details");

    if (!titleEl || !itemsBox || !detailsBox) return;

    titleEl.innerText = section.name;
    itemsBox.innerHTML = "";
    detailsBox.innerHTML = "";

    section.items.forEach(item => {
        // Чекбоксы
        const itemDiv = document.createElement("div");
        itemDiv.className = "check-item";
        itemDiv.innerHTML = `
            <input type="checkbox" id="c_${item.id}" ${item.ok ? 'checked' : ''}>
            <label for="c_${item.id}">${item.label}</label>
        `;
        itemsBox.appendChild(itemDiv);

        // Детали (фото и комментарий)
        const detailDiv = document.createElement("div");
        detailDiv.className = "detail-item";
        detailDiv.innerHTML = `
            <b style="font-size:12px; color:#666;">${item.label}</b>
            <textarea id="n_${item.id}" placeholder="Комментарий...">${item.note}</textarea>
            <input type="file" accept="image/*" onchange="uploadImg(this, '${item.id}')">
            <div id="p_${item.id}" style="margin-top:5px;">
                ${item.img ? `<img src="${item.img}" width="80">` : ''}
            </div>
        `;
        detailsBox.appendChild(detailDiv);
    });
    
    updateNavButtons();
}

// Навигация
function updateNavButtons() {
    const isFirst = currentSectionIndex === 0;
    const isLast = currentSectionIndex === DATA.checklists.length - 1;
    
    const prevBtn = document.getElementById("btn-prev");
    const nextBtn = document.getElementById("btn-next");
    const finishBtn = document.getElementById("btn-finish");

    if(prevBtn) prevBtn.style.display = isFirst ? "none" : "block";
    if(nextBtn) nextBtn.style.display = isLast ? "none" : "block";
    if(finishBtn) finishBtn.classList.toggle("hidden", !isLast);
}

function saveState() {
    const section = DATA.checklists[currentSectionIndex];
    section.items.forEach(item => {
        const cb = document.getElementById(`c_${item.id}`);
        const nt = document.getElementById(`n_${item.id}`);
        if(cb) item.ok = cb.checked;
        if(nt) item.note = nt.value;
    });
}

function nextSection() { saveState(); currentSectionIndex++; renderSection(); }
function prevSection() { saveState(); currentSectionIndex--; renderSection(); }

// Завершение и отчет
function finishInspection() {
    saveState();
    buildReport();
    saveToLocalStorage();
    show("screen-report");
    initSignature();
}

function buildReport() {
    const container = document.getElementById("report-data");
    if(!container) return;
    
    container.innerHTML = "";
    DATA.checklists.forEach(section => {
        const sDiv = document.createElement("div");
        sDiv.innerHTML = `<h3 style="color:rgb(205, 32, 44); margin-top:15px; border-bottom:1px solid #eee;">${section.name}</h3>`;
        section.items.forEach(item => {
            sDiv.innerHTML += `
                <div style="margin-bottom:10px; border-bottom:1px solid #f0f0f0; padding-bottom:5px;">
                    <p style="margin:5px 0;"><b>${item.label}</b></p>
                    <div class="flex-row">
                        <div style="border:1px solid #000; width:16px; height:16px; text-align:center; line-height:16px; font-size:12px;">${item.ok ? 'X' : ''}</div>
                        <span style="font-size:14px; margin-left:8px;">Статус: ${item.ok ? 'OK' : 'Нарушение'}</span>
                    </div>
                    <p style="font-size:13px; margin:5px 0; color:#444;">Комментарий: ${item.note || '-'}</p>
                    ${item.img ? `<img src="${item.img}" style="max-width:200px; display:block; margin-top:5px;">` : ''}
                </div>`;
        });
        container.appendChild(sDiv);
    });

    // Заполнение мета-данных
    const rFio = document.getElementById("r_fio");
    const rLic = document.getElementById("r_license");
    const rIns = document.getElementById("r_instructor");
    const rDat = document.getElementById("r_date");
    const rMod = document.getElementById("r_mode");

    if(rFio) rFio.innerText = document.getElementById("fio").value;
    if(rLic) rLic.innerText = document.getElementById("license").value;
    if(rIns) rIns.innerText = document.getElementById("instructor").value;
    if(rDat) rDat.innerText = DATA.savedDate || new Date().toLocaleString();
    if(rMod) rMod.innerText = currentMode.toUpperCase();
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

async function uploadImg(input, id) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const b64 = e.target.result;
            DATA.checklists.forEach(s => s.items.forEach(i => { if(i.id === id) i.img = b64; }));
            const pBox = document.getElementById(`p_${id}`);
            if(pBox) pBox.innerHTML = `<img src="${b64}" width="80" style="margin-top:5px;">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function saveToLocalStorage() {
    const history = JSON.parse(localStorage.getItem("checkride_history") || "[]");
    const canvas = document.getElementById("signature");
    const entry = {
        fio: document.getElementById("fio").value,
        license: document.getElementById("license").value,
        instructor: document.getElementById("instructor").value,
        date: new Date().toLocaleString(),
        mode: currentMode,
        fullData: JSON.parse(JSON.stringify(DATA)),
        signature: canvas ? canvas.toDataURL() : null
    };
    history.unshift(entry);
    localStorage.setItem("checkride_history", JSON.stringify(history.slice(0, 20)));
}

function showHistory() {
    const history = JSON.parse(localStorage.getItem("checkride_history") || "[]");
    const box = document.getElementById("historyList");
    if(!box) return;
    
    box.innerHTML = history.length ? history.map((h, i) => `
        <div class="history-card" onclick="viewSavedReport(${i})" style="padding:10px; border:1px solid #ddd; margin-bottom:5px; border-radius:5px; cursor:pointer;">
            <b>${h.fio}</b> <small>(${h.mode.toUpperCase()})</small><br>
            <small>${h.date}</small>
        </div>
    `).join("") : "<p>История пуста</p>";
    show("screen-history");
}

function viewSavedReport(index) {
    const history = JSON.parse(localStorage.getItem("checkride_history") || "[]");
    const saved = history[index];
    
    document.getElementById("fio").value = saved.fio;
    document.getElementById("license").value = saved.license;
    document.getElementById("instructor").value = saved.instructor;
    currentMode = saved.mode;
    DATA = saved.fullData;
    DATA.savedDate = saved.date;

    buildReport();
    
    const placeholder = document.getElementById("sig-image-placeholder");
    const canvas = document.getElementById("signature");
    if(placeholder && canvas) {
        placeholder.innerHTML = `<img src="${saved.signature}" style="width:250px; border-bottom:1px solid #000;">`;
        canvas.style.display = "none";
    }
    show("screen-report");
}

function clearHistory() {
    if(confirm("Очистить историю?")) {
        localStorage.removeItem("checkride_history");
        showHistory();
    }
}

function exportPDF() {
    const canvas = document.getElementById("signature");
    const placeholder = document.getElementById("sig-image-placeholder");
    
    if (canvas && canvas.style.display !== "none") {
        placeholder.innerHTML = `<img src="${canvas.toDataURL()}" style="width:250px; border-bottom:1px solid #000;">`;
        canvas.style.display = "none";
    }

    const element = document.getElementById("report-content");
    html2pdf().set({
        margin: 10,
        filename: 'Report.pdf',
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save();
}

function initSignature() {
    const canvas = document.getElementById("signature");
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const placeholder = document.getElementById("sig-image-placeholder");
    
    canvas.style.display = "block";
    if(placeholder) placeholder.innerHTML = "";
    ctx.clearRect(0,0,canvas.width, canvas.height);
    
    let drawing = false;
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        return { x: cx, y: cy };
    };
    canvas.onmousedown = canvas.ontouchstart = (e) => { drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); };
    canvas.onmousemove = canvas.ontouchmove = (e) => { if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    canvas.onmouseup = canvas.ontouchend = () => drawing = false;
    ctx.lineWidth = 2; ctx.strokeStyle = "#000";
}

function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
    window.scrollTo(0,0);
}

function resetApp() { location.reload(); }
