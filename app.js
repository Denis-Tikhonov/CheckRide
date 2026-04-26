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

        // Инициализация структуры
        DATA.checklists.forEach(mainSec => {
            mainSec.sections.forEach(sec => {
                // Комментарий и фото теперь на уровне СЕКЦИИ
                sec.note = "";
                sec.img = null;
                sec.items.forEach(i => {
                    i.ok = (i.type === "radio") ? null : false; 
                });
            });
        });

        currentSectionIndex = 0;
        renderSection();
        show('screen-test');
    } catch (e) { alert("Ошибка загрузки данных."); }
}

function renderSection() {
    const mainSection = DATA.checklists[currentSectionIndex];
    const itemsBox = document.getElementById("checklist-items");
    const detailsBox = document.getElementById("checklist-details"); // Теперь не используется отдельно, детали внутри itemsBox
    const titleEl = document.getElementById("section-title");

    titleEl.innerText = mainSection.name;
    itemsBox.innerHTML = "";

    mainSection.sections.forEach((sec, secIdx) => {
        // Заголовок подраздела
        const subHeader = document.createElement("h3");
        subHeader.className = "subname-title";
        subHeader.innerText = sec.subname;
        itemsBox.appendChild(subHeader);

        // Пункты подраздела
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
        });

        // ОДИН блок комментариев на весь подраздел (Subname)
        const detailDiv = document.createElement("div");
        detailDiv.className = "detail-item";
        detailDiv.innerHTML = `
            <b style="color:var(--red);">Комментарии к разделу: ${sec.subname}</b>
            <textarea id="sec_n_${currentSectionIndex}_${secIdx}" placeholder="Общий комментарий к блоку...">${sec.note || ''}</textarea>
            <input type="file" accept="image/*" onchange="handleSectionFile(this, ${currentSectionIndex}, ${secIdx})">
            <div id="sec_p_${currentSectionIndex}_${secIdx}">${sec.img ? `<img src="${sec.img}" width="100" style="margin-top:5px;">` : ''}</div>
        `;
        itemsBox.appendChild(detailDiv);
    });
    updateNav();
}

function saveState() {
    const mainSection = DATA.checklists[currentSectionIndex];
    mainSection.sections.forEach((sec, secIdx) => {
        // Сохраняем состояние пунктов
        sec.items.forEach(item => {
            if (item.type === "checkbox") {
                const cb = document.getElementById(`c_${item.id}`);
                if (cb) item.ok = cb.checked;
            } else if (item.type === "radio") {
                const selected = document.querySelector(`input[name="r_${item.id}"]:checked`);
                item.ok = selected ? selected.value : null;
            }
        });
        // Сохраняем общий комментарий секции
        const nt = document.getElementById(`sec_n_${currentSectionIndex}_${secIdx}`);
        if (nt) sec.note = nt.value;
    });
}

async function handleSectionFile(input, mainIdx, secIdx) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const b64 = e.target.result;
            DATA.checklists[mainIdx].sections[secIdx].img = b64;
            document.getElementById(`sec_p_${mainIdx}_${secIdx}`).innerHTML = `<img src="${b64}" width="100" style="margin-top:5px;">`;
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
    window.scrollTo(0,0);
}

function finishInspection() {
    saveState();
    buildReport();
    saveToLocalStorage();
    show("screen-report");
    initSignature();
}

// --- ЛОГИКА РАСЧЕТА ОЦЕНОК ---
function calculateRatings() {
    let totalPilotingScores = [];
    let reportHtml = `<div class="rating-summary"><h3>Результаты оценки:</h3>`;

    DATA.checklists.forEach(mainSec => {
        let namePilotingScores = [];
        let nameViolations = 0;
        let hasPiloting = false;

        mainSec.sections.forEach(sec => {
            sec.items.forEach(item => {
                if (item.type === "radio") {
                    hasPiloting = true;
                    let score = 2; // По умолчанию, если не выбран
                    if (item.ok) {
                        const idx = item.options.indexOf(item.ok);
                        score = 5 - idx; // 0->5, 1->4, 2->3...
                        if (score < 2) score = 2;
                    }
                    namePilotingScores.push(score);
                } else if (item.type === "checkbox") {
                    if (!item.ok) nameViolations++;
                }
            });
        });

        // Расчет Техники для конкретного name
        let namePilotingResult = "-";
        if (hasPiloting) {
            if (namePilotingScores.includes(2)) {
                namePilotingResult = 2;
            } else {
                const avg = namePilotingScores.reduce((a, b) => a + b, 0) / namePilotingScores.length;
                namePilotingResult = Math.round(avg);
            }
            totalPilotingScores.push(namePilotingResult);
        }

        reportHtml += `
            <div style="margin-bottom:10px; border-left:3px solid var(--red); padding-left:10px;">
                <b>${mainSec.name}</b><br>
                ${hasPiloting ? `Техника пилотирования: <span class="score-val">${namePilotingResult}</span><br>` : ""}
                Стандартные процедуры: <span class="score-val">${nameViolations} замеч.</span>
            </div>`;
    });

    // Итоговая оценка по Технике Пилотирования
    let finalPiloting = "-";
    if (totalPilotingScores.length > 0) {
        if (totalPilotingScores.includes(2)) finalPiloting = 2;
        else {
            const finalAvg = totalPilotingScores.reduce((a, b) => a + b, 0) / totalPilotingScores.length;
            finalPiloting = Math.round(finalAvg);
        }
    }

    reportHtml += `<hr>
        <p><b>Итоговая техника пилотирования: <span class="score-val">${finalPiloting}</span></b></p>
        <p><b>Компетенции:</b> <span style="color:grey;">В разработке...</span></p>
    </div>`;

    return reportHtml;
}

