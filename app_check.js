
    const STORAGE_KEY = 'demo-device-master-pwa-v1';
    const SALES_EMAILS = {
      '竹越': 'takegoshi@bopixel.co.jp',
      '森田': 'morita@bopixel.co.jp',
      '小野寺': 'onodera@bopixel.co.jp',
      '北野': 'kitano@bopixel.co.jp'
    };
    const MODEL_EXACT_NAMES = {
      'BC-GM65M6X4H-F': '65MP mono エリアカメラ CXP6x4Lane / High-Speed / Fマウント',
      'BC-SC5M10X1': '5MP color エリアカメラ CXP10x1Lane / Cマウント',
      'BC-SCS2M10X1H': '2MP color エリアカメラ CXP10x1Lane / High-Speed / Cマウント',
      'BC-SMS05M10X1H': '0.5MP mono エリアカメラ CXP10x1Lane / High-Speed / Cマウント',
      'BC-SMS20M10X1N': '20MP mono エリアカメラ CXP10x1Lane / Normal-Speed / Cマウント',
      'BC-SM3MCL': '3MP mono エリアカメラ CameraLink / Cマウント',
      'BL-GM9KTD12X4-M58': '9kTDI mono ラインカメラ CXP12x4Lane / M58マウント'
    };
    const screens = ['dashboard', 'stockin', 'loan', 'return', 'audit'];
    let state = loadState();
    let loanDraftItems = [];
    let currentReturnDeviceId = '';
    let currentAuditSession = { scannedIds: [], scannedAt: todayStr() };
    let dashboardQuickFilter = '';

    function defaultState() {
      return {
        devices: [
          { id: 'DV-001', model: 'BC-GC65M12X4-F', serial: '22080102', productName: inferProductName('BC-GC65M12X4-F'), status: '在庫あり', location: 'デモ機倉庫', sourceType: '初期棚卸', notes: '付属ACアダプタ同梱', lastAuditDate: '', currentLoanSlipNo: '' },
          { id: 'DV-002', model: 'BC-SCS2M10X1H', serial: '23050060', productName: inferProductName('BC-SCS2M10X1H'), status: '貸出中', location: '貸出先', sourceType: '初期棚卸', notes: '実QRサンプル', lastAuditDate: '2026-08-15', currentLoanSlipNo: 'SL-26082001' },
          { id: 'DV-003', model: 'BL-GM9KTD12X4-M58', serial: '24010011', productName: inferProductName('BL-GM9KTD12X4-M58'), status: '点検待ち', location: 'デモ機倉庫', sourceType: '製品在庫から転用', notes: '返却後点検待ち', lastAuditDate: '2026-08-10', currentLoanSlipNo: '' }
        ],
        slips: [
          { slipNo: 'SL-26082001', customer: '株式会社ヒューブレイン / 柊様', sales: '竹越', shipDate: '2026-08-20', dueDate: '2026-09-20', note: 'デモ評価貸出', itemIds: ['DV-002'], status: '貸出中' }
        ],
        logs: [
          { id: 'LG-001', ts: '2026-08-20T09:00:00', action: '貸出出庫', deviceId: 'DV-002', model: 'BC-SCS2M10X1H', serial: '23050060', detail: '株式会社ヒューブレイン / 柊様 へ貸出。貸出票 SL-26082001' }
        ]
      };
    }
    function normalizeStateShape(data) {
      const base = data && typeof data === 'object' ? data : defaultState();
      base.devices = Array.isArray(base.devices) ? base.devices : [];
      base.slips = Array.isArray(base.slips) ? base.slips : [];
      base.logs = Array.isArray(base.logs) ? base.logs : [];
      base.devices = base.devices.map(device => ({
        ...device,
        productName: inferProductName(device.model) || device.productName || '',
        location: device.location || 'デモ機倉庫',
        sourceType: device.sourceType || '手動登録',
        notes: device.notes || '',
        lastAuditDate: device.lastAuditDate || '',
        currentLoanSlipNo: device.currentLoanSlipNo || ''
      }));
      return base;
    }
    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return normalizeStateShape(raw ? JSON.parse(raw) : defaultState());
      } catch (e) {
        return normalizeStateShape(defaultState());
      }
    }
    function saveState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderSummary();
      renderDeviceTable();
      renderMobileDeviceList();
      renderAuditBox();
    }
    function todayStr() {
      const d = new Date();
      return d.toISOString().slice(0, 10);
    }
    function formatDateJP(dateStr) {
      if (!dateStr) return '-';
      if (dateStr.includes('T')) {
        const d = new Date(dateStr);
        return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      }
      const [y,m,d] = dateStr.split('-');
      return `${Number(y)}/${Number(m)}/${Number(d)}`;
    }
    function setTodayBadge() {
      const jp = new Intl.DateTimeFormat('ja-JP', { year:'numeric', month:'2-digit', day:'2-digit' });
      document.getElementById('todayBadge').textContent = jp.format(new Date());
      document.getElementById('loanDate').value = todayStr();
      const due = new Date(); due.setDate(due.getDate() + 30); document.getElementById('loanDueDate').value = due.toISOString().slice(0,10);
    }
    function showScreen(name) {
      screens.forEach(id => document.getElementById('screen-' + id).classList.toggle('hidden', id !== name));
      document.querySelectorAll('[data-nav]').forEach(btn => btn.classList.toggle('active', btn.dataset.nav === name));
    }
    function showQrGuide() {
      alert([
        '【iPhone標準QRの推奨手順】',
        '1. コントロールセンターの「コードスキャナー」またはカメラを起動',
        '2. QRを読み取り、結果文字列をコピー',
        '3. このPWAに戻る',
        '4. 「① クリップボードから取込」を押す',
        '5. 「② 型番/SNを反映」を押す',
        '',
        '※ QR内容は「BC-SCS2M10X1H_23050060」のような 型番_シリアル番号 形式を想定しています。'
      ].join('\n'));
    }
    async function importFromClipboard(targetId) {
      if (!navigator.clipboard?.readText) {
        alert('クリップボード読取が利用できません。結果文字列を手動で貼り付けてください。');
        return;
      }
      try {
        const text = (await navigator.clipboard.readText()).trim();
        if (!text) {
          alert('クリップボードに文字列がありません。先にiPhone標準QRで読み取った結果をコピーしてください。');
          return;
        }
        document.getElementById(targetId).value = text;
      } catch (e) {
        alert('クリップボードから読み取れませんでした。手動貼り付けをご利用ください。');
      }
    }
    function inferProductName(model) {
      const code = String(model || '').trim();
      if (!code) return '';
      if (MODEL_EXACT_NAMES[code]) return MODEL_EXACT_NAMES[code];

      let deviceType = '';
      if (code.startsWith('BC-')) deviceType = 'エリアカメラ';
      else if (code.startsWith('BL-')) deviceType = 'ラインカメラ';

      let colorType = '';
      if (/(^|-)(GC|SC)/.test(code)) colorType = 'color';
      else if (/(^|-)(GM|SM)/.test(code)) colorType = 'mono';

      let resolution = '';
      const tdiMatch = code.match(/(\d+)KTD/i);
      if (tdiMatch) {
        resolution = `${tdiMatch[1]}kTDI`;
      } else {
        const mpMatch = code.match(/(\d{1,2})M/i);
        if (mpMatch) resolution = `${mpMatch[1] === '05' ? '0.5' : Number(mpMatch[1])}MP`;
      }

      let iface = '';
      if (/CL$/i.test(code) || /MCL/i.test(code)) {
        iface = 'CameraLink';
      } else {
        const laneMatch = code.match(/(\d{1,2})X(\d)/i);
        if (laneMatch) iface = `CXP${Number(laneMatch[1])}x${Number(laneMatch[2])}Lane`;
      }

      let speed = '';
      if (/H(?:-|$)/i.test(code)) speed = 'High-Speed';
      else if (/N(?:-|$)/i.test(code)) speed = 'Normal-Speed';

      let mount = 'Cマウント';
      if (/M58/i.test(code)) mount = 'M58マウント';
      else if (/-F$/i.test(code)) mount = 'Fマウント';

      const head = [resolution, colorType, deviceType].filter(Boolean).join(' ');
      const tail = [iface, speed, mount].filter(Boolean).join(' / ');
      return [head, tail].filter(Boolean).join(' ');
    }
    function parseQrText(text) {
      const normalized = text.trim();
      const underscore = normalized.match(/^\s*([^_\n\r]+)_([^_\n\r]+)\s*$/);
      if (underscore) return { model: underscore[1].trim(), serial: underscore[2].trim() };
      let model = '', serial = '';
      const modelPatterns = [/MODEL\s*[=:]\s*([^;|\/\n]+)/i,/型番\s*[=:：]\s*([^;|\/\n]+)/i,/品番\s*[=:：]\s*([^;|\/\n]+)/i];
      const serialPatterns = [/SN\s*[=:]\s*([^;|\/\n]+)/i,/S\/N\s*[=:]\s*([^;|\/\n]+)/i,/SERIAL\s*[=:]\s*([^;|\/\n]+)/i,/シリアル(?:番号)?\s*[=:：]\s*([^;|\/\n]+)/i];
      modelPatterns.forEach(p => { if (!model) { const m = normalized.match(p); if (m) model = m[1].trim(); } });
      serialPatterns.forEach(p => { if (!serial) { const m = normalized.match(p); if (m) serial = m[1].trim(); } });
      return { model, serial };
    }
    function parseIntoFields(sourceId, modelId, serialId, nameId = '') {
      const text = document.getElementById(sourceId).value;
      const parsed = parseQrText(text);
      if (parsed.model) document.getElementById(modelId).value = parsed.model;
      if (parsed.serial) document.getElementById(serialId).value = parsed.serial;
      if (nameId) document.getElementById(nameId).value = inferProductName(parsed.model);
      if (!parsed.model && !parsed.serial) alert('型番またはシリアル番号を抽出できませんでした。');
    }
    async function decodeImageFile(file, targetId, modelId, serialId, nameId = '') {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = window.jsQR ? window.jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' }) : null;
          if (code?.data) {
            document.getElementById(targetId).value = code.data;
            parseIntoFields(targetId, modelId, serialId, nameId);
          } else {
            alert('画像からQRを読み取れませんでした。');
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
    function newId(prefix) {
      return `${prefix}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
    }
    function findDeviceBySerial(serial) {
      return state.devices.find(d => d.serial === serial.trim());
    }
    function logAction(action, device, detail) {
      state.logs.unshift({ id: newId('LG'), ts: new Date().toISOString(), action, deviceId: device.id, model: device.model, serial: device.serial, detail });
    }
    function resolvedLoanSales() {
      const base = document.getElementById('loanSales').value;
      if (base === '自由記述') return document.getElementById('loanSalesCustom').value.trim() || '自由記述';
      return base;
    }
    function toggleLoanSalesCustom() {
      document.getElementById('loanSalesCustom').classList.toggle('hidden', document.getElementById('loanSales').value !== '自由記述');
    }

    function saveStockIn() {
      const model = document.getElementById('stockModel').value.trim();
      const serial = document.getElementById('stockSerial').value.trim();
      const productName = document.getElementById('stockName').value.trim() || inferProductName(model);
      const status = document.getElementById('stockStatus').value;
      const location = document.getElementById('stockLocation').value.trim() || 'デモ機倉庫';
      const sourceType = document.getElementById('stockInType').value;
      const notes = document.getElementById('stockNote').value.trim();
      if (!model || !serial) { alert('型番とシリアル番号は必須です。'); return; }
      const existing = findDeviceBySerial(serial);
      if (existing) {
        existing.model = model;
        existing.productName = productName;
        existing.status = status;
        existing.location = location;
        existing.sourceType = sourceType;
        existing.notes = notes;
        existing.currentLoanSlipNo = status === '貸出中' ? existing.currentLoanSlipNo : '';
        logAction('入庫更新', existing, `${sourceType} として状態を ${status} に更新`);
      } else {
        const device = { id: newId('DV'), model, serial, productName, status, location, sourceType, notes, lastAuditDate: '', currentLoanSlipNo: '' };
        state.devices.unshift(device);
        logAction('入庫登録', device, `${sourceType} として新規登録`);
      }
      saveState();
      clearStockForm();
      alert('個体登録 / 入庫を保存しました。');
    }
    function clearStockForm() {
      ['stockQrInput','stockModel','stockSerial','stockName','stockNote'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('stockStatus').value = '在庫あり';
    }

    function addLoanDraftItem() {
      const model = document.getElementById('loanModel').value.trim();
      const serial = document.getElementById('loanSerial').value.trim();
      const productName = document.getElementById('loanName').value.trim() || inferProductName(model);
      const itemNote = document.getElementById('loanItemNote').value.trim();
      if (!model || !serial) { alert('型番とシリアル番号は必須です。'); return; }
      const device = findDeviceBySerial(serial);
      if (!device) { alert('未登録SNです。先に入庫/初期登録を行ってください。'); return; }
      if (device.status !== '在庫あり') { alert(`この個体は現在「${device.status}」のため貸出できません。`); return; }
      const idx = loanDraftItems.findIndex(x => x.serial === serial);
      const item = { deviceId: device.id, model, serial, productName, itemNote };
      if (idx >= 0) loanDraftItems[idx] = item; else loanDraftItems.push(item);
      renderLoanDraft();
      ['loanQrInput','loanModel','loanSerial','loanName','loanItemNote'].forEach(id => document.getElementById(id).value = '');
    }
    function removeLoanDraftItem(serial) {
      loanDraftItems = loanDraftItems.filter(x => x.serial !== serial);
      renderLoanDraft();
    }
    function renderLoanDraft() {
      const box = document.getElementById('loanDraftBox');
      document.getElementById('loanDraftBadge').textContent = `${loanDraftItems.length}明細`;
      if (!loanDraftItems.length) {
        box.innerHTML = '<div class="muted tiny">まだ明細がありません。標準QRで読み取った結果を取り込んで追加してください。</div>';
        return;
      }
      box.innerHTML = loanDraftItems.map((item, i) => `
        <div class="line-card">
          <div class="line-head">
            <div>
              <strong>${escapeHtml(item.productName)}</strong>
              <div class="muted tiny">${i + 1}行目 / 型番: ${escapeHtml(item.model)} / S/N: ${escapeHtml(item.serial)}</div>
            </div>
            <button class="danger" onclick="removeLoanDraftItem('${escapeJs(item.serial)}')">削除</button>
          </div>
          <div class="kvs">
            <div class="kv"><span>品名</span><strong>${escapeHtml(item.productName)}</strong></div>
            <div class="kv"><span>明細備考</span><strong>${escapeHtml(item.itemNote || '-')}</strong></div>
          </div>
        </div>`).join('');
    }
    function saveLoanSlip() {
      const customer = document.getElementById('loanCustomer').value.trim();
      const sales = resolvedLoanSales();
      const shipDate = document.getElementById('loanDate').value;
      const dueDate = document.getElementById('loanDueDate').value;
      const note = document.getElementById('loanCommonNote').value.trim();
      if (!customer || !sales || !shipDate || !dueDate) { alert('貸出先、担当営業、出荷日、返却予定日は必須です。'); return; }
      if (!loanDraftItems.length) { alert('貸出票に1件以上の個体を追加してください。'); return; }
      const slipNo = `SL-${new Date().toISOString().slice(2,10).replace(/-/g,'')}${String(Date.now()).slice(-2)}`;
      const itemIds = loanDraftItems.map(item => item.deviceId);
      const slip = { slipNo, customer, sales, shipDate, dueDate, note, itemIds, status: '貸出中' };
      state.slips.unshift(slip);
      loanDraftItems.forEach(item => {
        const device = state.devices.find(d => d.id === item.deviceId);
        device.status = '貸出中';
        device.location = '貸出先';
        device.currentLoanSlipNo = slipNo;
        device.notes = item.itemNote || device.notes;
        logAction('貸出出庫', device, `${customer} へ貸出。貸出票 ${slipNo}`);
      });
      saveState();
      alert('貸出票を保存し、対象SNを貸出中に更新しました。');
      loanDraftItems = [];
      renderLoanDraft();
      showScreen('dashboard');
    }
    function buildSlipHtml() {
      const customer = document.getElementById('loanCustomer').value.trim();
      const sales = resolvedLoanSales();
      const shipDate = document.getElementById('loanDate').value;
      const dueDate = document.getElementById('loanDueDate').value;
      const note = document.getElementById('loanCommonNote').value.trim();
      if (!customer || !loanDraftItems.length) { alert('貸出票プレビューには貸出先と1件以上の明細が必要です。'); return ''; }
      const rows = loanDraftItems.map(item => `<tr><td>${escapeHtml(item.productName)}</td><td>${escapeHtml(item.model)}</td><td style="text-align:center;">1</td><td>${escapeHtml(item.serial)}</td><td>${escapeHtml(item.itemNote || '')}</td></tr>`).join('');
      const email = SALES_EMAILS[sales] || '';
      return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>貸出票</title><style>@page{size:A4 portrait;margin:7mm}body{font-family:"Hiragino Sans","Yu Gothic",sans-serif;font-size:11px;color:#111;margin:0}.sheet{width:196mm;max-width:196mm;margin:0 auto}.head{display:flex;gap:12px}.left{flex:1}.right{width:250px}.title{text-align:center;font-size:20px;font-weight:700;margin:8px 0 10px}.recipient{font-size:17px;margin:0 0 10px}.meta,.items{width:100%;border-collapse:collapse}.meta td,.items th,.items td{border:1px solid #333;padding:5px 7px}.meta td:first-child{width:110px;background:#fafafa}.items{margin-top:10px;font-size:10px}.items th{background:#fafafa}.btn{border:none;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer}.actions{position:sticky;top:0;background:#f8fafc;border:1px solid #d9e2ec;border-radius:10px;padding:8px 10px;margin-bottom:10px;display:flex;gap:8px}.memo{margin-top:6px;font-size:10px}.note{font-size:9.4px;margin:1px 0}</style></head><body><div class="sheet"><div class="actions"><button class="btn" onclick="window.print()">印刷</button><button class="btn" onclick="window.close()">閉じる</button></div><div class="head"><div class="left"><div>ジャパンボーピクセル株式会社</div><div>〒220-0004 神奈川県横浜市西区北幸2丁目8-4</div><div>横浜西口KNビル9F</div><div>TEL：045-548-3566 / FAX：045-548-3711</div><div>担当：${escapeHtml(sales)}</div><div>MAIL：${escapeHtml(email)}</div></div><div class="right"><table class="meta"><tr><td>出荷日</td><td>${escapeHtml(formatDateJP(shipDate))}</td></tr><tr><td>返却予定日</td><td>${escapeHtml(formatDateJP(dueDate))}</td></tr></table></div></div><div class="title">貸出票</div><div class="recipient">${escapeHtml(customer)}</div><table class="items"><tr><th style="width:38%">品名</th><th style="width:24%">型番</th><th style="width:8%">数量</th><th style="width:18%">S/N</th><th style="width:12%">備考</th></tr>${rows}</table>${note ? `<div class="memo">伝票備考：${escapeHtml(note)}</div>` : ''}</div></body></html>`;
    }
    function previewLoanSlip() {
      const html = buildSlipHtml(); if (!html) return;
      const w = window.open('', '_blank'); w.document.write(html); w.document.close();
    }
    function showLoanMemo() {
      const customer = document.getElementById('loanCustomer').value.trim();
      const sales = resolvedLoanSales();
      const shipDate = document.getElementById('loanDate').value;
      const dueDate = document.getElementById('loanDueDate').value;
      const note = document.getElementById('loanCommonNote').value.trim();
      const lines = ['【貸出ログ予定】', `貸出先: ${customer || '-'}`, `担当営業: ${sales || '-'}`, `出荷日: ${shipDate || '-'}`, `返却予定日: ${dueDate || '-'}`, `伝票備考: ${note || '-'}`, '--- 明細 ---'];
      loanDraftItems.forEach((item, i) => lines.push(`${i + 1}. ${item.productName} / ${item.model} / ${item.serial}`));
      alert(lines.join('\n'));
    }
    function searchLoanDevice() {
      const serial = document.getElementById('loanSerial').value.trim();
      const device = findDeviceBySerial(serial);
      if (!device) { alert('未登録SNです。'); return; }
      alert([`品名: ${device.productName}`, `型番: ${device.model}`, `S/N: ${device.serial}`, `状態: ${device.status}`, `保管場所: ${device.location}`].join('\n'));
    }

    function loadReturnTarget() {
      const serial = document.getElementById('returnSerial').value.trim();
      const device = findDeviceBySerial(serial);
      if (!device) { alert('未登録SNです。'); return; }
      if (device.status !== '貸出中') { alert(`この個体は現在「${device.status}」です。返却対象ではありません。`); return; }
      const slip = state.slips.find(s => s.slipNo === device.currentLoanSlipNo);
      currentReturnDeviceId = device.id;
      document.getElementById('returnPanel').classList.remove('hidden');
      document.getElementById('returnTargetName').textContent = device.productName;
      document.getElementById('returnTargetMeta').textContent = `${device.model} / S/N: ${device.serial}`;
      document.getElementById('returnSlipNo').textContent = slip?.slipNo || '-';
      document.getElementById('returnCustomer').textContent = slip?.customer || '-';
      document.getElementById('returnSales').textContent = slip?.sales || '-';
      document.getElementById('returnDue').textContent = formatDateJP(slip?.dueDate || '');
      document.getElementById('returnStatus').value = '在庫あり';
      document.getElementById('returnLocation').value = 'デモ機倉庫';
      document.getElementById('returnNote').value = '';
    }
    function completeReturn() {
      if (!currentReturnDeviceId) { alert('返却対象が読み込まれていません。'); return; }
      const device = state.devices.find(d => d.id === currentReturnDeviceId);
      const status = document.getElementById('returnStatus').value;
      const location = document.getElementById('returnLocation').value.trim() || 'デモ機倉庫';
      const note = document.getElementById('returnNote').value.trim();
      device.status = status;
      device.location = location;
      device.currentLoanSlipNo = '';
      device.notes = note || device.notes;
      logAction('返却入庫', device, `返却処理。返却後状態: ${status}`);
      const slip = state.slips.find(s => s.slipNo === document.getElementById('returnSlipNo').textContent);
      if (slip) {
        const stillOpen = slip.itemIds.some(id => {
          const d = state.devices.find(x => x.id === id);
          return d && d.status === '貸出中';
        });
        slip.status = stillOpen ? '貸出中' : '返却完了';
      }
      saveState();
      currentReturnDeviceId = '';
      document.getElementById('returnPanel').classList.add('hidden');
      ['returnQrInput','returnModel','returnSerial','returnNote'].forEach(id => document.getElementById(id).value = '');
      alert('返却処理を保存しました。');
    }
    function showReturnMemo() {
      if (!currentReturnDeviceId) { alert('返却対象がありません。'); return; }
      const device = state.devices.find(d => d.id === currentReturnDeviceId);
      const lines = ['【返却ログ予定】', `品名: ${device.productName}`, `型番: ${device.model}`, `S/N: ${device.serial}`, `返却後状態: ${document.getElementById('returnStatus').value}`, `保管場所: ${document.getElementById('returnLocation').value}`, `返却メモ: ${document.getElementById('returnNote').value || '-'}`];
      alert(lines.join('\n'));
    }

    function markAuditScanned() {
      const serial = document.getElementById('auditSerial').value.trim();
      const device = findDeviceBySerial(serial);
      if (!device) { alert('未登録SNです。'); return; }
      if (!currentAuditSession.scannedIds.includes(device.id)) currentAuditSession.scannedIds.push(device.id);
      device.lastAuditDate = todayStr();
      if (device.status === '棚卸差異') device.status = '在庫あり';
      logAction('棚卸確認', device, '棚卸確認済みに更新');
      saveState();
      renderAuditBox();
      ['auditQrInput','auditModel','auditSerial'].forEach(id => document.getElementById(id).value = '');
    }
    function renderAuditBox() {
      const box = document.getElementById('auditResultBox');
      document.getElementById('auditBadge').textContent = `${currentAuditSession.scannedIds.length}件確認`;
      if (!currentAuditSession.scannedIds.length) {
        box.innerHTML = '<div class="muted tiny">まだ今回の棚卸確認はありません。</div>';
        return;
      }
      const items = currentAuditSession.scannedIds.map(id => state.devices.find(d => d.id === id)).filter(Boolean);
      box.innerHTML = items.map(item => `<div class="line-card"><strong>${escapeHtml(item.productName)}</strong><div class="muted tiny">${escapeHtml(item.model)} / ${escapeHtml(item.serial)} / 最終棚卸 ${escapeHtml(formatDateJP(item.lastAuditDate))}</div></div>`).join('');
    }
    function finishAudit() {
      const location = document.getElementById('auditLocation').value.trim();
      const status = document.getElementById('auditStatusFilter').value;
      const target = state.devices.filter(d => (!location || d.location === location) && (!status || d.status === status));
      const missing = target.filter(d => !currentAuditSession.scannedIds.includes(d.id));
      if (!missing.length) {
        alert('未確認個体はありません。');
        return;
      }
      const lines = ['【未確認個体】'];
      missing.forEach(d => lines.push(`${d.productName} / ${d.model} / ${d.serial} / 現在状態: ${d.status}`));
      alert(lines.join('\n'));
    }

    function getDevicesByFilter(keyword = '', status = '') {
      const normalizedKeyword = String(keyword || '').trim().toLowerCase();
      return state.devices.filter(d => {
        const hitKeyword = !normalizedKeyword || [d.model, d.serial, d.productName, d.location, d.notes, d.sourceType, d.currentLoanSlipNo || ''].join(' ').toLowerCase().includes(normalizedKeyword);
        const hitStatus = !status || d.status === status;
        return hitKeyword && hitStatus;
      });
    }
    function labelForDashboardFilter(status) {
      return status || 'すべて';
    }
    function setDashboardQuickFilter(status = '') {
      dashboardQuickFilter = status;
      document.querySelectorAll('.mobile-filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === status));
      document.querySelectorAll('#summaryCards .summary-card').forEach(card => card.classList.toggle('active', (card.dataset.filter || '') === status));
      renderMobileDeviceList();
      const dashboard = document.getElementById('screen-dashboard');
      if (window.innerWidth <= 720 && dashboard && !dashboard.classList.contains('hidden')) {
        document.getElementById('mobileDeviceList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    function renderMobileDeviceList() {
      const container = document.getElementById('mobileDeviceList');
      if (!container) return;
      const rows = getDevicesByFilter('', dashboardQuickFilter);
      const title = document.getElementById('mobileListTitle');
      const count = document.getElementById('mobileListCount');
      if (title) title.textContent = dashboardQuickFilter ? `${labelForDashboardFilter(dashboardQuickFilter)} 一覧` : '全個体一覧';
      if (count) count.textContent = `${rows.length}件`;
      container.innerHTML = rows.map(d => `<div class="list-item"><div class="list-item-top"><div><h3>${escapeHtml(d.productName)}</h3><div class="muted tiny">${escapeHtml(d.model)} / S/N ${escapeHtml(d.serial)}</div></div><span class="status-pill ${d.status === '在庫あり' ? 'ok' : d.status === '貸出中' ? 'warning' : d.status === '修理中' || d.status === '棚卸差異' ? 'danger' : 'slate'}">${escapeHtml(d.status)}</span></div><div class="kvs"><div class="kv"><span>保管場所</span>${escapeHtml(d.location || '-')}</div><div class="kv"><span>現在貸出票</span>${escapeHtml(d.currentLoanSlipNo || '-')}</div><div class="kv"><span>取得区分</span>${escapeHtml(d.sourceType || '-')}</div><div class="kv"><span>最終棚卸</span>${escapeHtml(formatDateJP(d.lastAuditDate || ''))}</div><div class="kv" style="grid-column:1/-1;"><span>備考</span>${escapeHtml(d.notes || '-')}</div></div></div>`).join('');
      if (!rows.length) container.innerHTML = '<div class="list-item"><div class="muted">該当する個体はありません。</div></div>';
    }
    function renderSummary() {
      const total = state.devices.length;
      const inStock = state.devices.filter(d => d.status === '在庫あり').length;
      const onLoan = state.devices.filter(d => d.status === '貸出中').length;
      const repair = state.devices.filter(d => d.status === '修理中').length;
      const inspect = state.devices.filter(d => d.status === '点検待ち').length;
      const gap = state.devices.filter(d => d.status === '棚卸差異').length;
      const cards = [
        ['総個体数', total, '登録済みSN', ''],
        ['在庫あり', inStock, '貸出可能', '在庫あり'],
        ['貸出中', onLoan, '顧客貸出中', '貸出中'],
        ['点検/修理', inspect + repair, '使用停止中', '点検待ち']
      ];
      document.getElementById('summaryCards').innerHTML = cards.map(([title,num,sub,filter]) => `<button type="button" class="summary-card clickable ${(filter || '') === dashboardQuickFilter ? 'active' : ''}" data-filter="${escapeHtml(filter || '')}"><div class="muted tiny">${escapeHtml(title)}</div><div class="num">${num}</div><div class="muted tiny">${escapeHtml(sub)}</div></button>`).join('');
      document.getElementById('syncBadge').textContent = gap ? `棚卸差異 ${gap}件` : 'ローカル試作版';
      document.getElementById('syncBadge').className = `status-pill ${gap ? 'danger' : 'slate'}`;
    }
    function renderDeviceTable() {
      const keyword = document.getElementById('deviceKeyword') ? document.getElementById('deviceKeyword').value : '';
      const status = document.getElementById('deviceStatusFilter') ? document.getElementById('deviceStatusFilter').value : '';
      const rows = getDevicesByFilter(keyword, status);
      const body = document.getElementById('deviceTableBody');
      body.innerHTML = rows.map(d => `<tr><td>${escapeHtml(d.status)}</td><td>${escapeHtml(d.model)}</td><td>${escapeHtml(d.serial)}</td><td>${escapeHtml(d.productName)}</td><td>${escapeHtml(d.location)}</td><td>${escapeHtml(d.currentLoanSlipNo || '-')}</td><td>${escapeHtml(formatDateJP(d.lastAuditDate))}</td><td>${escapeHtml(d.sourceType)}</td><td>${escapeHtml(d.notes || '-')}</td></tr>`).join('');
      if (!rows.length) body.innerHTML = '<tr><td colspan="9">該当データがありません。</td></tr>';
    }

    function exportJson() {
      downloadBlob(JSON.stringify(state, null, 2), 'demo_device_master.json', 'application/json');
    }
    function exportCsv() {
      const header = ['状態','型番','シリアル番号','品名','保管場所','現在貸出票','最終棚卸','取得区分','備考'];
      const rows = state.devices.map(d => [d.status,d.model,d.serial,d.productName,d.location,d.currentLoanSlipNo || '',d.lastAuditDate || '',d.sourceType,d.notes || '']);
      const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
      downloadBlob(csv, 'demo_device_master.csv', 'text/csv');
    }
    function importJsonFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!parsed.devices || !parsed.slips || !parsed.logs) throw new Error('invalid');
          state = normalizeStateShape(parsed);
          saveState();
          alert('JSONを取り込みました。');
        } catch (e) {
          alert('JSON形式が正しくありません。');
        }
      };
      reader.readAsText(file);
    }
    function downloadBlob(content, filename, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }

    function escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
    }
    function escapeJs(str) {
      return String(str).replace(/['\\]/g, '\\$&');
    }

    document.querySelectorAll('.nav-btn, .quick-btn').forEach(btn => btn.addEventListener('click', () => showScreen(btn.dataset.nav)));
    document.getElementById('deviceSearchBtn').addEventListener('click', renderDeviceTable);
    document.getElementById('summaryCards').addEventListener('click', event => { const card = event.target.closest('.summary-card'); if (!card) return; setDashboardQuickFilter(card.dataset.filter || ''); });
    const mobileFilterWrap = document.getElementById('mobileStatusFilters'); if (mobileFilterWrap) mobileFilterWrap.addEventListener('click', event => { const btn = event.target.closest('.mobile-filter-btn'); if (!btn) return; setDashboardQuickFilter(btn.dataset.filter || ''); });
    document.getElementById('exportJsonBtn').addEventListener('click', exportJson);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
    document.getElementById('importJsonInput').addEventListener('change', e => importJsonFile(e.target.files[0]));

    document.getElementById('stockClipboardBtn').addEventListener('click', () => importFromClipboard('stockQrInput'));
    document.getElementById('stockParseBtn').addEventListener('click', () => parseIntoFields('stockQrInput','stockModel','stockSerial','stockName'));
    document.getElementById('stockImageInput').addEventListener('change', e => decodeImageFile(e.target.files[0],'stockQrInput','stockModel','stockSerial','stockName'));
    document.getElementById('saveStockBtn').addEventListener('click', saveStockIn);
    document.getElementById('clearStockBtn').addEventListener('click', clearStockForm);
    document.querySelectorAll('.stock-sample').forEach(btn => btn.addEventListener('click', () => { document.getElementById('stockQrInput').value = btn.dataset.sample; parseIntoFields('stockQrInput','stockModel','stockSerial','stockName'); }));

    document.getElementById('loanClipboardBtn').addEventListener('click', () => importFromClipboard('loanQrInput'));
    document.getElementById('loanParseBtn').addEventListener('click', () => parseIntoFields('loanQrInput','loanModel','loanSerial','loanName'));
    document.getElementById('addLoanItemBtn').addEventListener('click', addLoanDraftItem);
    document.getElementById('searchLoanDeviceBtn').addEventListener('click', searchLoanDevice);
    document.getElementById('previewLoanSlipBtn').addEventListener('click', previewLoanSlip);
    document.getElementById('loanMemoBtn').addEventListener('click', showLoanMemo);
    document.getElementById('saveLoanSlipBtn').addEventListener('click', saveLoanSlip);
    document.getElementById('loanSales').addEventListener('change', toggleLoanSalesCustom);

    document.getElementById('returnClipboardBtn').addEventListener('click', () => importFromClipboard('returnQrInput'));
    document.getElementById('returnParseBtn').addEventListener('click', () => parseIntoFields('returnQrInput','returnModel','returnSerial'));
    document.getElementById('loadReturnTargetBtn').addEventListener('click', loadReturnTarget);
    document.getElementById('completeReturnBtn').addEventListener('click', completeReturn);
    document.getElementById('returnMemoBtn').addEventListener('click', showReturnMemo);

    document.getElementById('auditClipboardBtn').addEventListener('click', () => importFromClipboard('auditQrInput'));
    document.getElementById('auditParseBtn').addEventListener('click', () => parseIntoFields('auditQrInput','auditModel','auditSerial'));
    document.getElementById('auditMarkBtn').addEventListener('click', markAuditScanned);
    document.getElementById('auditFinishBtn').addEventListener('click', finishAudit);

    ['qrGuideBtn1','qrGuideBtn2','qrGuideBtn3','qrGuideBtn4'].forEach(id => document.getElementById(id).addEventListener('click', showQrGuide));

    setTodayBadge();
    toggleLoanSalesCustom();
    renderLoanDraft();
    renderSummary();
    renderDeviceTable();
    renderMobileDeviceList();
    renderAuditBox();
  