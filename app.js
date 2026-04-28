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
    if (!fio || !instructor) return alert("Заполните ФИО проверяемого и Инструктора");

    const file = currentMode === 'line' ? 'data.json' : 'data_ffs.json';
    try {
        const response = await fetch(file);
        if (!response.ok) throw new Error("Файл данных не найден");
        DATA = await response.json();

        // Инициализация
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
    } catch (e) { alert("Ошибка: " + e.message); }
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
                    itemDiv.className = "item-divider";
                    itemDiv.innerText = item.label;
                } else if (item.type === "checkbox") {
                    itemDiv.className = "item-container";
                    itemDiv.innerHTML = `<div class="check-item"><input type="checkbox" id="c_${item.id}" ${item.ok ? 'checked' : ''}><label for="c_${item.id}">${item.label}</label></div>`;
                } else if (item.type === "radio") {
                    itemDiv.className = "item-container";
                    let opts = item.options.map(opt => `<label class="radio-option"><input type="radio" name="r_${item.id}" value="${opt}" ${item.ok === opt ? 'checked' : ''}><span>${opt}</span></label>`).join("");
                    itemDiv.innerHTML = `<div class="radio-group"><p class="radio-label"><b>${item.label}</b></p>${opts}</div>`;
                }
                itemsBox.appendChild(itemDiv);
            });
        });

        if (sec.subname !== "Компетенции.") {
            const detailDiv = document.createElement("div");
            detailDiv.className = "detail-item";
            detailDiv.innerHTML = `
                <b style="color:var(--red);">Комментарии:</b>
                <textarea id="sec_n_${currentSectionIndex}_${secIdx}" placeholder="Введите текст...">${sec.note || ''}</textarea>
                <input type="file" accept="image/*" onchange="handleSectionFile(this, ${currentSectionIndex}, ${secIdx})">
                <div id="sec_p_${currentSectionIndex}_${secIdx}">${sec.img ? `<img src="${sec.img}" style="width:100%; max-width:200px; margin-top:10px;">` : ''}</div>`;
            itemsBox.appendChild(detailDiv);
        }
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

// Функция расчета оценок компетенций
function calculateCompetencies() {
    const competencyMap = {}; // { "ПП": { total: 10, checked: 7, items: [...] }, ... }
    
    DATA.checklists.forEach(mainSec => {
        mainSec.sections.forEach(sec => {
            if (sec.subname !== "Компетенции.") return;
            
            const groups = sec.groups || [{ items: sec.items || [] }];
            groups.forEach(group => {
                const compCode = group.topitem || "Общие";
                
                if (!competencyMap[compCode]) {
                    competencyMap[compCode] = { total: 0, checked: 0, items: [] };
                }
                
                group.items.forEach(item => {
                    if (item.type !== "checkbox") return;
                    competencyMap[compCode].total++;
                    if (item.ok) competencyMap[compCode].checked++;
                    
                    // Сохраняем item с его состоянием для последующего вывода
                    const existingItem = competencyMap[compCode].items.find(i => i.label === item.label);
                    if (!existingItem) {
                        competencyMap[compCode].items.push({
                            label: item.label,
                            checked: item.ok ? 1 : 0,
                            count: 1
                        });
                    } else {
                        existingItem.count++;
                        if (item.ok) existingItem.checked++;
                    }
                });
            });
        });
    });
    
    // Расчет итоговых оценок
    const competencyScores = {};
    for (let code in competencyMap) {
        const { total, checked } = competencyMap[code];
        const percent = total > 0 ? (checked / total) * 100 : 0;
        
        let score = 2;
        if (percent >= 70) score = 5;
        else if (percent >= 50) score = 4;
        else if (percent >= 25) score = 3;
        
        competencyScores[code] = { score, percent, items: competencyMap[code].items };
    }
    
    return competencyScores;
}

