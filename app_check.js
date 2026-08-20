
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
          { id: 'DV-003', model: 'BL-GM9KTD12X4-M58', serial: '24010011', productName: inferProductName('BL-GM9KTD12X4-M58'), status: '修理中', location: 'デモ機倉庫', sourceType: '製品在庫から転用', notes: '返却後メンテ待ち', lastAuditDate: '2026-08-10', currentLoanSlipNo: '' }
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
        status: device.status === '点検待ち' ? '修理中' : device.status === '除外' ? '削除' : (device.status || '在庫あり'),
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
    function getSlipNoticeLines() {
      return [
        '・貸出機は製品の導入検討目的での評価を前提にお客様へのお貸出しをしております。',
        '使用感をお試しいただくものであり、保証が必要な事柄やその他の目的での使用はしないでください。',
        '・貸出機は必ず返却期限をお守りください。また、期間の延長が必要な場合は担当営業までご連絡ください。',
        '※状況によりご希望に添えない場合もございますので、あらかじめご了承ください。',
        '・一度に貸出し可能な台数、または貸出し回数を制限させていただくことがございます。',
        '・万一、貸出機を破損・紛失された場合や貸出期間を経過してもご返却がない場合、当社より商品代金を請求させていただく場合がございますのでお取り扱いには十分ご注意ください。',
        '・個装箱や梱包袋も含めて、お貸し出し時の状態でご返却ください。',
        '・ご返却にかかる運送費等はお客様にてご負担いただきますようお願いいたします。'
      ];
    }
    function buildSlipQrSvg(qrText) {
      try {
        if (typeof qrcode !== 'function') return '';
        const qr = qrcode(0, 'M');
        qr.addData(qrText, 'Byte');
        qr.make();
        return qr.createSvgTag({ cellSize: 2, margin: 2, scalable: true });
      } catch (e) {
        return '';
      }
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
      const slipNo = `SL-${new Date().toISOString().slice(2,10).replace(/-/g,'')}${String(Date.now()).slice(-2)}`;
      const email = SALES_EMAILS[sales] || '';
      const notes = getSlipNoticeLines();
      const qrLines = [
        'BOPIXEL DEMO SLIP',
        `SLIP:${slipNo}`,
        `CUSTOMER:${customer}`,
        `SALES:${sales}`,
        `SHIP:${shipDate}`,
        `DUE:${dueDate}`,
        ...loanDraftItems.map((item, idx) => `ITEM${idx + 1}:${item.model}|${item.serial}`),
        note ? `NOTE:${note}` : ''
      ].filter(Boolean);
      const qrText = qrLines.join('\n');
      const qrSvg = buildSlipQrSvg(qrText);
      const rows = loanDraftItems.map(item => `
        <tr>
          <td>${escapeHtml(item.productName)}</td>
          <td>${escapeHtml(item.model)}</td>
          <td style="text-align:center;">1</td>
          <td>${escapeHtml(item.serial)}</td>
          <td>${escapeHtml(item.itemNote || '')}</td>
        </tr>`).join('');
      const emptyRows = Array.from({ length: Math.max(0, 5 - loanDraftItems.length) }).map(() => '<tr><td></td><td></td><td></td><td></td><td></td></tr>').join('');
      return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>貸出票</title><style>
        @page { size: A4 portrait; margin: 7mm; }
        body{font-family:"Hiragino Sans","Yu Gothic",sans-serif;background:#fff;color:#111;margin:0;padding:0;font-size:11px;line-height:1.35}
        .sheet{width:196mm;max-width:196mm;margin:0 auto;padding:0}
        .slip-no{font-size:11px;margin-bottom:8px}.head{display:flex;gap:12px;align-items:flex-start}.left{flex:1}.right{width:250px}
        .addr{font-size:10.8px;line-height:1.45}.title{text-align:center;font-weight:700;font-size:20px;letter-spacing:.1em;margin:10px 0 12px}.recipient{font-size:17px;margin:0 0 10px 0}
        .meta{width:100%;border-collapse:collapse;font-size:11px}.meta td{border:1px solid #333;padding:5px 8px}.meta td:first-child{width:110px;background:#fafafa}
        .items{width:100%;border-collapse:collapse;margin-top:10px;font-size:10px}.items th,.items td{border:1px solid #333;padding:4px 6px;vertical-align:top}.items th{background:#fafafa}.items td{height:19px}
        .notes-title{font-size:15px;font-weight:700;margin:12px 0 6px}.note{font-size:9.4px;line-height:1.42;margin:0 0 2px}.memo{font-size:10px;margin-top:6px}
        .print-actions{position:sticky;top:0;background:#f8fafc;border:1px solid #d9e2ec;border-radius:10px;padding:8px 10px;margin:0 0 10px;display:flex;gap:8px;flex-wrap:wrap}
        .btn{border:none;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer}.primary{background:#0f766e;color:#fff}.ghost{background:#fff;border:1px solid #d9e2ec;color:#172b4d}
        .qr-box{margin-top:8px;border:1px solid #cbd5e1;border-radius:10px;padding:6px;text-align:center}.qr-svg svg{width:34mm;height:34mm;display:block;margin:0 auto}.qr-caption{font-size:8.8px;line-height:1.3;margin-top:4px;color:#334155;word-break:break-word}
        @media print {.print-actions{display:none}.sheet{width:auto;max-width:none}.title{font-size:18px;margin:8px 0 10px}.recipient{font-size:16px}.items td{height:18px}.note{font-size:9px}}
      </style></head><body><div class="sheet"><div class="print-actions"><button class="btn primary" onclick="window.print()">印刷</button><button class="btn ghost" onclick="window.close()">閉じる</button></div><div class="slip-no">No.${escapeHtml(slipNo)}</div><div class="head"><div class="left addr"><div>ジャパンボーピクセル株式会社</div><div>〒220-0004 神奈川県横浜市西区北幸2丁目8-4</div><div>横浜西口KNビル9F</div><div>TEL：045-548-3566 / FAX：045-548-3711</div><div>Website：https://bopixel.co.jp/</div><div style="margin-top:6px;">担当：${escapeHtml(sales || '')}</div><div>MAIL：${escapeHtml(email)}</div></div><div class="right"><table class="meta"><tr><td>貸出票No.</td><td>${escapeHtml(slipNo)}</td></tr><tr><td>出荷日</td><td>${escapeHtml(formatDateJP(shipDate))}</td></tr><tr><td>返却予定日</td><td>${escapeHtml(formatDateJP(dueDate))}</td></tr></table>${qrSvg ? `<div class="qr-box"><div class="qr-svg">${qrSvg}</div><div class="qr-caption">貸出票情報QR（メール・チャット共有用）</div></div>` : `<div class="qr-box"><div class="qr-caption">QR生成に失敗しました。印刷前に再読み込みしてください。</div></div>`}</div></div><div class="title">貸出票</div><div class="recipient">${escapeHtml(customer || '')}</div><table class="items"><tr><th style="width:38%">品名</th><th style="width:24%">型番</th><th style="width:8%">数量</th><th style="width:18%">S/N</th><th style="width:12%">備考</th></tr>${rows}${emptyRows}</table>${note ? `<div class="memo">伝票備考：${escapeHtml(note)}</div>` : ''}<div class="notes-title">デモ機のご使用にあたって</div>${notes.map(x => `<p class="note">${escapeHtml(x)}</p>`).join('')}</div></body></html>`;
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

    function getActiveDevices() {
      return state.devices.filter(d => d.status !== '削除');
    }
    function getNormalVisibleDevices() {
      return getActiveDevices();
    }
    function resetDashboardFilters() {
      dashboardQuickFilter = '';
      const keywordEl = document.getElementById('deviceKeyword');
      const statusEl = document.getElementById('deviceStatusFilter');
      if (keywordEl) keywordEl.value = '';
      if (statusEl) statusEl.value = '';
      document.querySelectorAll('.mobile-filter-btn').forEach(btn => btn.classList.toggle('active', (btn.dataset.filter || '') === ''));
    }
    function getDevicesByFilter(keyword = '', status = '', options = {}) {
      const normalizedKeyword = String(keyword || '').trim().toLowerCase();
      const includeDeleted = !!options.includeDeleted;
      const source = includeDeleted ? state.devices.slice() : getActiveDevices();
      return source.filter(d => {
        const hitKeyword = !normalizedKeyword || [d.model, d.serial, d.productName, d.location, d.notes, d.sourceType, d.currentLoanSlipNo || ''].join(' ').toLowerCase().includes(normalizedKeyword);
        const hitStatus = !status || d.status === status;
        return hitKeyword && hitStatus;
      });
    }
    function labelForDashboardFilter(status) {
      return status || 'すべて';
    }
    function statusClass(status) {
      if (status === '在庫あり') return 'ok';
      if (status === '貸出中') return 'warning';
      if (status === '修理中' || status === '棚卸差異' || status === '削除') return 'danger';
      return 'slate';
    }
    function updateDeviceStatus(deviceId, nextStatus) {
      const device = state.devices.find(d => d.id === deviceId);
      if (!device) return;
      if (device.status === '貸出中' && nextStatus === '削除') {
        alert('貸出中の個体は管理画面から削除できません。返却後に削除してください。');
        return;
      }
      device.status = nextStatus;
      if (nextStatus !== '貸出中') device.currentLoanSlipNo = '';
      if (nextStatus === '在庫あり' || nextStatus === '修理中' || nextStatus === '削除') {
        device.location = nextStatus === '削除' ? '管理対象外' : (device.location && device.location !== '貸出先' ? device.location : 'デモ機倉庫');
      }
      logAction('管理画面ステータス変更', device, `管理画面から ${nextStatus} に変更`);
      saveState();
    }
    function setDashboardQuickFilter(status = '') {
      dashboardQuickFilter = status;
      document.querySelectorAll('.mobile-filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === status));
      document.querySelectorAll('#summaryCards .summary-card').forEach(card => card.classList.toggle('active', (card.dataset.filter || '') === status));
      const statusEl = document.getElementById('deviceStatusFilter');
      if (statusEl) statusEl.value = status;
      renderMobileDeviceList();
      renderDeviceTable();
      const dashboard = document.getElementById('screen-dashboard');
      if (window.innerWidth <= 720 && dashboard && !dashboard.classList.contains('hidden')) {
        document.getElementById('mobileDeviceList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    function renderMobileDeviceList() {
      const container = document.getElementById('mobileDeviceList');
      if (!container) return;
      const rows = dashboardQuickFilter ? getDevicesByFilter('', dashboardQuickFilter) : getNormalVisibleDevices();
      const title = document.getElementById('mobileListTitle');
      const count = document.getElementById('mobileListCount');
      if (title) title.textContent = dashboardQuickFilter ? `${labelForDashboardFilter(dashboardQuickFilter)} 一覧` : '通常一覧';
      if (count) count.textContent = `${rows.length}件`;
      container.className = 'compact-device-list';
      container.innerHTML = rows.map(d => `<div class="compact-device-card"><div class="compact-device-head"><div style="min-width:0;"><div class="compact-model">${escapeHtml(d.model)}</div><div class="compact-product">${escapeHtml(d.productName)}</div></div><span class="status-pill ${statusClass(d.status)}">${escapeHtml(d.status)}</span></div><div class="compact-meta"><div class="compact-inline"><span><strong>S/N</strong> ${escapeHtml(d.serial)}</span><span><strong>場所</strong> ${escapeHtml(d.location || '-')}</span><span><strong>貸出票</strong> ${escapeHtml(d.currentLoanSlipNo || '-')}</span></div>${d.notes ? `<div><strong>備考</strong> ${escapeHtml(d.notes)}</div>` : ''}</div><div class="compact-actions"><button type="button" class="mini-action ok" data-set-status="在庫あり" data-device-id="${escapeHtml(d.id)}">在庫あり</button><button type="button" class="mini-action warn" data-set-status="修理中" data-device-id="${escapeHtml(d.id)}">修理中</button><button type="button" class="mini-action danger" data-set-status="削除" data-device-id="${escapeHtml(d.id)}" ${d.status === '貸出中' ? 'disabled' : ''}>削除</button></div></div>`).join('');
      if (!rows.length) container.innerHTML = '<div class="compact-device-card"><div class="muted">該当する個体はありません。</div></div>';
    }
        function renderSummary() {
      const visible = getNormalVisibleDevices();
      const total = visible.length;
      const inStock = visible.filter(d => d.status === '在庫あり').length;
      const onLoan = visible.filter(d => d.status === '貸出中').length;
      const repair = visible.filter(d => d.status === '修理中').length;
      const deleted = state.devices.filter(d => d.status === '削除').length;
      const gap = visible.filter(d => d.status === '棚卸差異').length;
      const cards = [
        ['総個体数', total, deleted ? `通常一覧 / 削除 ${deleted}` : '通常一覧', ''],
        ['在庫あり', inStock, '貸出可能', '在庫あり'],
        ['貸出中', onLoan, '顧客貸出中', '貸出中'],
        ['修理中', repair, '使用停止中', '修理中']
      ];
      document.getElementById('summaryCards').innerHTML = cards.map(([title,num,sub,filter]) => `<button type="button" class="summary-card clickable ${(filter || '') === dashboardQuickFilter ? 'active' : ''}" data-filter="${escapeHtml(filter || '')}"><div class="muted tiny">${escapeHtml(title)}</div><div class="num">${num}</div><div class="muted tiny">${escapeHtml(sub)}</div></button>`).join('');
      document.getElementById('syncBadge').textContent = gap ? `棚卸差異 ${gap}件` : 'ローカル試作版';
      document.getElementById('syncBadge').className = `status-pill ${gap ? 'danger' : 'slate'}`;
    }
    function renderDeviceTable() {
      const keyword = document.getElementById('deviceKeyword') ? document.getElementById('deviceKeyword').value.trim() : '';
      const status = document.getElementById('deviceStatusFilter') ? document.getElementById('deviceStatusFilter').value : '';
      const rows = (!keyword && !status) ? getNormalVisibleDevices() : getDevicesByFilter(keyword, status);
      const body = document.getElementById('deviceTableBody');
      const countBadge = document.getElementById('pcListCount');
      if (countBadge) countBadge.textContent = `${rows.length}件`;
      body.innerHTML = rows.map(d => `<tr><td><span class="status-pill ${statusClass(d.status)}">${escapeHtml(d.status)}</span></td><td><strong>${escapeHtml(d.model)}</strong></td><td>${escapeHtml(d.serial)}</td><td>${escapeHtml(d.productName)}</td><td>${escapeHtml(d.location)}</td><td>${escapeHtml(d.currentLoanSlipNo || '-')}</td><td>${escapeHtml(formatDateJP(d.lastAuditDate))}</td><td>${escapeHtml(d.sourceType)}</td><td>${escapeHtml(d.notes || '-')}</td><td><div class="status-actions"><button type="button" class="mini-action ok" data-set-status="在庫あり" data-device-id="${escapeHtml(d.id)}">在庫あり</button><button type="button" class="mini-action warn" data-set-status="修理中" data-device-id="${escapeHtml(d.id)}">修理中</button><button type="button" class="mini-action danger" data-set-status="削除" data-device-id="${escapeHtml(d.id)}" ${d.status === '貸出中' ? 'disabled' : ''}>削除</button></div></td></tr>`).join('');
      if (!rows.length) body.innerHTML = '<tr><td colspan="10">該当データがありません。</td></tr>';
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
    document.getElementById('deviceSearchBtn').addEventListener('click', () => { dashboardQuickFilter = ''; renderDeviceTable(); renderSummary(); renderMobileDeviceList(); });
    document.getElementById('summaryCards').addEventListener('click', event => { const card = event.target.closest('.summary-card'); if (!card) return; setDashboardQuickFilter(card.dataset.filter || ''); });
    const mobileFilterWrap = document.getElementById('mobileStatusFilters'); if (mobileFilterWrap) mobileFilterWrap.addEventListener('click', event => { const btn = event.target.closest('.mobile-filter-btn'); if (!btn) return; setDashboardQuickFilter(btn.dataset.filter || ''); });
    document.addEventListener('click', event => { const btn = event.target.closest('[data-set-status]'); if (!btn) return; const nextStatus = btn.dataset.setStatus || ''; const deviceId = btn.dataset.deviceId || ''; if (!deviceId || !nextStatus) return; updateDeviceStatus(deviceId, nextStatus); });
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
    resetDashboardFilters();
    renderLoanDraft();
    renderSummary();
    renderDeviceTable();
    renderMobileDeviceList();
    renderAuditBox();
  
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}