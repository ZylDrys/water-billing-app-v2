// ============================================
// PRINTER.JS - Universal Printer Support
// Handles: System Print (WiFi/USB/Network) via
// Blob-URL new window + Web Bluetooth ESC/POS
// ============================================

// === STATE ===
var printerState = {
    mode: 'system',       // 'system' | 'bluetooth'
    device: null,
    server: null,
    characteristic: null,
    connected: false,
    pendingHtml: '',
    pendingBill: null
};

// === BLUETOOTH SERVICE UUIDs (common thermal / receipt printers) ===
var BT_PRINTER_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb', // Generic Serial
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // ESC/POS BLE
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART
    '0000ff00-0000-1000-8000-00805f9b34fb', // Custom serial
    '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC41 series
    '0000fff0-0000-1000-8000-00805f9b34fb'  // Another common profile
];

var BT_CHAR_UUIDS = [
    '000018f1-0000-1000-8000-00805f9b34fb',
    'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
    '49535343-8841-43f4-a8d4-ecbe34729bb3',
    '0000ff01-0000-1000-8000-00805f9b34fb',
    '0000ffe1-0000-1000-8000-00805f9b34fb',
    '0000fff1-0000-1000-8000-00805f9b34fb'
];

// ============================================
// === MAIN ENTRY POINT ===
// Call this instead of the old window.print() approach
// billData: the bill object (or null for bulk HTML)
// htmlContent: the receipt/report HTML string
// ============================================
function printDocument(billData, htmlContent) {
    printerState.pendingHtml = htmlContent || '';
    printerState.pendingBill = billData || null;

    if (printerState.connected) {
        // BT printer is live — show choice modal
        _showPrinterModal();
    } else {
        // No BT printer paired — go straight to system print
        printViaSystem(htmlContent);
    }
}

// ============================================
// === SYSTEM PRINT (WiFi / USB / Network)
// Opens a Blob URL in a new tab so the full
// receipt HTML is loaded BEFORE print() fires.
// Works on Android Chrome, iOS Safari, desktop.
// ============================================
function printViaSystem(htmlContent) {
    closePrinterModal();

    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    var printPage = [
        '<!DOCTYPE html><html><head>',
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">',
        '<title>Receipt</title>',
        '<style>',
        'body{margin:0;padding:0;background:#fff;font-family:"Segoe UI",Arial,sans-serif}',
        '.pbar{display:flex;gap:10px;padding:12px 15px;background:#f4f4f4;',
        'border-bottom:1px solid #ddd;align-items:center;flex-wrap:wrap}',
        '.pbar h4{margin:0;flex:1;font-size:14px;color:#333}',
        '.pbtn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;',
        'border:none;border-radius:7px;font-size:14px;font-weight:700;cursor:pointer}',
        '.pbtn-print{background:#007bff;color:#fff}',
        '.pbtn-close{background:#6c757d;color:#fff}',
        '@media print{.pbar{display:none!important}body{margin:0!important}}',
        '</style></head><body>',
        '<div class="pbar">',
        '<h4>🖨️ Preview — select your printer in the print dialog</h4>',
        '<button class="pbtn pbtn-print" onclick="window.print()">🖨️ Print</button>',
        '<button class="pbtn pbtn-close" onclick="window.close()">✕ Close</button>',
        '</div>',
        htmlContent,
        // Auto-trigger on desktop; on mobile show the button bar and let user tap
        '<script>',
        isMobile
            ? 'window.onload=function(){document.querySelector(".pbar h4").textContent="Tap Print to send to your printer";}'
            : 'window.onload=function(){window.focus();setTimeout(function(){window.print();},400);}',
        '<\/script>',
        '</body></html>'
    ].join('');

    // Blob URL avoids popup blockers on most browsers
    try {
        var blob = new Blob([printPage], { type: 'text/html' });
        var url  = URL.createObjectURL(blob);
        var win  = window.open(url, '_blank');

        if (!win) {
            // Popup blocked — fall back to inline print
            _printInlineFallback(htmlContent);
            return;
        }

        // Clean up object URL after the new window has loaded it
        setTimeout(function () { URL.revokeObjectURL(url); }, 90000);

    } catch (e) {
        _printInlineFallback(htmlContent);
    }
}