function calculateRatings() {
    let reportHtml = `<div class="rating-summary"><h3>Сводная оценка</h3>`;
    
    // Оценки по этапам
    DATA.checklists.forEach(mainSec => {
        let piloting = [];
        let violations = 0;
        let hasPilotingSection = false;
        
        mainSec.sections.forEach(sec => {
            const groups = sec.groups || [{ items: sec.items || [] }];
            groups.forEach(g => g.items.forEach(i => {
                if (i.type === "radio") {
                    hasPilotingSection = true;
                    let score = i.ok ? (5 - i.options.indexOf(i.ok)) : 2;
                    piloting.push(score < 2 ? 2 : score);
                } else if (i.type === "checkbox" && sec.subname !== "Компетенции.") {
                    if (!i.ok) violations++;
                }
            }));
        });
        
        let pRes = piloting.length ? (piloting.includes(2) ? 2 : Math.round(piloting.reduce((a,b)=>a+b,0)/piloting.length)) : "-";
        
        let ratingLine = `<div class="rating-block"><b>${mainSec.name}</b>`;
        if (hasPilotingSection) {
            ratingLine += ` | Техника пилотирования: <span class="score-val">${pRes}</span>`;
        }
        ratingLine += ` | Нарушений: <span class="score-val">${violations}</span></div>`;
        reportHtml += ratingLine;
    });
    
    // Добавляем разделитель и компетенции в блоке Сводная оценка
    const competencies = calculateCompetencies();
    if (Object.keys(competencies).length > 0) {
        reportHtml += `<div class="competencies-rating-divider">`;
        reportHtml += `<div class="competencies-rating-title">Компетенции:</div>`;
        
        for (let code in competencies) {
            const { score } = competencies[code];
            reportHtml += `<div class="rating-block"><b>${code}</b>: <span class="score-val">${score}</span></div>`;
        }
        
        reportHtml += `</div>`;
    }
    
    return reportHtml + `</div>`;
}

function buildReport() {
    const container = document.getElementById("report-data");
    container.innerHTML = calculateRatings();

    DATA.checklists.forEach(mainSec => {
        container.innerHTML += `<h2 class="report-main-title">${mainSec.name}</h2>`;
        
        // Сначала выводим все секции кроме "Компетенции."
        mainSec.sections.forEach(sec => {
            if (sec.subname === "Компетенции.") return;
            
            let sHtml = `<div class="report-section"><h3 class="report-subname">${sec.subname}</h3>`;
            const groups = sec.groups || [{ items: sec.items || [] }];
            groups.forEach(group => {
                if(group.topitem) sHtml += `<h4 class="report-topitem">${group.topitem}</h4>`;
                group.items.forEach(item => {
                    if (item.type === "divider") return;
                    
                    if (item.type === "checkbox") {
                        let res = `<div class="flex-row">${item.ok ? '<span class="icon-ok">✓ OK</span>' : '<span class="icon-fail">✗ Нарушение</span>'}</div>`;
                        sHtml += `<div class="report-item-row"><p>${item.label}</p>${res}</div>`;
                    } else if (item.type === "radio") {
                        let scoreValue = item.ok || '2 (н/д)';
                        let scoreIndex = item.ok ? item.options.indexOf(item.ok) : -1;
                        let actualScore = scoreIndex >= 0 ? (5 - scoreIndex) : 2;
                        
                        sHtml += `<div class="report-item-row report-radio-item">
                            <p style="font-weight:600;">${item.label}</p>
                            <div style="padding-left:15px;">
                                <b>Оценка:</b> ${actualScore} - ${scoreValue}
                            </div>
                        </div>`;
                    }
                });
            });
            if (sec.note || sec.img) {
                sHtml += `<div class="report-comment">
                    ${sec.note ? `<p><b>Комментарий:</b> ${sec.note}</p>` : ""}
                    ${sec.img ? `<img src="${sec.img}" style="width:100%; margin-top:10px;">` : ""}
                </div>`;
            }
            container.innerHTML += sHtml + `</div>`;
        });
    });

    // Формируем блок компетенций с разделителем
    const competencies = calculateCompetencies();
    let competenciesHtml = '<div class="competencies-divider">';
    competenciesHtml += '<h2 class="competencies-title">Компетенции:</h2>';
    
    for (let code in competencies) {
        const { items } = competencies[code];
        competenciesHtml += `<div class="report-section"><h3 class="report-subname">${code}</h3>`;
        
        items.forEach(item => {
            const percent = item.count > 0 ? (item.checked / item.count) * 100 : 0;
            let score = 2;
            if (percent >= 70) score = 5;
            else if (percent >= 50) score = 4;
            else if (percent >= 25) score = 3;
            
            let prefix = "";
            let colorClass = "";
            
            if (score === 5) {
                prefix = "Всегда";
            } else if (score === 4) {
                prefix = "Регулярно";
            } else if (score === 3) {
                prefix = "Иногда";
                colorClass = "comp-yellow";
            } else {
                prefix = "Редко";
                colorClass = "comp-red";
            }
            
            let labelText = item.label.charAt(0).toLowerCase() + item.label.slice(1);
            
            competenciesHtml += `<div class="competency-item ${colorClass}">- ${prefix} ${labelText}</div>`;
        });
        
        competenciesHtml += '</div>';
    }
    
    competenciesHtml += '</div>';
    document.getElementById("competencies-placeholder").innerHTML = competenciesHtml;

    // Мета-данные
    const fields = ["fio", "license", "instructor", "route", "ac_number", "flight_time"];
    fields.forEach(f => {
        const val = document.getElementById(f).value;
        const target = document.getElementById("r_" + f);
        if (target) target.innerText = val || "-";
    });
    document.getElementById("r_date").innerText = DATA.savedDate || new Date().toLocaleString();
    document.getElementById("r_mode").innerText = currentMode.toUpperCase();
}

