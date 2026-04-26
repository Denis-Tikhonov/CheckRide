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

        // Глубокая инициализация полей
        DATA.checklists.forEach(mainSec => {
            mainSec.sections.forEach(sec => {
                sec.note = "";
                sec.img = null;
                // Инициализация внутри новых групп groups
                const groups = sec.groups || [{ items: sec.items || [] }]; 
                groups.forEach(group => {
                    group.items.forEach(i => {
                        i.ok = (i.type === "radio") ? null : false;
                    });
                });
            });
        });

        currentSectionIndex = 0;
        renderSection();
        show('screen-test');
    } catch (e) { console.error(e); alert("Ошибка загрузки данных."); }
}

function renderSection() {
    const mainSection = DATA.checklists[currentSectionIndex];
    const itemsBox = document.getElementById("checklist-items");
    const titleEl = document.getElementById("section-title");

    titleEl.innerText = mainSection.name;
    itemsBox.innerHTML = "";

    mainSection.sections.forEach((sec, secIdx) => {
        // Подзаголовок (Стандартные процедуры / Компетенции)
        const subHeader = document.createElement("h3");
        subHeader.className = "subname-title";
        subHeader.innerText = sec.subname;
        itemsBox.appendChild(subHeader);

        const groups = sec.groups || [{ items: sec.items || [] }];

        groups.forEach(group => {
            // Если есть topitem, рисуем заголовок группы
            if (group.topitem) {
                const topHeader = document.createElement("h4");
                topHeader.className = "topitem-title";
                topHeader.innerText = group.topitem;
                itemsBox.appendChild(topHeader);
            }

            group.items.forEach(item => {
                const itemDiv = document.createElement("div");
                itemDiv.className = "item-container";

                if (item.type === "checkbox") {
                    itemDiv.innerHTML = `<div class="check-item"><input type="checkbox" id="c_${item.id}" ${item.ok ? 'checked' : ''}><label for="c_${item.id}">${item.label}</label></div>`;
                } else if (item.type === "radio") {
                    let radioOptions = item.options.map(opt => `<label class="radio-option"><input type="radio" name="r_${item.id}" value="${opt}" ${item.ok === opt ? 'checked' : ''}><span>${opt}</span></label>`).join("");
                    itemDiv.innerHTML = `<div class="radio-group"><p class="radio-label"><b>${item.label}</b></p>${radioOptions}</div>`;
                }
                itemsBox.appendChild(itemDiv);
            });
        });

        // Блок комментариев на подраздел
        const detailDiv = document.createElement("div");
        detailDiv.className = "detail-item";
        detailDiv.innerHTML = `
            <b style="color:var(--red);">Комментарии к: ${sec.subname}</b>
            <textarea id="sec_n_${currentSectionIndex}_${secIdx}" placeholder="Общий комментарий...">${sec.note || ''}</textarea>
            <input type="file" accept="image/*" onchange="handleSectionFile(this, ${currentSectionIndex}, ${secIdx})">
            <div id="sec_p_${currentSectionIndex}_${secIdx}">${sec.img ? `<img src="${sec.img}" width="100">` : ''}</div>`;
        itemsBox.appendChild(detailDiv);
    });
    updateNav();
}

function saveState() {
    const mainSection = DATA.checklists[currentSectionIndex];
    mainSection.sections.forEach((sec, secIdx) => {
        const groups = sec.groups || [{ items: sec.items || [] }];
        groups.forEach(group => {
            group.items.forEach(item => {
                if (item.type === "checkbox") {
                    const cb = document.getElementById(`c_${item.id}`);
                    if (cb) item.ok = cb.checked;
                } else if (item.type === "radio") {
                    const selected = document.querySelector(`input[name="r_${item.id}"]:checked`);
                    item.ok = selected ? selected.value : null;
                }
            });
        });
        const nt = document.getElementById(`sec_n_${currentSectionIndex}_${secIdx}`);
        if (nt) sec.note = nt.value;
    });
}

