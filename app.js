let DATA = null;
let currentMode = 'line'; 
let currentSectionIndex = 0;
let inspections = JSON.parse(localStorage.getItem("inspections") || "[]");

const DATA_FILES = {
    line: 'data.json', // Убедитесь, что файлы называются именно так
    ffs: 'data_ffs.json'
};

async function loadData() {
    try {
        const url = DATA_FILES[currentMode];
        const r = await fetch(url);
        if (!r.ok) throw new Error('Ошибка загрузки файла данных');
        DATA = await r.json();
    } catch (e) {
        alert("Не удалось загрузить данные: " + e.message);
    }
}

function setMode(mode) {
    currentMode = mode;
    document.getElementById('btn-line').classList.toggle('active', mode === 'line');
    document.getElementById('btn-ffs').classList.toggle('active', mode === 'ffs');
    DATA = null; // Сброс данных при смене режима
}

async function startInspection() {
    // Проверка заполнения полей
    if (!document.getElementById("fio").value) {
        alert("Введите ФИО");
        return;
    }

    await loadData();
    if (!DATA) return;

    currentSectionIndex = 0;
    renderSection();
    show('screen-test');
}

function renderSection() {
    const section = DATA.checklists[currentSectionIndex];
    document.getElementById("section-title").innerText = section.name;

    const box = document.getElementById("checklist");
    box.innerHTML = "";

    section.items.forEach(item => {
        const el = document.createElement("div");
        el.className = "item";
        
        // Создаем элементы программно, чтобы избежать ошибок с кавычками
        el.innerHTML = `
            <p><b>${item.label}</b></p>
            <label><input type="checkbox" id="c_${item.id}"> Исправно (OK)</label>
            <textarea id="n_${item.id}" placeholder="Комментарий"></textarea>
            <input type="file" accept="image/*" id="img_${item.id}">
            <div id="preview_${item.id}" class="image-preview"></div>
        `;
        box.appendChild(el);

        // Слушатель для предпросмотра фото
        const fileInput = el.querySelector(`#img_${item.id}`);
        fileInput.addEventListener('change', function() {
            previewImage(this, item.id);
        });
    });

    // Навигация
    document.getElementById("btn-prev").style.display = currentSectionIndex === 0 ? "none" : "inline-block";
    document.getElementById("btn-next").style.display = currentSectionIndex === DATA.checklists.length - 1 ? "none" : "inline-block";
    document.getElementById("btn-finish").style.display = currentSectionIndex === DATA.checklists.length - 1 ? "inline-block" : "none";
    
    window.scrollTo(0,0);
}

function previewImage(input, id) {
    const preview = document.getElementById(`preview_${id}`);
    preview.innerHTML = "";
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement("img");
            img.src = e.target.result;
            img.style.maxWidth = "100%";
            img.style.marginTop = "10px";
            preview.appendChild(img);
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function nextSection() {
    saveCurrentAnswers();
    currentSectionIndex++;
    renderSection();
}

function prevSection() {
    saveCurrentAnswers();
    currentSectionIndex--;
    renderSection();
}

// Сохраняем состояние в объект DATA, чтобы данные не пропадали при переходах
function saveCurrentAnswers() {
    const section = DATA.checklists[currentSectionIndex];
    section.items.forEach(item => {
        item.val_ok = document.getElementById(`c_${item.id}`).checked;
        item.val_note = document.getElementById(`n_${item.id}`).value;
        // Фото сохраняется в самом DOM элементе, для отчета соберем в конце
    });
}

async function finishTest() {
    saveCurrentAnswers();
    
    const reportItems = document.getElementById("report_items");
    reportItems.innerHTML = "";

    // Собираем данные из всех блоков
    for (const section of DATA.checklists) {
        const sTitle = document.createElement("h3");
        sTitle.innerText = section.name;
        reportItems.appendChild(sTitle);

        for (const item of section.items) {
            const div = document.createElement("div");
            div.className = "report-item-box";
            
            // Если фото было выбрано, получаем его dataURL
            let imgHtml = "";
            const fileInput = document.getElementById(`img_${item.id}`);
            if (fileInput && fileInput.files[0]) {
                const dataUrl = await toBase64(fileInput.files[0]);
                imgHtml = `<img src="${dataUrl}" style="max-width:300px; display:block; margin-top:10px;">`;
            }

            div.innerHTML = `
                <p><b>${item.label}</b><br>
                Статус: ${item.val_ok ? "✅ OK" : "❌ Нарушение"}<br>
                Комментарий: ${item.val_note || "-"}</p>
                ${imgHtml}
                <hr>
            `;
            reportItems.appendChild(div);
        }
    }

    document.getElementById("r_fio").innerText = document.getElementById("fio").value;
    document.getElementById("r_license").innerText = document.getElementById("license").value;
    document.getElementById("r_date").innerText = new Date().toLocaleString();
    document.getElementById("r_mode").innerText = currentMode.toUpperCase();

    initSignature();
    show("screen-report");
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

function initSignature() {
    const canvas = document.getElementById("signature");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let drawing = false;

    const start = () => drawing = true;
    const stop = () => { drawing = false; ctx.beginPath(); };
    const draw = (e) => {
        if (!drawing) return;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#000";
        
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    canvas.onmousedown = start; canvas.onmouseup = stop; canvas.onmousemove = draw;
    canvas.ontouchstart = start; canvas.ontouchend = stop; canvas.ontouchmove = draw;
}

function exportPDF() {
    const el = document.getElementById("report-area");
    const opt = {
        margin: 10,
        filename: 'report.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(el).save();
}

function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function resetApp() {
    if(confirm("Начать заново? Все данные текущей проверки будут удалены.")) {
        location.reload();
    }
}
