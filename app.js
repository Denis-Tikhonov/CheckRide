let DATA = null;
let currentMode = 'line';
let currentSectionIndex = 0;
let flightTime = "";

function setMode(mode) {
    currentMode = mode;
    document.getElementById('btn-line').classList.toggle('active', mode === 'line');
    document.getElementById('btn-ffs').classList.toggle('active', mode === 'ffs');
}

function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    window.scrollTo(0,0);
}

async function startInspection() {
    const fio = document.getElementById("fio").value;
    const instructor = document.getElementById("instructor").value;
    if (!fio || !instructor) return alert("Заполните ФИО проверяемого и Инструктора");

    const file = currentMode === 'line' ? 'data.json' : 'data_ffs.json';
    try {
        const response = await fetch(file);
        DATA = await response.json();

        DATA.checklists.forEach(mainSec => {
            mainSec.sections.forEach(sec => {
                sec.note = "";
                sec.img = null;
                const groups = sec.groups || [{ items: sec.items || [] }]; 
                groups.forEach(group => {
                    group.items.forEach(i => {
                        if (i.type !== "divider") i.ok = (i.type === "radio") ? null : false;
                    });
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
    const titleEl = document.getElementById("section-title");

    titleEl.innerText = mainSection.name;
    itemsBox.innerHTML = "";

    mainSection.sections.forEach((sec, secIdx) => {
        const subHeader = document.createElement("h3");
        subHeader.className = "subname-title";
        subHeader.innerText = sec.subname;
        itemsBox.appendChild(subHeader);

        const groups = sec.groups || [{ items: sec.items || [] }];
        groups.forEach(group => {
            if (group.topitem) {
                const topHeader = document.createElement("h4");
                topHeader.className = "topitem-title";
                topHeader.innerText = group.topitem;
                itemsBox.appendChild(topHeader);
            }
            group.items.forEach(item => {
                const itemDiv = document.createElement("div");
                if (item.type === "divider") {
                    itemDiv.innerHTML = `<div class="divider-line"><span class="divider-label">${item.label}</span></div>`;
                } else if (item.type === "checkbox") {
                    itemDiv.className = "item-container";
                    itemDiv.innerHTML = `<div class="check-item"><input type="checkbox" id="c_${item.id}" ${item.ok ? 'checked' : ''} onchange="updateVal('${item.id}', this.checked)"><label for="c_${item.id}">${item.label}</label></div>`;
                } else if (item.type === "radio") {
                    let opts = item.options.map((o, idx) => `
                        <label class="radio-option">
                            <input type="radio" name="r_${item.id}" value="${5-idx}" ${item.ok == (5-idx) ? 'checked' : ''} onchange="updateVal('${item.id}', ${5-idx})">
                            <span>${o}</span>
                        </label>`).join("");
                    itemDiv.innerHTML = `<div class="radio-group"><p>${item.label}</p>${opts}</div>`;
                }
                itemsBox.appendChild(itemDiv);
            });
        });

        // Не выводим комментарии для Компетенций
        if (sec.subname !== "Компетенции.") {
            const detailDiv = document.createElement("div");
            detailDiv.className = "detail-item";
            detailDiv.innerHTML = `
                <p><b>Комментарии:</b></p>
                <textarea onchange="updateNote(${secIdx}, this.value)" placeholder="Введите текст...">${sec.note || ""}</textarea>
                <input type="file" accept="image/*" onchange="handleFile(this, ${secIdx})">
                ${sec.img ? `<img src="${sec.img}" style="width:100%; margin-top:10px;">` : ""}
            `;
            itemsBox.appendChild(detailDiv);
        }
    });

    document.getElementById("btn-prev").classList.toggle("hidden", currentSectionIndex === 0);
    document.getElementById("btn-next").classList.toggle("hidden", currentSectionIndex === DATA.checklists.length - 1);
    document.getElementById("btn-finish").classList.toggle("hidden", currentSectionIndex !== DATA.checklists.length - 1);
}

function updateVal(id, val) {
    DATA.checklists[currentSectionIndex].sections.forEach(s => {
        const groups = s.groups || [{ items: s.items || [] }];
        groups.forEach(g => {
            let item = g.items.find(i => i.id === id);
            if (item) item.ok = val;
        });
    });
}

function updateNote(idx, val) { DATA.checklists[currentSectionIndex].sections[idx].note = val; }

async function handleFile(input, secIdx) {
    if (!input.files[0]) return;
    const base64 = await compressImage(input.files[0]);
    DATA.checklists[currentSectionIndex].sections[secIdx].img = base64;
    renderSection();
}

function compressImage(file) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const scale = 800 / img.width;
                canvas.width = 800;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
}

function nextSection() { currentSectionIndex++; renderSection(); }
function prevSection() { currentSectionIndex--; renderSection(); }

function finishInspection() {
    flightTime = prompt("Введите полетное время (например, 02:30):", "") || "-";
    buildReport();
    saveToLocalStorage();
    show("screen-report");
}

function calculateRatings() {
    let results = { piloting: [], procedures: 0, competencies: [] };
    let allCompItems = [];

    DATA.checklists.forEach(mainSec => {
        mainSec.sections.forEach(sec => {
            const groups = sec.groups || [{ items: sec.items || [] }];
            groups.forEach(group => {
                if (sec.subname === "Техника пилотирования.") {
                    group.items.forEach(i => { if(i.ok) results.piloting.push({label: i.label, score: i.ok, text: i.options[5-i.ok]}); });
                } else if (sec.subname === "Стандартные процедуры.") {
                    group.items.forEach(i => { if(i.type === "checkbox" && !i.ok) results.procedures++; });
                } else if (sec.subname === "Компетенции.") {
                    group.items.forEach(i => {
                        if (i.type === "checkbox") allCompItems.push({ top: group.topitem, ok: i.ok, label: i.label });
                    });
                }
            });
        });
    });

    // Расчет компетенций по новым порогам
    let grouped = {};
    allCompItems.forEach(item => {
        if (!grouped[item.top]) grouped[item.top] = { ok: 0, total: 0, items: [] };
        grouped[item.top].total++;
        if (item.ok) grouped[item.top].ok++;
        grouped[item.top].items.push(item);
    });

    for (let top in grouped) {
        let pct = (grouped[top].ok / grouped[top].total) * 100;
        let score = 2;
        if (pct > 69) score = 5;
        else if (pct >= 50) score = 4;
        else if (pct >= 25) score = 3;
        results.competencies.push({ name: top, score: score, items: grouped[top].items });
    }

    return results;
}

function buildReport() {
    const r = calculateRatings();
    document.getElementById("r_fio").innerText = document.getElementById("fio").value;
    document.getElementById("r_instructor").innerText = document.getElementById("instructor").value;
    document.getElementById("r_license").innerText = document.getElementById("license").value;
    document.getElementById("r_date").innerText = new Date().toLocaleString();
    document.getElementById("r_mode").innerText = currentMode.toUpperCase();
    document.getElementById("r_route").innerText = document.getElementById("route").value || "-";
    document.getElementById("r_ac_number").innerText = document.getElementById("ac_number").value || "-";
    document.getElementById("r_flight_time").innerText = flightTime;

    let html = `<div class="rating-summary">`;
    html += `<p><b>Техника пилотирования:</b> ${r.piloting.length ? "" : "Нет данных"}</p>`;
    r.piloting.forEach(p => html += `<p> - Оценка ${p.score}: ${p.text}</p>`);
    html += `<p><b>Стандартные процедуры:</b> Замечаний: ${r.procedures}</p></div>`;

    DATA.checklists.forEach(mainSec => {
        html += `<h3 class="report-section-title">${mainSec.name}</h3>`;
        mainSec.sections.forEach(sec => {
            html += `<p><b>${sec.subname}</b></p>`;
            const groups = sec.groups || [{ items: sec.items || [] }];
            groups.forEach(g => {
                if(g.topitem) html += `<p><i>${g.topitem}</i></p>`;
                g.items.forEach(i => {
                    if (i.type === "divider") return;
                    let icon = i.ok ? "✅ OK" : "❌ Нарушение";
                    if (i.type === "radio") icon = i.ok ? `Оценка: ${i.ok}` : "❌ Не выполнено";
                    html += `<div class="report-item-row"><span>${i.label}</span> <span>${icon}</span></div>`;
                });
            });
            if (sec.note) html += `<p class="report-note">Комментарий: ${sec.note}</p>`;
            if (sec.img) html += `<img src="${sec.img}" class="report-img" style="width:100%">`;
        });
    });

    // Финальный блок компетенций
    html += `<div class="comp-summary-block"><h3>Описание компетенций (итоговое)</h3>`;
    r.competencies.forEach(c => {
        let cls = `score-${c.score}`;
        let prefix = "Редко";
        if (c.score === 5) prefix = "Всегда";
        else if (c.score === 4) prefix = "Регулярно";
        else if (c.score === 3) prefix = "Иногда";

        html += `<p class="comp-item-desc"><b>${c.name}</b> Оценка <span class="${cls}">${c.score}</span></p>`;
        c.items.forEach(it => {
            html += `<p class="comp-detail ${cls}" style="margin-left:20px;">- ${prefix} ${it.label}</p>`;
        });
    });
    html += `</div>`;

    document.getElementById("report-data").innerHTML = html;
}

function saveToLocalStorage() {
    let history = JSON.parse(localStorage.getItem("checkride_history") || "[]");
    const entry = {
        fio: document.getElementById("fio").value,
        date: new Date().toLocaleString(),
        mode: currentMode,
        data: JSON.parse(JSON.stringify(DATA)),
        flightTime: flightTime
    };
    history.unshift(entry);
    if (history.length > 10) history.pop();
    
    try {
        localStorage.setItem("checkride_history", JSON.stringify(history));
    } catch(e) {
        history.pop();
        localStorage.setItem("checkride_history", JSON.stringify(history));
    }
}

function showHistory() {
    const list = document.getElementById("history-list");
    const history = JSON.parse(localStorage.getItem("checkride_history") || "[]");
    list.innerHTML = history.length ? "" : "<p>История пуста</p>";
    history.forEach((h, idx) => {
        const div = document.createElement("div");
        div.className = "history-card";
        div.innerHTML = `<p><b>${h.fio}</b> (${h.mode})</p><p><small>${h.date}</small></p>`;
        div.onclick = () => {
            DATA = h.data;
            flightTime = h.flightTime || "-";
            buildReport();
            show("screen-report");
        };
        list.appendChild(div);
    });
    show("screen-history");
}

function clearHistory() { if(confirm("Очистить историю?")) { localStorage.removeItem("checkride_history"); showHistory(); } }

function sendEmail() {
    const r = calculateRatings();
    const fio = document.getElementById("fio").value;
    const instructor = document.getElementById("instructor").value;
    
    let body = `ОТЧЕТ ПО ПРОВЕРКЕ\n`;
    body += `Специалист: ${fio}\nИнструктор: ${instructor}\nРежим: ${currentMode.toUpperCase()}\nПолетное время: ${flightTime}\n\n`;
    
    body += `--- КОМПЕТЕНЦИИ ---\n`;
    r.competencies.forEach(c => {
        let prefix = c.score === 5 ? "Всегда" : (c.score === 4 ? "Регулярно" : (c.score === 3 ? "Иногда" : "Редко"));
        body += `[${c.score}] ${c.name}\n`;
        c.items.forEach(it => body += `- ${prefix} ${it.label}\n`);
        body += `\n`;
    });

    const mailto = `mailto:?subject=CheckRide Report: ${fio}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
}