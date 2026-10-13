/**
 * In một phần tử ra PDF qua iframe riêng — không phụ thuộc layout/overflow của app mẹ,
 * báo cáo nhiều trang tự ngắt trang đúng khổ A4.
 */
export function printElement(el: HTMLElement, title: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    // link → URL tuyệt đối để iframe luôn tải được CSS
    .map((n) => (n instanceof HTMLLinkElement ? `<link rel="stylesheet" href="${n.href}">` : n.outerHTML))
    .join('\n');
  doc.open();
  doc.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${title}</title>${styles}
<style>
  @page { size: A4; margin: 14mm 0 16mm; }
  html, body { margin: 0; background: #fff; }
  .tm-print-root .tm-print-area {
    box-shadow: none !important; margin: 0 !important; --tw-ring-shadow: 0 0 #0000 !important;
    min-height: 0 !important; padding-top: 4mm !important; padding-bottom: 0 !important;
  }
  tr, td, th { break-inside: avoid; }
  h2 { break-after: avoid; }
</style></head>
<body><div class="ctsv-module tm-print-root">${el.outerHTML}</div></body></html>`);
  doc.close();

  const run = () => {
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(() => iframe.remove(), 1000);
  };
  // chờ font/stylesheet trong iframe tải xong
  if (doc.readyState === 'complete') setTimeout(run, 150);
  else iframe.onload = () => setTimeout(run, 150);
}
