let DATA = null;
let currentMode = 'line'; 
let currentSectionIndex = 0;
let inspections = JSON.parse(localStorage.getItem("inspections") || "[]");

const DATA_FILES = {
    line: 'data.json',
    ffs: 'data_ffs.json'
};

function setMode(mode) {
    currentMode = mode;
    document.getElementById('btn-line').classList.toggle('active', mode === 'line');
    document.getElementById('btn-ffs').classList.toggle('active', mode === 'ffs');
}

async function startInspection() {
    if (!document.getElementById("fio").value) return alert("Введите ФИО");
    try {
        const response = await fetch(DATA_FILES[currentMode]);
        DATA = await response.json();
        
        // Подготовка данных для хранения ответов
        DATA.checklists.forEach(sec => {
            sec.items.forEach(i => {
                if(i.answer_ok === undefined) i.answer_ok = false;
                if(i.answer_note === undefined) i.answer_note = "";
                if(i.answer_img === undefined) i.answer_img = null;
            });
        });

        currentSectionIndex = 0;
        renderSection();
        show('screen-test');
    } catch (e) {
        alert("Ошибка: Убедитесь, что файлы data.json и data_ffs.json находятся на сервере.");
    }
}

function renderSection() {
    const section = DATA.checklists[currentSectionIndex];
    document.getElementById("section-title").innerText = section.name;
    const container = document.getElementById("checklist");
    container.innerHTML = "";

    section.items.forEach(item => {
        const div = document.createElement("div");
        div.className = "item-card";
        div.innerHTML = `
            <p><b>${item.label}</b></p>
            <div class="checkbox-container">
                <input type="checkbox" id="c_${item.id}" ${item.answer_ok ? 'checked' : ''}>
                <span>OK</span>
            </div>
            <textarea id="n_${item.id}" placeholder="Комментарий">${item.answer_note}</textarea>
            <input type="file" accept="image/*" id="f_${item.id}">
            <div id="p_${item.id}" class="img-preview">
                ${item.answer_img ? `<img src="${item.answer_img}" style="max-width:150px; margin-top:10px;">` : ''}
            </div>
        `;
        container.appendChild(div);

        // Обработка фото сразу в Base64
        const fileInput = div.querySelector(`#f_${item.id}`);
        fileInput.onchange = async () => {
            if (fileInput.files[0]) {
                const b64 = await toBase64(fileInput.files[0]);
                item.answer_img = b64;
                div.querySelector(`#p_${item.id}`).innerHTML = `<img src="${b64}" style="max-width:150px; margin-top:10px;">`;
            }
        };
    });

    updateNav();
}

function updateNav() {
    const isFirst = currentSectionIndex === 0;
    const isLast = currentSectionIndex === DATA.checklists.length - 1;
    document.getElementById("btn-prev").classList.toggle("hidden", isFirst);
    document.getElementById("btn-next").classList.toggle("hidden", isLast);
    document.getElementById("btn-finish").classList.toggle("hidden", !isLast);
    window.scrollTo(0,0);
}

function nextSection() { saveStep(); currentSectionIndex++; renderSection(); }
function prevSection() { saveStep(); currentSectionIndex--; renderSection(); }

function saveStep() {
    const section = DATA.checklists[currentSectionIndex];
    section.items.forEach(item => {
        item.answer_ok = document.getElementById(`c_${item.id}`).checked;
        item.answer_note = document.getElementById(`n_${item.id}`).value;
    });
}

function finishInspection() {
    saveStep();
    const container = document.getElementById("report_items_container");
    container.innerHTML = "";

    DATA.checklists.forEach(section => {
        const sDiv = document.createElement("div");
        sDiv.innerHTML = `<h3 style="color:var(--red); margin-top:20px; border-bottom:1px solid var(--red);">${section.name}</h3>`;
        
        section.items.forEach(item => {
            const iDiv = document.createElement("div");
            iDiv.className = "report-row";
            iDiv.innerHTML = `
                <p><b>${item.label}</b></p>
                <p style="display:flex; align-items:center; gap:8px;">
                    <span style="border:1px solid #000; width:15px; height:15px; display:inline-block; text-align:center; line-height:15px;">${item.answer_ok ? 'X' : ''}</span>
                    Статус: ${item.answer_ok ? 'OK' : 'Нарушение'}
                </p>
                <p>Комментарий: ${item.answer_note || '-'}</p>
                ${item.answer_img ? `<img src="${item.answer_img}" class="report-img">` : ''}
            `;
            sDiv.appendChild(iDiv);
        });
        container.appendChild(sDiv);
    });

    document.getElementById("r_fio").innerText = document.getElementById("fio").value;
    document.getElementById("r_license").innerText = document.getElementById("license").value;
    document.getElementById("r_date").innerText = new Date().toLocaleString();
    document.getElementById("r_mode").innerText = currentMode.toUpperCase();

    show("screen-report");
    setTimeout(initSignature, 200);
}

function initSignature() {
    const canvas = document.getElementById("signature");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width, canvas.height);
    let drawing = false;
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: cx - rect.left, y: cy - rect.top };
    };
    canvas.onmousedown = canvas.ontouchstart = (e) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    canvas.onmousemove = canvas.ontouchmove = (e) => { if(!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    canvas.onmouseup = canvas.ontouchend = () => { drawing = false; };
    ctx.lineWidth = 2; ctx.strokeStyle = "#000";
}

function exportPDF() {
    const canvas = document.getElementById("signature");
    const placeholder = document.getElementById("signature-img-placeholder");
    const dataURL = canvas.toDataURL("image/png");
    
    placeholder.innerHTML = `<img src="${dataURL}" style="width:300px; border-bottom:1px solid #000;">`;
    canvas.style.display = "none";

    const element = document.getElementById("report-to-export");
    const opt = {
        margin: 10,
        filename: 'Report.pdf',
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        canvas.style.display = "block";
        placeholder.innerHTML = "";
    });
}

function toBase64(file) {
    return new Promise(r => { const rd = new FileReader(); rd.readAsDataURL(file); rd.onload = () => r(rd.result); });
}

function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function resetApp() { location.reload(); }

function showHistory() {
    const box = document.getElementById("historyList");
    box.innerHTML = inspections.map(i => `<div style="border-bottom:1px solid #ccc; padding:5px;"><b>${i.fio}</b> - ${i.date}</div>`).join("");
    show("screen-history");
}