// Inline fallback (original approach, but with afterprint guard)
function _printInlineFallback(htmlContent) {
    var el = document.getElementById('printReceipt');
    if (!el) return;
    el.innerHTML = htmlContent;
    window.print();
    // Use afterprint event — never clear content before dialog closes
    var cleared = false;
    function doClear() {
        if (cleared) return;
        cleared = true;
        el.innerHTML = '';
    }
    window.addEventListener('afterprint', function once() {
        doClear();
        window.removeEventListener('afterprint', once);
    });
    // Safety net for browsers that don't fire afterprint
    setTimeout(doClear, 8000);
}

// ============================================
// === BLUETOOTH PRINTER ===
// ============================================
function connectBluetoothPrinter() {
    if (!navigator.bluetooth) {
        alert(
            '⚠ Web Bluetooth is not supported.\n\n' +
            'Requirements:\n' +
            '• Chrome 56+ on Android (not Firefox/Samsung Browser)\n' +
            '• Chrome 70+ on Windows/Mac/Linux\n' +
            '• Must be served over HTTPS or localhost'
        );
        return;
    }

    _setBtStatus('🔍 Scanning for printers…', '#007bff');

    // Try with common printer name prefixes first, then fall back to acceptAllDevices
    var requestOptions = {
        filters: [
            { namePrefix: 'Printer' }, { namePrefix: 'printer' },
            { namePrefix: 'POS' },     { namePrefix: 'RPP' },
            { namePrefix: 'MTP' },     { namePrefix: 'Thermal' },
            { namePrefix: 'Receipt' }, { namePrefix: 'BP' },
            { namePrefix: 'PT' },      { namePrefix: 'Xprinter' },
            { namePrefix: 'ZJ' },      { namePrefix: 'MPT' },
            { namePrefix: 'EPSON' },   { namePrefix: 'Star' }
        ],
        optionalServices: BT_PRINTER_SERVICES
    };

    navigator.bluetooth.requestDevice(requestOptions)
        .catch(function (e) {
            // If no name matched, offer to scan all devices
            if (e.name === 'NotFoundError') {
                return navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: BT_PRINTER_SERVICES
                });
            }
            throw e;
        })
        .then(function (device) {
            printerState.device = device;
            _setBtStatus('🔄 Connecting to ' + device.name + '…', '#f39c12');
            device.addEventListener('gattserverdisconnected', _onBluetoothDisconnect);
            return device.gatt.connect();
        })
        .then(function (server) {
            printerState.server = server;
            return _findWritableCharacteristic(server, 0);
        })
        .then(function (char) {
            printerState.characteristic = char;
            printerState.connected = true;
            var name = printerState.device ? printerState.device.name : 'Printer';
            _setBtStatus('🟢 ' + name, '#28a745');
            _updateBtIndicator();
            _updatePrinterModalUI();
            alert('✅ Connected to ' + name + '\n\nYou can now print via Bluetooth.');
        })
        .catch(function (err) {
            if (err.name === 'NotFoundError' || err.name === 'AbortError') {
                _setBtStatus('⚫ Scan cancelled', '#999');
                return;
            }
            _setBtStatus('❌ Failed: ' + err.message, '#dc3545');
            alert('❌ Connection failed:\n' + err.message + '\n\nTip: Make sure your printer is on and in pairing mode.');
        });
}

function disconnectBluetoothPrinter() {
    if (printerState.device && printerState.device.gatt && printerState.device.gatt.connected) {
        printerState.device.gatt.disconnect();
    }
    _onBluetoothDisconnect();
}

function _onBluetoothDisconnect() {
    printerState.connected = false;
    printerState.characteristic = null;
    printerState.server = null;
    _setBtStatus('⚫ Disconnected', '#999');
    _updateBtIndicator();
    _updatePrinterModalUI();
}

// Walk service list, then characteristic list to find a writable one
function _findWritableCharacteristic(server, svcIdx) {
    if (svcIdx >= BT_PRINTER_SERVICES.length) {
        return Promise.reject(new Error(
            'No compatible printer service found.\n' +
            'The device may not support the ESC/POS printing protocol over BLE.'
        ));
    }
    return server.getPrimaryService(BT_PRINTER_SERVICES[svcIdx])
        .then(function (service) {
            return _findCharInService(service, 0)
                .catch(function () {
                    // None of the known UUIDs — try any writable char in this service
                    return service.getCharacteristics().then(function (chars) {
                        for (var i = 0; i < chars.length; i++) {
                            var p = chars[i].properties;
                            if (p.write || p.writeWithoutResponse) return chars[i];
                        }
                        throw new Error('no writable char in service');
                    });
                });
        })
        .catch(function () {
            return _findWritableCharacteristic(server, svcIdx + 1);
        });
}