function calculateRatings() {
    let reportHtml = `<div class="rating-summary"><h3>Сводная оценка</h3>`;
    
    // 1. ТЕХНИКА И ПРОЦЕДУРЫ
    DATA.checklists.forEach(mainSec => {
        let namePilotingScores = [];
        let nameViolations = 0;
        let hasPiloting = false;

        mainSec.sections.forEach(sec => {
            const groups = sec.groups || [{ items: sec.items || [] }];
            groups.forEach(group => {
                group.items.forEach(item => {
                    if (item.type === "radio") {
                        hasPiloting = true;
                        let score = item.ok ? (5 - item.options.indexOf(item.ok)) : 2;
                        if (score < 2) score = 2;
                        namePilotingScores.push(score);
                    } else if (item.type === "checkbox" && sec.subname !== "Компетенции.") {
                        if (!item.ok) nameViolations++;
                    }
                });
            });
        });

        let pilotingResult = "-";
        if (hasPiloting) {
            pilotingResult = namePilotingScores.includes(2) ? 2 : Math.round(namePilotingScores.reduce((a,b)=>a+b,0)/namePilotingScores.length);
        }

        reportHtml += `<div class="rating-block"><b>${mainSec.name}</b><br>
            ${hasPiloting ? `Техника: <span class="score-val">${pilotingResult}</span> | ` : ""}
            Процедуры: <span class="score-val">${nameViolations} нар.</span></div>`;
    });

    // 2. КОМПЕТЕНЦИИ
    let compData = {}; 
    DATA.checklists.forEach(mainSec => {
        mainSec.sections.forEach(sec => {
            if (sec.subname === "Компетенции." && sec.groups) {
                sec.groups.forEach(group => {
                    const topName = group.topitem || "Общие";
                    if (!compData[topName]) compData[topName] = {};
                    group.items.forEach(item => {
                        if (!compData[topName][item.label]) compData[topName][item.label] = { ok: 0, total: 0 };
                        compData[topName][item.label].total++;
                        if (item.ok) compData[topName][item.label].ok++;
                    });
                });
            }
        });
    });

    reportHtml += `<hr><h4>Компетенции</h4>`;
    Object.keys(compData).forEach(topName => {
        let groupItemScores = [];
        Object.keys(compData[topName]).forEach(label => {
            const stats = compData[topName][label];
            const percent = (stats.ok / stats.total) * 100;
            let score = 2;
            if (percent > 90) score = 5;
            else if (percent >= 81) score = 4;
            else if (percent >= 71) score = 3;
            groupItemScores.push(score);
        });
        const groupAvg = groupItemScores.length ? Math.round(groupItemScores.reduce((a,b)=>a+b,0)/groupItemScores.length) : "-";
        reportHtml += `<p>${topName} <span class="score-val">${groupAvg}</span></p>`;
    });

    reportHtml += `</div>`;
    return reportHtml;
}

