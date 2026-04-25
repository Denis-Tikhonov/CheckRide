let DATA = null;
let currentMode = 'line';
let currentSectionIndex = 0;

function setMode(mode) {
    currentMode = mode;
    document.getElementById('btn-line').classList.toggle('active', mode === 'line');
    document.getElementById('btn-ffs').classList.toggle('active', mode === 'ffs');
}

async function startInspection() {
    if (!document.getElementById("fio").value) return alert("Введите ФИО");
    const file = currentMode === 'line' ? 'data.json' : 'data_ffs.json';
    
    try {
        const response = await fetch(file);
        DATA = await response.json();
        
        // Подготовка данных
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
    document.getElementById("section-title").innerText = section.name;
    
    const itemsBox = document.getElementById("checklist-items");
    const detailsBox = document.getElementById("checklist-details");
    
    itemsBox.innerHTML = "";
    detailsBox.innerHTML = "";

    section.items.forEach(item => {
        // 1. Создаем строку чекбокса
        const itemDiv = document.createElement("div");
        itemDiv.className = "check-item";
        itemDiv.innerHTML = `
            <input type="checkbox" id="c_${item.id}" ${item.ok ? 'checked' : ''}>
            <label for="c_${item.id}">${item.label}</label>
        `;
        itemsBox.appendChild(itemDiv);

        // 2. Создаем блок комментариев (внизу)
        const detailDiv = document.createElement("div");
        detailDiv.className = "detail-item";
        detailDiv.innerHTML = `
            <b>Инфо к: ${item.label}</b>
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

async function uploadImg(input, id) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const b64 = e.target.result;
            // Сохраняем в DATA
            DATA.checklists.forEach(s => s.items.forEach(i => {
                if(i.id === id) i.img = b64;
            }));
            document.getElementById(`p_${id}`).innerHTML = `<img src="${b64}" width="80">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function saveState() {
    const section = DATA.checklists[currentSectionIndex];
    section.items.forEach(item => {
        item.ok = document.getElementById(`c_${item.id}`).checked;
        item.note = document.getElementById(`n_${item.id}`).value;
    });
}

function nextSection() { saveState(); currentSectionIndex++; renderSection(); }
function prevSection() { saveState(); currentSectionIndex--; renderSection(); }

function updateNavButtons() {
    const isLast = currentSectionIndex === DATA.checklists.length - 1;
    document.getElementById("btn-prev").style.display = currentSectionIndex === 0 ? "none" : "block";
    document.getElementById("btn-next").style.display = isLast ? "none" : "block";
    document.getElementById("btn-finish").classList.toggle("hidden", !isLast);
}

function finishInspection() {
    saveState();
    const container = document.getElementById("report-data");
    container.innerHTML = "";

    DATA.checklists.forEach(section => {
        const sDiv = document.createElement("div");
        sDiv.className = "rep-sec";
        sDiv.innerHTML = `<h3 style="margin:10px 0; color:var(--red);">${section.name}</h3>`;
        section.items.forEach(item => {
            sDiv.innerHTML += `
                <div style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:5px;">
                    <p style="margin:5px 0;"><b>${item.label}</b></p>
                    <div class="flex-row">
                        <span class="box">${item.ok ? 'X' : ''}</span>
                        <span>Статус: ${item.ok ? 'OK' : 'Нарушение'}</span>
                    </div>
                    <p style="margin:5px 0; font-size:14px;">Коммент: ${item.note || '-'}</p>
                    ${item.img ? `<img src="${item.img}" style="max-width:200px; display:block; margin-top:5px;">` : ''}
                </div>`;
        });
        container.appendChild(sDiv);
    });

    document.getElementById("r_fio").innerText = document.getElementById("fio").value;
    document.getElementById("r_license").innerText = document.getElementById("license").value;
    document.getElementById("r_date").innerText = new Date().toLocaleString();
    document.getElementById("r_mode").innerText = currentMode.toUpperCase();

    // Сохранение в историю (LocalStorage)
    saveToLocalStorage();
    
    show("screen-report");
    initSignature();
}

function saveToLocalStorage() {
    const history = JSON.parse(localStorage.getItem("inspections") || "[]");
    const entry = {
        fio: document.getElementById("fio").value,
        date: new Date().toLocaleString(),
        mode: currentMode.toUpperCase()
    };
    history.unshift(entry);
    localStorage.setItem("inspections", JSON.stringify(history.slice(0, 20)));
}

function showHistory() {
    const history = JSON.parse(localStorage.getItem("inspections") || "[]");
    const box = document.getElementById("historyList");
    box.innerHTML = history.length ? history.map(h => `
        <div style="padding:10px; border-bottom:1px solid #ddd;">
            <b>${h.fio}</b> (${h.mode})<br><small>${h.date}</small>
        </div>
    `).join("") : "История пуста";
    show("screen-history");
}

function exportPDF() {
    const canvas = document.getElementById("signature");
    const placeholder = document.getElementById("sig-image-placeholder");
    
    // Подготовка подписи
    placeholder.innerHTML = `<img src="${canvas.toDataURL()}" style="width:250px; border-bottom:1px solid #000;">`;
    canvas.style.display = "none";

    const element = document.getElementById("report-content");
    const opt = {
        margin: 10,
        filename: 'CheckReport.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        canvas.style.display = "block";
        placeholder.innerHTML = "";
    });
}

function initSignature() {
    const canvas = document.getElementById("signature");
    const ctx = canvas.getContext("2d");
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