function _findCharInService(service, charIdx) {
    if (charIdx >= BT_CHAR_UUIDS.length) return Promise.reject(new Error('exhausted'));
    return service.getCharacteristic(BT_CHAR_UUIDS[charIdx])
        .catch(function () { return _findCharInService(service, charIdx + 1); });
}

// ============================================
// === PRINT VIA BLUETOOTH (ESC/POS) ===
// ============================================
function printViaBluetooth(billData) {
    if (!printerState.connected || !printerState.characteristic) {
        alert('❌ No Bluetooth printer connected.\nPlease connect one first.');
        return Promise.resolve();
    }
    closePrinterModal();

    var bill = billData || printerState.pendingBill;
    if (!bill) {
        alert('❌ No bill data to print via Bluetooth.\nUse System Print for bulk/report printing.');
        return Promise.resolve();
    }

    var data = _buildEscPosReceipt(bill);
    return _sendInChunks(printerState.characteristic, data)
        .then(function () {
            // small success toast
            _showToast('✅ Sent to printer');
        })
        .catch(function (err) {
            alert('❌ Bluetooth print error:\n' + err.message + '\n\nTry System Print instead.');
        });
}

// Send byte array in 512-byte chunks (BLE MTU limit)
function _sendInChunks(char, uint8arr, chunkSize) {
    chunkSize = chunkSize || 512;
    var chunks = [];
    for (var i = 0; i < uint8arr.length; i += chunkSize) {
        chunks.push(uint8arr.slice(i, i + chunkSize));
    }
    return chunks.reduce(function (p, chunk) {
        return p.then(function () {
            return (char.writeValueWithoutResponse || char.writeValue).call(char, chunk);
        });
    }, Promise.resolve());
}

// ============================================
// === ESC/POS RECEIPT BUILDER ===
// Standard 58mm / 80mm thermal receipt format
// ============================================
function _buildEscPosReceipt(bill) {
    var bytes = [];
    var c  = (typeof getCustomization === 'function') ? getCustomization() : {};
    var s  = (typeof getSettings     === 'function') ? getSettings()      : { pricePerCubic: 0, minCharge: 0 };
    var cs = (typeof getData         === 'function') ? getData('customers') : [];
    var sym = (typeof getCurrencySymbol === 'function') ? getCurrencySymbol() : '$';
    var cust = cs.find(function (x) { return x.id === bill.customerId; });
    var custName = cust ? cust.name : 'Unknown';
    var W = 32; // character width (32 for 58mm, 42 for 80mm)

    function b(arr)     { arr.forEach(function (v) { bytes.push(v); }); }
    function text(str)  { for (var i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i) & 0xFF); }
    function nl()       { bytes.push(0x0A); }
    function line(str)  { text(str); nl(); }
    function div()      { line('--------------------------------'); }
    function bold(on)   { b(on ? [0x1B,0x45,0x01] : [0x1B,0x45,0x00]); }
    function align(a)   { b([0x1B,0x61, a === 'C' ? 1 : a === 'R' ? 2 : 0]); }
    function dbl(on)    { b([0x1B,0x21, on ? 0x30 : 0x00]); }

    function padRight(str, len) {
        str = String(str);
        while (str.length < len) str += ' ';
        return str.substring(0, len);
    }
    function padLeft(str, len) {
        str = String(str);
        while (str.length < len) str = ' ' + str;
        return str.substring(str.length - len);
    }
    function twoCol(l, r) {
        var total = W;
        var sp = Math.max(1, total - l.length - r.length);
        return l + ' '.repeat(sp) + r;
    }
    function money(v) { return sym + (parseFloat(v) || 0).toFixed(2); }

    // Init
    b([0x1B, 0x40]);

    // Header
    align('C');
    if (c.companyName) {
        dbl(true);
        line((c.companyName).substring(0, 20).toUpperCase());
        dbl(false);
    } else {
        bold(true); line('WATER BILLING'); bold(false);
    }
    if (c.companyAddress) line(c.companyAddress.substring(0, W));
    if (c.companyPhone)   line(c.companyPhone.substring(0, W));
    if (c.companyEmail)   line(c.companyEmail.substring(0, W));

    align('C'); bold(true); line('-- OFFICIAL BILLING --'); bold(false);
    align('L'); div();

    // Details
    if (bill.ref) line('Ref : ' + bill.ref);
    line(twoCol('Customer:', custName.substring(0, W - 10)));
    line(twoCol('Date:', new Date(bill.date).toLocaleDateString()));
    div();

    line(twoCol('Previous Reading:', bill.prevReading + ' m\xB3'));
    line(twoCol('Present  Reading:', bill.presReading + ' m\xB3'));
    bold(true);
    line(twoCol('Consumption:', bill.totalUsed + ' m\xB3'));
    bold(false);
    div();

    line(twoCol('Rate / m\xB3:', money(s.pricePerCubic)));
    line(twoCol('Computed:', money(bill.totalUsed * s.pricePerCubic)));
    line(twoCol('Min Charge:', money(s.minCharge)));
    if (bill.penaltyAmount > 0) {
        line(twoCol('Penalty (' + (bill.penaltyRate || 0) + '%):', money(bill.penaltyAmount)));
    }
    div();

    // Total
    align('C');
    line('TOTAL DUE');
    dbl(true); bold(true);
    line(money(bill.totalDue));
    bold(false); dbl(false);
    div();

    // Footer
    align('C');
    line('Thank you for your payment!');
    line(new Date().toLocaleString());

    // Feed 3 lines + full cut
    b([0x0A, 0x0A, 0x0A]);
    b([0x1D, 0x56, 0x42, 0x00]);

    return new Uint8Array(bytes);
}

