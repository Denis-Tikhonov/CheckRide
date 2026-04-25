let DATA = null;
let currentMode = 'line';
let currentSectionIndex = 0;

function setMode(mode) {
    currentMode = mode;
    document.getElementById('btn-line').classList.toggle('active', mode === 'line');
    document.getElementById('btn-ffs').classList.toggle('active', mode === 'ffs');
}

async function startInspection() {
    const fio = document.getElementById("fio").value;
    const instructor = document.getElementById("instructor").value;
    if (!fio || !instructor) return alert("Заполните ФИО проверяемого и ФИО проверяющего");

    const file = currentMode === 'line' ? 'data.json' : 'data_ffs.json';
    try {
        const response = await fetch(file);
        DATA = await response.json();
        DATA.checklists.forEach(sec => sec.items.forEach(i => {
            i.ok = false; i.note = ""; i.img = null;
        }));
        currentSectionIndex = 0;
        renderSection();
        show('screen-test');
    } catch (e) { alert("Ошибка загрузки данных"); }
}

function renderSection() {
    const section = DATA.checklists[currentSectionIndex];
    const itemsBox = document.getElementById("checklist-items");
    const detailsBox = document.getElementById("checklist-details");
    const titleEl = document.getElementById("section-title");

    titleEl.innerText = section.name;
    itemsBox.innerHTML = "";
    detailsBox.innerHTML = "";

    section.items.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "check-item";
        itemDiv.innerHTML = `<input type="checkbox" id="c_${item.id}" ${item.ok ? 'checked' : ''}><label for="c_${item.id}">${item.label}</label>`;
        itemsBox.appendChild(itemDiv);

        const detailDiv = document.createElement("div");
        detailDiv.className = "detail-item";
        detailDiv.innerHTML = `
            <b>К пункту: ${item.label}</b>
            <textarea id="n_${item.id}" placeholder="Комментарий...">${item.note}</textarea>
            <input type="file" accept="image/*" onchange="handleFile(this, '${item.id}')">
            <div id="p_${item.id}">${item.img ? `<img src="${item.img}" width="70" style="margin-top:5px;">` : ''}</div>
        `;
        detailsBox.appendChild(detailDiv);
    });
    updateNav();
}

async function handleFile(input, id) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const b64 = e.target.result;
            DATA.checklists.forEach(s => s.items.forEach(i => { if(i.id === id) i.img = b64; }));
            document.getElementById(`p_${id}`).innerHTML = `<img src="${b64}" width="70" style="margin-top:5px;">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
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

function updateNav() {
    const isFirst = currentSectionIndex === 0;
    const isLast = currentSectionIndex === DATA.checklists.length - 1;
    document.getElementById("btn-prev").style.display = isFirst ? "none" : "block";
    document.getElementById("btn-next").style.display = isLast ? "none" : "block";
    document.getElementById("btn-finish").classList.toggle("hidden", !isLast);
}

function finishInspection() {
    saveState();
    buildReport();
    saveToLocalStorage();
    show("screen-report");
    initSignature();
}

function buildReport() {
    const container = document.getElementById("report-data");
    container.innerHTML = "";
    DATA.checklists.forEach(section => {
        const sDiv = document.createElement("div");
        sDiv.innerHTML = `<h3 style="color:var(--red); border-bottom:1px solid #eee; margin-top:20px;">${section.name}</h3>`;
        section.items.forEach(item => {
            sDiv.innerHTML += `
                <div style="margin-bottom:10px; border-bottom:1px solid #f0f0f0; padding-bottom:5px;">
                    <p style="margin:5px 0;"><b>${item.label}</b></p>
                    <div class="flex-row"><div class="box">${item.ok ? 'X' : ''}</div><span style="font-size:14px;">Статус: ${item.ok ? 'OK' : 'Нарушение'}</span></div>
                    <p style="font-size:13px; margin:5px 0;">Коммент: ${item.note || '-'}</p>
                    ${item.img ? `<img src="${item.img}" style="max-width:200px; display:block; margin:5px 0;">` : ''}
                </div>`;
        });
        container.appendChild(sDiv);
    });
    document.getElementById("r_fio").innerText = document.getElementById("fio").value;
    document.getElementById("r_license").innerText = document.getElementById("license").value;
    document.getElementById("r_instructor").innerText = document.getElementById("instructor").value;
    document.getElementById("r_date").innerText = DATA.savedDate || new Date().toLocaleString();
    document.getElementById("r_mode").innerText = currentMode.toUpperCase();
}

function saveToLocalStorage() {
    const history = JSON.parse(localStorage.getItem("checkride_history_v5") || "[]");
    const canvas = document.getElementById("signature");
    const entry = {
        fio: document.getElementById("fio").value,
        license: document.getElementById("license").value,
        instructor: document.getElementById("instructor").value,
        date: new Date().toLocaleString(),
        mode: currentMode,
        fullData: JSON.parse(JSON.stringify(DATA)), // Глубокое сохранение
        signature: canvas ? canvas.toDataURL() : null
    };
    history.unshift(entry);
    localStorage.setItem("checkride_history_v5", JSON.stringify(history.slice(0, 25)));
}

function showHistory() {
    const history = JSON.parse(localStorage.getItem("checkride_history_v5") || "[]");
    const box = document.getElementById("historyList");
    box.innerHTML = history.length ? history.map((h, i) => `
        <div class="history-card" onclick="viewSavedReport(${i})">
            <b>${h.fio}</b> <small>(${h.mode.toUpperCase()})</small><br>
            <small>${h.date} | Инстр: ${h.instructor}</small>
        </div>
    `).join("") : "История пуста";
    show("screen-history");
}

function viewSavedReport(index) {
    const history = JSON.parse(localStorage.getItem("checkride_history_v5") || "[]");
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
    placeholder.innerHTML = `<img src="${saved.signature}" style="width:250px; border-bottom:1px solid #000;">`;
    canvas.style.display = "none";
    show("screen-report");
}

function clearHistory() {
    if(confirm("Удалить всю историю проверок?")) {
        localStorage.removeItem("checkride_history_v5");
        showHistory();
    }
}

function exportPDF() {
    const canvas = document.getElementById("signature");
    const placeholder = document.getElementById("sig-image-placeholder");
    if (canvas.style.display !== "none") {
        placeholder.innerHTML = `<img src="${canvas.toDataURL()}" style="width:250px; border-bottom:1px solid #000;">`;
        canvas.style.display = "none";
    }
    const element = document.getElementById("report-content");
    html2pdf().set({
        margin: 10, filename: 'Report.pdf',
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save();
}

function initSignature() {
    const canvas = document.getElementById("signature");
    const ctx = canvas.getContext("2d");
    const placeholder = document.getElementById("sig-image-placeholder");
    canvas.style.display = "block"; placeholder.innerHTML = "";
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
    document.getElementById(id).classList.remove('hidden');
    window.scrollTo(0,0);
}

function resetApp() { location.reload(); }