async function handleSectionFile(input, mainIdx, secIdx) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scale = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scale;
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                DATA.checklists[mainIdx].sections[secIdx].img = canvas.toDataURL('image/jpeg', 0.6);
                renderSection();
            };
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function nextSection() { saveState(); currentSectionIndex++; renderSection(); window.scrollTo(0,0); }
function prevSection() { saveState(); currentSectionIndex--; renderSection(); window.scrollTo(0,0); }
function updateNav() {
    const isFirst = currentSectionIndex === 0;
    const isLast = currentSectionIndex === DATA.checklists.length - 1;
    document.getElementById("btn-prev").style.display = isFirst ? "none" : "block";
    document.getElementById("btn-next").style.display = isLast ? "none" : "block";
    document.getElementById("btn-finish").classList.toggle("hidden", !isLast);
}

function finishInspection() {
    saveState();
    
    const flightTime = prompt("Введите полетное время (например, 02:30):");
    if (flightTime) {
        document.getElementById("flight_time").value = flightTime;
    }
    
    buildReport();
    saveToLocalStorage();
    show("screen-report");
    initSignature();
}

function saveToLocalStorage() {
    const entry = {
        fio: document.getElementById("fio").value,
        license: document.getElementById("license").value,
        instructor: document.getElementById("instructor").value,
        route: document.getElementById("route").value,
        ac_number: document.getElementById("ac_number").value,
        flight_time: document.getElementById("flight_time").value,
        date: new Date().toLocaleString(),
        mode: currentMode,
        fullData: JSON.parse(JSON.stringify(DATA))
    };
    let history = JSON.parse(localStorage.getItem("checkride_v8") || "[]");
    history.unshift(entry);
    localStorage.setItem("checkride_v8", JSON.stringify(history.slice(0, 10)));
}

function showHistory() {
    const history = JSON.parse(localStorage.getItem("checkride_v8") || "[]");
    document.getElementById("historyList").innerHTML = history.map((h, i) => `
        <div class="history-card" onclick="viewSavedReport(${i})">
            <b>${h.fio}</b> <small>(${h.mode})</small><br>${h.date}
        </div>`).join("") || "История пуста";
    show("screen-history");
}

function viewSavedReport(i) {
    const h = JSON.parse(localStorage.getItem("checkride_v8"))[i];
    ["fio", "license", "instructor", "route", "ac_number", "flight_time"].forEach(f => {
        document.getElementById(f).value = h[f] || "";
    });
    DATA = h.fullData; DATA.savedDate = h.date; currentMode = h.mode;
    buildReport(); show("screen-report");
    document.getElementById("signature").style.display = "none";
}

function initSignature() {
    const canvas = document.getElementById("signature");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width, canvas.height);
    canvas.style.display = "block";
    let drawing = false;
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };
    canvas.onmousedown = canvas.ontouchstart = (e) => { drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); };
    canvas.onmousemove = canvas.ontouchmove = (e) => { if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    canvas.onmouseup = canvas.ontouchend = () => drawing = false;
}

function exportPDF() { window.print(); }

function sendEmail() {
    const fio = document.getElementById("fio").value;
    const license = document.getElementById("license").value;
    const instructor = document.getElementById("instructor").value;
    const date = document.getElementById("r_date").innerText;
    const mode = document.getElementById("r_mode").innerText;
    const route = document.getElementById("route").value;
    const acNumber = document.getElementById("ac_number").value;
    const flightTime = document.getElementById("flight_time").value;
    
    // Формирование детального тела письма
    let body = `ОТЧЕТ ПО ПРОВЕРКЕ\n\n`;
    body += `Проверяемый: ${fio}\n`;
    body += `Лицензия: ${license}\n`;
    body += `Дата: ${date}\n`;
    body += `Режим: ${mode}\n`;
    if (route) body += `Маршрут: ${route}\n`;
    if (acNumber) body += `Номер ВС: ${acNumber}\n`;
    if (flightTime) body += `Полетное время: ${flightTime}\n`;
    body += `\nПроверяющий: ${instructor}\n`;
    body += `\n---\n\n`;
    body += `Полный отчет доступен в приложении или в печатной версии.\n`;
    body += `Для получения детального отчета откройте приложение CheckRide Rating.`;
    
    const subject = `CheckRide Report - ${fio} (${date})`;
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); document.getElementById(id).classList.remove('hidden'); }
function resetApp() { location.reload(); }
function clearHistory() { if(confirm("Очистить?")) { localStorage.removeItem("checkride_v8"); showHistory(); } }