// ============================================
// === PRINTER SELECTION MODAL (UI) ===
// ============================================
function _showPrinterModal() {
    var m = document.getElementById('printerModal');
    if (m) { m.style.display = 'flex'; _updatePrinterModalUI(); }
}

function closePrinterModal() {
    var m = document.getElementById('printerModal');
    if (m) m.style.display = 'none';
}

function _updatePrinterModalUI() {
    var st = document.getElementById('btPrinterStatus');
    if (!st) return;
    if (printerState.connected && printerState.device) {
        st.innerHTML = '<span style="color:#28a745">🟢 ' + printerState.device.name + '</span>';
    } else {
        st.innerHTML = '<span style="color:#999">⚫ No Bluetooth printer connected</span>';
    }
    var btBtn = document.getElementById('btPrintBtn');
    var dcBtn = document.getElementById('btDisconnectBtn');
    var cnBtn = document.getElementById('btConnectBtn');
    if (btBtn) btBtn.disabled = !printerState.connected;
    if (dcBtn) dcBtn.style.display = printerState.connected ? 'block' : 'none';
    if (cnBtn) cnBtn.style.display = printerState.connected ? 'none' : 'block';
}

function _updateBtIndicator() {
    var ind = document.getElementById('btPrinterIndicator');
    if (!ind) return;
    if (printerState.connected && printerState.device) {
        ind.style.display = 'block';
        ind.title = 'BT Printer: ' + printerState.device.name;
    } else {
        ind.style.display = 'none';
    }
}

function _setBtStatus(msg, color) {
    var el = document.getElementById('btPrinterStatus');
    if (el) el.innerHTML = '<span style="color:' + color + '">' + msg + '</span>';
}

// ============================================
// === TINY TOAST ===
// ============================================
function _showToast(msg) {
    var t = document.createElement('div');
    t.style.cssText = [
        'position:fixed;bottom:80px;left:50%;transform:translateX(-50%)',
        'background:rgba(0,0,0,.75);color:#fff;padding:10px 20px',
        'border-radius:20px;font-size:13px;z-index:99999',
        'animation:fadeInOut 2.5s forwards'
    ].join(';');
    t.textContent = msg;

    // Inject keyframes once
    if (!document.getElementById('toastKf')) {
        var st = document.createElement('style');
        st.id = 'toastKf';
        st.textContent = '@keyframes fadeInOut{0%{opacity:0;transform:translateX(-50%) translateY(10px)}' +
            '15%{opacity:1;transform:translateX(-50%) translateY(0)}' +
            '75%{opacity:1}100%{opacity:0}}';
        document.head.appendChild(st);
    }

    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
}
