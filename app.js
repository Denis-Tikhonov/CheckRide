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

        DATA.checklists.forEach(mainSec => {
            mainSec.sections.forEach(sec => {
                sec.items.forEach(i => {
                    i.ok = (i.type === "radio") ? false : false; 
                    i.note = ""; 
                    i.img = null;
                });
            });
        });

        currentSectionIndex = 0;
        renderSection();
        show('screen-test');
    } catch (e) { alert("Ошибка загрузки данных. Проверьте JSON."); }
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
                let radioOptions = item.options.map((opt) => `
                    <label class="radio-option">
                        <input type="radio" name="r_${item.id}" value="${opt}" ${item.ok === opt ? 'checked' : ''}>
                        <span>${opt}</span>
                    </label>
                `).join("");
                
                itemDiv.innerHTML = `<div class="radio-group"><p class="radio-label"><b>${item.label}</b></p>${radioOptions}</div>`;
            }
            itemsBox.appendChild(itemDiv);

            const detailDiv = document.createElement("div");
            detailDiv.className = "detail-item";
            detailDiv.innerHTML = `
                <b style="font-size:11px; color:var(--dark-grey);">${item.label}</b>
                <textarea id="n_${item.id}" placeholder="Комментарий...">${item.note || ''}</textarea>
                <input type="file" accept="image/*" onchange="handleFile(this, '${item.id}')">
                <div id="p_${item.id}">${item.img ? `<img src="${item.img}" width="70" style="margin-top:5px;">` : ''}</div>
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
            DATA.checklists.forEach(m => m.sections.forEach(s => s.items.forEach(i => {
                if(i.id === id) i.img = b64;
            })));
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
    container.innerHTML = "";
    DATA.checklists.forEach(mainSec => {
        const mainTitle = document.createElement("h2");
        mainTitle.style.cssText = "color:var(--red); margin-top:25px; border-bottom:2px solid var(--red); padding-bottom:5px;";
        mainTitle.innerText = mainSec.name;
        container.appendChild(mainTitle);

        mainSec.sections.forEach(sec => {
            if (sec.items.length > 0) {
                const subTitle = document.createElement("h3");
                subTitle.style.cssText = "background:#f4f4f4; padding:5px 10px; margin:15px 0 10px 0; font-size:16px; border-left:4px solid var(--red);";
                subTitle.innerText = sec.subname;
                container.appendChild(subTitle);
            }
            sec.items.forEach(item => {
                const itemDiv = document.createElement("div");
                itemDiv.style.cssText = "margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #f0f0f0;";
                let res = item.type === "checkbox" ? 
                    `<div class="flex-row"><div class="box">${item.ok ? 'X' : ''}</div><span style="font-size:14px; margin-left:8px;">Статус: ${item.ok ? 'OK' : 'Нарушение'}</span></div>` :
                    `<div style="font-size:14px; margin:5px 0;"><b>Выбрано:</b> ${item.ok || 'Не выбрано'}</div>`;

                itemDiv.innerHTML = `<p style="margin:5px 0;"><b>${item.label}</b></p>${res}<p style="font-size:13px; color:#555;">Коммент: ${item.note || '-'}</p>${item.img ? `<img src="${item.img}" style="max-width:300px; display:block; margin-top:10px;">` : ''}`;
                container.appendChild(itemDiv);
            });
        });
    });
    document.getElementById("r_fio").innerText = document.getElementById("fio").value;
    document.getElementById("r_license").innerText = document.getElementById("license").value;
    document.getElementById("r_instructor").innerText = document.getElementById("instructor").value;
    document.getElementById("r_date").innerText = DATA.savedDate || new Date().toLocaleString();
    document.getElementById("r_mode").innerText = currentMode.toUpperCase();
}

function exportPDF() {
    const btn = document.getElementById("pdf-btn");
    const canvas = document.getElementById("signature");
    const placeholder = document.getElementById("sig-image-placeholder");

    btn.innerText = "Генерация...";
    btn.disabled = true;

    if (canvas.style.display !== "none") {
        placeholder.innerHTML = `<img src="${canvas.toDataURL()}" style="width:250px; border-bottom:1px solid #000;">`;
        canvas.style.display = "none";
    }

    const element = document.getElementById("report-content");
    const opt = {
        margin: 5,
        filename: 'Report.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    setTimeout(() => {
        html2pdf().set(opt).from(element).save().then(() => {
            btn.innerText = "Скачать PDF";
            btn.disabled = false;
        }).catch(err => {
            alert("Ошибка PDF: " + err);
            btn.disabled = false;
        });
    }, 500);
}

// Новая функция: Отправка по почте
function sendEmail() {
    const fio = document.getElementById("fio").value;
    const instructor = document.getElementById("instructor").value;
    const date = document.getElementById("r_date").innerText;
    const mode = currentMode.toUpperCase();

    let body = `ОТЧЕТ ПО ПРОВЕРКЕ\n`;
    body += `---------------------------\n`;
    body += `Проверяемый: ${fio}\n`;
    body += `Инструктор: ${instructor}\n`;
    body += `Дата: ${date}\n`;
    body += `Режим: ${mode}\n\n`;

    DATA.checklists.forEach(mainSec => {
        body += `=== ${mainSec.name.toUpperCase()} ===\n`;
        mainSec.sections.forEach(sec => {
            if (sec.items.length > 0) body += `[${sec.subname}]\n`;
            sec.items.forEach(item => {
                const status = item.type === "checkbox" ? (item.ok ? "OK" : "НАРУШЕНИЕ") : (item.ok || "Не выбрано");
                body += `- ${item.label}: ${status}\n`;
                if (item.note) body += `  Комментарий: ${item.note}\n`;
            });
            body += `\n`;
        });
    });

    const subject = encodeURIComponent(`Отчет CheckRide: ${fio} - ${date}`);
    const mailBody = encodeURIComponent(body);
    
    window.location.href = `mailto:?subject=${subject}&body=${mailBody}`;
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
        fullData: JSON.parse(JSON.stringify(DATA)),
        signature: canvas ? canvas.toDataURL() : null
    };
    history.unshift(entry);
    localStorage.setItem("checkride_history_v5", JSON.stringify(history.slice(0, 25)));
}

function showHistory() {
    const history = JSON.parse(localStorage.getItem("checkride_history_v5") || "[]");
    const box = document.getElementById("historyList");
    box.innerHTML = history.length ? history.map((h, i) => `
        <div class="history-card" onclick="viewSavedReport(${i})"><b>${h.fio}</b> <small>(${h.mode.toUpperCase()})</small><br><small>${h.date}</small></div>
    `).join("") : "История пуста";
    show("screen-history");
}

function viewSavedReport(index) {
    const history = JSON.parse(localStorage.getItem("checkride_history_v5") || "[]");
    const saved = history[index];
    document.getElementById("fio").value = saved.fio;
    document.getElementById("license").value = saved.license;
    document.getElementById("instructor").value = saved.instructor;
    currentMode = saved.mode; DATA = saved.fullData; DATA.savedDate = saved.date;
    buildReport();
    const placeholder = document.getElementById("sig-image-placeholder");
    const canvas = document.getElementById("signature");
    placeholder.innerHTML = `<img src="${saved.signature}" style="width:250px; border-bottom:1px solid #000;">`;
    canvas.style.display = "none";
    show("screen-report");
}

function clearHistory() { if(confirm("Очистить?")) { localStorage.removeItem("checkride_history_v5"); showHistory(); } }

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