function buildReport() {
    const container = document.getElementById("report-data");
    container.innerHTML = calculateRatings();

    DATA.checklists.forEach(mainSec => {
        const title = document.createElement("h2");
        title.className = "report-main-title";
        title.innerText = mainSec.name;
        container.appendChild(title);

        mainSec.sections.forEach(sec => {
            const sDiv = document.createElement("div");
            sDiv.innerHTML = `<h3 class="report-subname">${sec.subname}</h3>`;
            const groups = sec.groups || [{ items: sec.items || [] }];
            
            groups.forEach(group => {
                if(group.topitem) sDiv.innerHTML += `<h4 class="report-topitem">${group.topitem}</h4>`;
                group.items.forEach(item => {
                    let res = item.type === "checkbox" ? 
                        `<div class="flex-row"><div class="box">${item.ok ? 'X' : ''}</div><span>${item.ok ? 'OK' : 'Нарушение'}</span></div>` :
                        `<div style="font-size:14px;"><b>Выбрано:</b> ${item.ok || 'Не выбрано'}</div>`;
                    sDiv.innerHTML += `<div class="report-item-row"><p>${item.label}</p>${res}</div>`;
                });
            });

            if (sec.note || sec.img) {
                sDiv.innerHTML += `<div class="report-comment">${sec.note || ''}${sec.img ? `<img src="${sec.img}" class="report-img">` : ""}</div>`;
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

async function handleSectionFile(input, mainIdx, secIdx) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            DATA.checklists[mainIdx].sections[secIdx].img = e.target.result;
            document.getElementById(`sec_p_${mainIdx}_${secIdx}`).innerHTML = `<img src="${e.target.result}" width="100">`;
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

function saveToLocalStorage() {
    const history = JSON.parse(localStorage.getItem("checkride_history_v7") || "[]");
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
    localStorage.setItem("checkride_history_v7", JSON.stringify(history.slice(0, 20)));
}

function showHistory() {
    const history = JSON.parse(localStorage.getItem("checkride_history_v7") || "[]");
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
    const history = JSON.parse(localStorage.getItem("checkride_history_v7") || "[]");
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
    placeholder.innerHTML = saved.signature ? `<img src="${saved.signature}" style="width:250px; border-bottom:1px solid #000;">` : "";
    canvas.style.display = "none";
    show("screen-report");
}

function clearHistory() { if(confirm("Очистить историю?")) { localStorage.removeItem("checkride_history_v7"); showHistory(); } }

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
        return { x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left, y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top };
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

// ИСПРАВЛЕННАЯ ФУНКЦИЯ: Формирование отчета для Email
function sendEmail() {
    const fio = document.getElementById("fio").value;
    const instructor = document.getElementById("instructor").value;
    const date = document.getElementById("r_date").innerText;
    const mode = currentMode.toUpperCase();

    let text = `ОТЧЕТ ПО ПРОВЕРКЕ\n`;
    text += `---------------------------\n`;
    text += `Проверяемый: ${fio}\n`;
    text += `Инструктор: ${instructor}\n`;
    text += `Режим: ${mode}\n`;
    text += `Дата: ${date}\n\n`;

    text += `СВОДНАЯ ОЦЕНКА:\n`;
    DATA.checklists.forEach(mainSec => {
        let pilScores = [];
        let violations = 0;
        let hasPil = false;

        mainSec.sections.forEach(sec => {
            const groups = sec.groups || [{ items: sec.items || [] }];
            groups.forEach(g => g.items.forEach(item => {
                if (item.type === "radio") {
                    hasPil = true;
                    let s = item.ok ? (5 - item.options.indexOf(item.ok)) : 2;
                    pilScores.push(s < 2 ? 2 : s);
                } else if (item.type === "checkbox" && sec.subname !== "Компетенции.") {
                    if (!item.ok) violations++;
                }
            }));
        });

        let pRes = "-";
        if (hasPil) {
            pRes = pilScores.includes(2) ? 2 : Math.round(pilScores.reduce((a,b)=>a+b,0)/pilScores.length);
        }
        text += `- ${mainSec.name}: Техника [${pRes}], Процедуры [${violations} нар.]\n`;
    });

    text += `\nДЕТАЛИЗАЦИЯ:\n`;
    DATA.checklists.forEach(mainSec => {
        text += `\n=== ${mainSec.name.toUpperCase()} ===\n`;
        mainSec.sections.forEach(sec => {
            text += `[ ${sec.subname} ]\n`;
            const groups = sec.groups || [{ items: sec.items || [] }];
            groups.forEach(g => {
                if(g.topitem) text += `* ${g.topitem}\n`;
                g.items.forEach(item => {
                    let status = item.type === "checkbox" ? (item.ok ? "OK" : "НАРУШЕНИЕ") : (item.ok || "НЕ ВЫБРАНО");
                    text += `  - ${item.label}: ${status}\n`;
                });
            });
            if(sec.note) text += `  Комментарий к блоку: ${sec.note}\n`;
        });
    });

    const subject = encodeURIComponent(`Отчет Checkride: ${fio} - ${date}`);
    const mailBody = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${subject}&body=${mailBody}`;
}

function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function resetApp() { location.reload(); }