const status = document.querySelector('#status');
const announce = text => { status.textContent = text; };
const icons = () => globalThis.lucide?.createIcons();
const tabs = [...document.querySelectorAll('[data-tab]')];
for (const tab of tabs) {
  tab.addEventListener('click', () => {
    for (const item of tabs) { const active = item === tab; item.setAttribute('aria-selected', String(active)); item.tabIndex = active ? 0 : -1; document.getElementById(item.dataset.tab).hidden = !active; }
    announce('');
  });
  tab.addEventListener('keydown', event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const index = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; tabs[index].click(); tabs[index].focus(); });
}
document.querySelector('.tabs').setAttribute('role', 'tablist');
async function copyLink(relative) {
  const value = new URL(relative, location.origin).href;
  try { await navigator.clipboard.writeText(value); announce('Đã sao chép liên kết.'); }
  catch { const box = document.querySelector('#clipboard-fallback'); box.hidden = false; const input = document.querySelector('#copy-value'); input.value = value; input.focus(); input.select(); announce('Không thể truy cập clipboard. Liên kết đã được chọn.'); }
}
document.addEventListener('click', event => { const button = event.target.closest('[data-copy]'); if (button) copyLink(button.dataset.copy); });
document.querySelector('#close-copy').addEventListener('click', () => { document.querySelector('#clipboard-fallback').hidden = true; });
const nameInput = document.querySelector('#display-name');
nameInput.addEventListener('input', () => {
  nameInput.setCustomValidity('');
  document.querySelector('#profile-name-preview').textContent = nameInput.value.trim() ? 'Locket DNS - ' + nameInput.value.trim() : 'Locket DNS';
});
const idInput = document.querySelector('#dns-id');
idInput.addEventListener('input', () => { document.querySelector('#endpoint').textContent = 'https://dns.nextdns.io/' + idInput.value.toLowerCase(); document.querySelector('#dns-error').hidden = true; });
idInput.addEventListener('invalid', () => { document.querySelector('#dns-error').hidden = false; });
document.querySelector('#dns-form').addEventListener('submit', async event => {
  event.preventDefault();
  const displayName = nameInput.value.trim().normalize('NFC');
  if (!displayName || /[\u0000-\u001f\u007f]/.test(displayName)) {
    nameInput.setCustomValidity('Nhập tên hiển thị hợp lệ.');
    nameInput.reportValidity();
    return;
  }
  const filename = displayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'profile';
  const id = idInput.value.toLowerCase();
  if (!/^[a-f0-9]{6}$/.test(id)) { document.querySelector('#dns-error').hidden = false; return; }
  const button = document.querySelector('#dns-download'); button.disabled = true; announce('');
  try {
    const scope = new FormData(event.currentTarget).get('scope');
    const response = await fetch(scope === 'all' ? '/DNS/NextDNS_LocketGold.mobileconfig' : '/custom_locket_dns.mobileconfig');
    if (!response.ok) throw new Error('Không tải được mẫu cấu hình.');
    const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
    if (xml.querySelector('parsererror')) throw new Error('Mẫu cấu hình không hợp lệ.');
    for (const node of xml.querySelectorAll('string')) node.textContent = node.textContent.replaceAll('9bdf38', id);
    const payloads = [xml.documentElement.firstElementChild, ...xml.querySelectorAll('array > dict')];
    for (const payload of payloads) {
      for (const key of payload.children) {
        if (key.tagName !== 'key') continue;
        const value = key.nextElementSibling;
        if (key.textContent === 'PayloadDisplayName') value.textContent = (payload === payloads[0] ? 'Locket DNS - ' : 'NextDNS - ') + displayName;
        if (key.textContent === 'PayloadUUID') value.textContent = crypto.randomUUID().toUpperCase();
        if (key.textContent === 'PayloadIdentifier') value.textContent = 'io.nguyenanlc9.locketrev.' + id + '.' + scope + (payload === payloads[0] ? '.profile' : '.dns');
      }
    }
    const blob = new Blob([new XMLSerializer().serializeToString(xml)], { type: 'application/x-apple-aspen-config' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'locket-dns-' + filename + '-' + scope + '.mobileconfig'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); announce('Đã tạo profile DNS cho ' + displayName + '.');
  } catch (error) { announce(error.message || 'Không tạo được profile. Vui lòng thử lại.'); }
  finally { button.disabled = false; }
});
async function loadFiles() {
  const container = document.querySelector('#file-list');
  try { const response = await fetch('/web/files.json'); if (!response.ok) throw new Error(); const files = await response.json();
    for (const file of files) { const row = document.createElement('div'); row.className = 'file-row'; const name = document.createElement('span'); name.className = 'file-name'; const icon = document.createElement('i'); icon.dataset.lucide = file.endsWith('.js') ? 'file-code-2' : 'file'; name.append(icon, document.createTextNode(file)); const actions = document.createElement('div'); actions.className = 'file-actions'; const copy = document.createElement('button'); copy.className = 'icon-button'; copy.dataset.copy = '/' + file; copy.title = 'Sao chép liên kết'; copy.setAttribute('aria-label', 'Sao chép ' + file); copy.innerHTML = '<i data-lucide="copy"></i>'; const download = document.createElement('a'); download.className = 'icon-button'; download.href = '/' + file; download.download = ''; download.title = 'Tải xuống'; download.setAttribute('aria-label', 'Tải ' + file); download.innerHTML = '<i data-lucide="download"></i>'; actions.append(copy, download); row.append(name, actions); container.append(row); } icons();
  } catch { container.textContent = 'Không tải được danh sách tệp. Vui lòng tải lại trang.'; }
}
icons(); loadFiles();
