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
    const mainSection = DATA.checklists[currentSectionIndex];
    const itemsBox = document.getElementById("checklist-items");
    const detailsBox = document.getElementById("checklist-details");
    const titleEl = document.getElementById("section-title");

    titleEl.innerText = mainSection.name;
    itemsBox.innerHTML = "";
    detailsBox.innerHTML = "";

    mainSection.sections.forEach(sec => {
        // Добавляем подзаголовок (subname)
        const subHeader = document.createElement("h3");
        subHeader.className = "subname-title";
        subHeader.innerText = sec.subname;
        itemsBox.appendChild(subHeader);

        sec.items.forEach(item => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "item-container";

            if (item.type === "checkbox") {
                itemDiv.innerHTML = `
                    <div class="check-item">
                        <input type="checkbox" id="c_${item.id}" ${item.ok ? 'checked' : ''}>
                        <label for="c_${item.id}">${item.label}</label>
                    </div>`;
            } else if (item.type === "radio") {
                let radioOptions = item.options.map((opt, idx) => `
                    <label class="radio-option">
                        <input type="radio" name="r_${item.id}" value="${opt}" ${item.ok === opt ? 'checked' : ''}>
                        <span>${opt}</span>
                    </label>
                `).join("");
                
                itemDiv.innerHTML = `
                    <div class="radio-group">
                        <p class="radio-label"><b>${item.label}</b></p>
                        ${radioOptions}
                    </div>`;
            }

            itemsBox.appendChild(itemDiv);

            // Создаем блок деталей (комментарий + фото)
            const detailDiv = document.createElement("div");
            detailDiv.className = "detail-item";
            detailDiv.innerHTML = `
                <b style="font-size:11px; color:var(--dark-grey);">${item.label}</b>
                <textarea id="n_${item.id}" placeholder="Комментарий...">${item.note || ''}</textarea>
                <input type="file" accept="image/*" onchange="handleFile(this, '${item.id}')">
                <div id="p_${item.id}">${item.img ? `<img src="${item.img}" width="70">` : ''}</div>
            `;
            detailsBox.appendChild(detailDiv);
        });
    });
    updateNav();
}

function saveState() {
    const mainSection = DATA.checklists[currentSectionIndex];
    mainSection.sections.forEach(sec => {
        sec.items.forEach(item => {
            if (item.type === "checkbox") {
                const cb = document.getElementById(`c_${item.id}`);
                if (cb) item.ok = cb.checked;
            } else if (item.type === "radio") {
                const selected = document.querySelector(`input[name="r_${item.id}"]:checked`);
                item.ok = selected ? selected.value : false;
            }
            const nt = document.getElementById(`n_${item.id}`);
            if (nt) item.note = nt.value;
        });
    });
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
    if (!container) return;
    
    container.innerHTML = "";

    // 1. Проходим по всем главным экранам (Preflight, Takeoff и т.д.)
    DATA.checklists.forEach(mainSec => {
        const mainTitle = document.createElement("h2");
        mainTitle.style.color = "var(--red)";
        mainTitle.style.marginTop = "25px";
        mainTitle.style.borderBottom = "2px solid var(--red)";
        mainTitle.style.paddingBottom = "5px";
        mainTitle.innerText = mainSec.name;
        container.appendChild(mainTitle);

        // 2. Проходим по подразделам (Стандартные процедуры, Компетенции и т.д.)
        mainSec.sections.forEach(sec => {
            if (sec.items.length > 0) { // Показываем заголовок, только если в секции есть пункты
                const subTitle = document.createElement("h3");
                subTitle.style.background = "#f4f4f4";
                subTitle.style.padding = "5px 10px";
                subTitle.style.margin = "15px 0 10px 0";
                subTitle.style.fontSize = "16px";
                subTitle.innerText = sec.subname;
                container.appendChild(subTitle);
            }

            // 3. Проходим по конкретным пунктам
            sec.items.forEach(item => {
                const itemDiv = document.createElement("div");
                itemDiv.style.marginBottom = "12px";
                itemDiv.style.paddingBottom = "8px";
                itemDiv.style.borderBottom = "1px solid #f0f0f0";

                let resultHtml = "";
                
                // Обработка чекбоксов (как было раньше)
                if (item.type === "checkbox") {
                    resultHtml = `
                        <div class="flex-row">
                            <div class="box">${item.ok ? 'X' : ''}</div>
                            <span style="font-size:14px; margin-left:8px;">Статус: ${item.ok ? 'OK' : 'Нарушение'}</span>
                        </div>`;
                } 
                // Обработка радио-кнопок (выбранная опция)
                else if (item.type === "radio") {
                    resultHtml = `
                        <div style="font-size:14px; color: var(--black); margin: 5px 0;">
                            <b>Выбрано:</b> ${item.ok ? item.ok : '<span style="color:red;">Не выбрано</span>'}
                        </div>`;
                }

                itemDiv.innerHTML = `
                    <p style="margin: 5px 0; font-size: 15px;"><b>${item.label}</b></p>
                    ${resultHtml}
                    <p style="font-size:13px; margin:5px 0; color:#555;"><i>Комментарий:</i> ${item.note || '-'}</p>
                    ${item.img ? `<img src="${item.img}" style="max-width:250px; display:block; margin:10px 0; border-radius:4px;">` : ''}
                `;
                container.appendChild(itemDiv);
            });
        });
    });

    // 4. Заполняем мета-данные (ФИО, Лицензия и т.д.) в шапке отчета
    const metaMap = {
        "r_fio": "fio",
        "r_license": "license",
        "r_instructor": "instructor"
    };

    for (let [reportId, inputId] of Object.entries(metaMap)) {
        const el = document.getElementById(reportId);
        if (el) el.innerText = document.getElementById(inputId).value;
    }

    const rDat = document.getElementById("r_date");
    const rMod = document.getElementById("r_mode");

    if (rDat) rDat.innerText = DATA.savedDate || new Date().toLocaleString();
    if (rMod) rMod.innerText = currentMode.toUpperCase();
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