function buildReport() {
    const container = document.getElementById("report-data");
    container.innerHTML = "";

    // Вставляем блок оценок в начало
    container.innerHTML = calculateRatings();

    DATA.checklists.forEach(mainSec => {
        const mainTitle = document.createElement("h2");
        mainTitle.style.cssText = "color:var(--red); margin-top:25px; border-bottom:2px solid var(--red); padding-bottom:5px;";
        mainTitle.innerText = mainSec.name;
        container.appendChild(mainTitle);

        mainSec.sections.forEach(sec => {
            const sDiv = document.createElement("div");
            sDiv.innerHTML = `<h3 style="background:#f4f4f4; padding:5px 10px; margin:15px 0 5px 0; font-size:16px;">${sec.subname}</h3>`;
            
            sec.items.forEach(item => {
                let res = item.type === "checkbox" ? 
                    `<div class="flex-row"><div class="box">${item.ok ? 'X' : ''}</div><span>Статус: ${item.ok ? 'OK' : 'Нарушение'}</span></div>` :
                    `<div style="font-size:14px; margin:5px 0;"><b>Выбрано:</b> ${item.ok || 'Не выбрано'}</div>`;
                sDiv.innerHTML += `<div style="margin-bottom:8px; border-bottom:1px solid #f0f0f0;"><p style="margin:5px 0;"><b>${item.label}</b></p>${res}</div>`;
            });

            // Вывод ОБЩЕГО комментария подраздела в отчет
            if (sec.note || sec.img) {
                sDiv.innerHTML += `
                    <div style="background:#fff9f9; padding:8px; margin-top:5px; border:1px solid #ffebeb;">
                        ${sec.note ? `<p style="font-size:13px; margin:0;"><b>Комментарий раздела:</b> ${sec.note}</p>` : ""}
                        ${sec.img ? `<img src="${sec.img}" style="max-width:250px; display:block; margin-top:5px;">` : ""}
                    </div>`;
            }
            container.appendChild(sDiv);
        });
    });

    document.getElementById("r_fio").innerText = document.getElementById("fio").value;
    document.getElementById("r_license").innerText = document.getElementById("license").value;
    document.getElementById("r_instructor").innerText = document.getElementById("instructor").value;
    document.getElementById("r_date").innerText = DATA.savedDate || new Date().toLocaleString();
    document.getElementById("r_mode").innerText = currentMode.toUpperCase();
}

function saveToLocalStorage() {
    const history = JSON.parse(localStorage.getItem("checkride_history_v6") || "[]");
    const canvas = document.getElementById("signature");
    const entry = {
        fio: document.getElementById("fio").value,
        license: document.getElementById("license").value,
        instructor: document.getElementById("instructor").value,
        date: new Date().toLocaleString(),
        mode: currentMode,
        fullData: JSON.parse(JSON.stringify(DATA)),
        signature: (canvas && canvas.style.display !== 'none') ? canvas.toDataURL() : null
    };
    history.unshift(entry);
    localStorage.setItem("checkride_history_v6", JSON.stringify(history.slice(0, 20)));
}

function showHistory() {
    const history = JSON.parse(localStorage.getItem("checkride_history_v6") || "[]");
    const box = document.getElementById("historyList");
    box.innerHTML = history.length ? history.map((h, i) => `
        <div class="history-card" onclick="viewSavedReport(${i})">
            <b>${h.fio}</b> <small>(${h.mode.toUpperCase()})</small><br>
            <small>${h.date}</small>
        </div>
    `).join("") : "История пуста";
    show("screen-history");
}

function viewSavedReport(index) {
    const history = JSON.parse(localStorage.getItem("checkride_history_v6") || "[]");
    const saved = history[index];
    document.getElementById("fio").value = saved.fio;
    document.getElementById("instructor").value = saved.instructor;
    currentMode = saved.mode;
    DATA = saved.fullData;
    DATA.savedDate = saved.date;
    buildReport();
    const placeholder = document.getElementById("sig-image-placeholder");
    const canvas = document.getElementById("signature");
    placeholder.innerHTML = saved.signature ? `<img src="${saved.signature}" style="width:250px; border-bottom:1px solid #000;">` : "";
    canvas.style.display = "none";
    show("screen-report");
}

function clearHistory() { if(confirm("Очистить?")) { localStorage.removeItem("checkride_history_v6"); showHistory(); } }

function initSignature() {
    const canvas = document.getElementById("signature");
    if (!canvas) return;
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

function exportPDF() {
    const canvas = document.getElementById("signature");
    const placeholder = document.getElementById("sig-image-placeholder");
    if (canvas && canvas.style.display !== "none") {
        placeholder.innerHTML = `<img src="${canvas.toDataURL()}" style="width:250px; border-bottom:1px solid #000;">`;
        canvas.style.display = "none";
    }
    window.print();
}

function sendEmail() {
    const fio = document.getElementById("fio").value;
    const date = document.getElementById("r_date").innerText;
    const subject = encodeURIComponent(`Отчет CheckRide: ${fio} - ${date}`);
    const body = encodeURIComponent(`Отчет сформирован в приложении. См. печатную версию.`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    window.scrollTo(0,0);
}

function resetApp() { location.reload(); }