let DATA = null;

async function loadData(){
    const res = await fetch('data.json');
    DATA = await res.json();
}

function showScreen(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

async function startTest(){

    if(!DATA){
        await loadData();
    }

    document.getElementById('section-title').textContent = DATA.sectionTitle;

    const container = document.getElementById('test-container');
    container.innerHTML='';

    DATA.items.forEach(item=>{

        const row = document.createElement('div');
        row.className='test-row';

        row.innerHTML = `
        <label>${item.label}</label>
        <input type="checkbox" id="check_${item.id}"> Выполнено
        <input type="text" id="note_${item.id}" placeholder="Комментарий">
        `;

        container.appendChild(row);
    });

    showScreen('screen-test');
}

function showResults(){

    document.getElementById('res-fio').textContent =
        document.getElementById('user-fio').value;

    document.getElementById('res-license').textContent =
        document.getElementById('user-license').value;

    const list = document.getElementById('res-list');
    list.innerHTML='';

    DATA.items.forEach(item=>{

        const checked =
            document.getElementById('check_'+item.id).checked;

        const note =
            document.getElementById('note_'+item.id).value;

        const div = document.createElement('div');

        div.innerHTML = `
        <p>
        <b>${item.label}</b><br>
        Статус: ${checked ? "Выполнено":"Не выполнено"}<br>
        Замечание: ${note || "-"}
        </p>
        `;

        list.appendChild(div);
    });

    showScreen('screen-results');
}

function exportPDF(){

    const el = document.getElementById('report-view');

    html2pdf().from(el).save("checkride_report.pdf");
}

if('serviceWorker' in navigator){
window.addEventListener('load',()=>{
navigator.serviceWorker.register('sw.js');
});
}
