import { Icon } from '@iconify/react'
import type { Payslip } from '@/api/types'
import { Button } from '@/components/ui/Primitives'
import { fmtMoney, monthName, numberToWords } from '@/lib/format'

interface CorporatePayslipModalProps {
  slip: Payslip
  onClose: () => void
}

export function CorporatePayslipModal({ slip, onClose }: CorporatePayslipModalProps) {
  const handlePrint = () => {
    const elem = document.getElementById('corporate-payslip-content')
    if (!elem) return

    // Create an invisible iframe for reliable, zero-popup print execution
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) return

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip_${slip.employee_code || 'Employee'}_${monthName(slip.period_month)}_${slip.period_year}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', -apple-system, sans-serif; background: #ffffff; color: #0f172a; padding: 24px; font-size: 12px; line-height: 1.5; }
            .slip-card { max-width: 800px; margin: 0 auto; border: 2px solid #0f172a; border-radius: 12px; padding: 32px; background: #ffffff; }
            
            .header-flex { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 20px; }
            .logo-badge { width: 40px; height: 40px; background: #0f172a; color: #ffffff; font-size: 20px; font-weight: 800; display: flex; align-items: center; justify-content: center; border-radius: 10px; margin-right: 12px; }
            .company-title { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
            .company-sub { font-size: 11px; color: #64748b; margin-top: 2px; }

            .slip-badge { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
            .slip-period { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 6px; text-align: right; }
            .slip-ref { font-size: 11px; font-family: monospace; color: #64748b; margin-top: 2px; text-align: right; }

            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
            .meta-col { display: flex; flex-direction: column; gap: 8px; }
            .meta-item { display: flex; justify-content: space-between; border-bottom: 1px border #e2e8f0; padding-bottom: 6px; font-size: 12px; }
            .meta-item:last-child { border-bottom: none; }
            .meta-label { color: #64748b; font-weight: 500; }
            .meta-value { font-weight: 700; color: #0f172a; }

            table { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
            th { background: #0f172a; color: #ffffff; font-weight: 700; text-transform: uppercase; font-size: 11px; padding: 10px 12px; letter-spacing: 0.5px; }
            td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
            tr:nth-child(even) { background: #f8fafc; }
            .subtotal-row { background: #f1f5f9; font-weight: 800; border-top: 2px solid #cbd5e1; color: #0f172a; }

            .net-box { background: #ecfdf5; border: 2px solid #10b981; border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
            .net-label { font-size: 11px; font-weight: 800; uppercase: true; text-transform: uppercase; color: #065f46; letter-spacing: 0.5px; }
            .net-words { font-size: 11px; font-weight: 600; color: #047857; margin-top: 4px; font-style: italic; }
            .net-amount { font-size: 26px; font-weight: 900; font-family: monospace; color: #047857; }

            .footer-flex { border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
            .footer-text { font-size: 11px; color: #64748b; line-height: 1.4; }
            .stamp-box { text-align: center; border-top: 2px solid #0f172a; padding-top: 4px; width: 160px; font-size: 11px; font-weight: 700; color: #0f172a; }
            
            .text-emerald { color: #047857; }
            .text-rose { color: #e11d48; }
            .text-right { text-align: right; }
            .font-mono { font-family: monospace; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          <div class="slip-card">
            ${elem.innerHTML}
          </div>
        </body>
      </html>
    `
    doc.open()
    doc.write(htmlContent)
    doc.close()

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 1000)
    }, 200)
  }

  const grossNum = Number(slip.gross || 0)
  const dedNum = Number(slip.deductions || 0)
  const netNum = Number(slip.net_pay || 0)

  // Standard corporate itemized split for clear slip presentation
  const basicPay = Math.round(grossNum * 0.5 * 100) / 100
  const hraPay = Math.round(grossNum * 0.3 * 100) / 100
  const allowancesPay = Math.round((grossNum - basicPay - hraPay) * 100) / 100

  const pfDed = Math.round(dedNum * 0.6 * 100) / 100
  const taxDed = Math.round((dedNum - pfDed) * 100) / 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 my-8"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-flow-600 text-white">
              <Icon icon="mdi:file-document-outline" className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Official Corporate Payslip</h3>
              <p className="text-[11px] text-slate-400">
                {slip.employee_name} · {monthName(slip.period_month)} {slip.period_year}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-flow-600 hover:bg-flow-500 text-white shadow-xs px-3.5 py-1.5 rounded-xl"
            >
              <Icon icon="mdi:printer" className="h-4 w-4" />
              <span>Download PDF</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Icon icon="mdi:close" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Payslip Card Container (Targeted for HTML PDF printing) */}
        <div id="corporate-payslip-content" className="p-6 sm:p-8 bg-white space-y-6 text-slate-900">
          {/* Header Section */}
          <div className="header-flex flex flex-col sm:flex-row justify-between items-start pb-6 border-b-2 border-slate-900 gap-4">
            <div className="flex items-center gap-2.5">
              <div className="logo-badge grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white font-extrabold text-xl">
                D
              </div>
              <div>
                <h1 className="company-title text-xl font-extrabold tracking-tight text-slate-900">
                  Dayflow Technologies Inc.
                </h1>
                <p className="company-sub text-xs font-medium text-slate-500">
                  100 Innovation Way, Suite 400, Tech Park · payroll@dayflow.co
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="slip-badge inline-block rounded-lg bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-900 tracking-wider uppercase border border-slate-300">
                CONFIDENTIAL PAYSLIP
              </span>
              <p className="slip-period mt-1.5 text-sm font-extrabold text-slate-900">
                {monthName(slip.period_month).toUpperCase()} {slip.period_year}
              </p>
              <p className="slip-ref text-[11px] font-mono text-slate-500">
                REF: SLIP-{slip.period_year}{String(slip.period_month).padStart(2, '0')}-{slip.employee_code || slip.employee_id}
              </p>
            </div>
          </div>

          {/* Employee & Period Details Grid */}
          <div className="meta-grid grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs">
            <div className="meta-col space-y-2">
              <div className="meta-item flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="meta-label text-slate-500 font-medium">Employee Name:</span>
                <span className="meta-value font-bold text-slate-900">{slip.employee_name}</span>
              </div>
              <div className="meta-item flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="meta-label text-slate-500 font-medium">Employee ID:</span>
                <span className="meta-value font-bold text-slate-900 font-mono">{slip.employee_code || `DF-${slip.employee_id}`}</span>
              </div>
              <div className="meta-item flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="meta-label text-slate-500 font-medium">Pay Period:</span>
                <span className="meta-value font-bold text-slate-900">{monthName(slip.period_month)} {slip.period_year}</span>
              </div>
              <div className="meta-item flex justify-between">
                <span className="meta-label text-slate-500 font-medium">Payment Mode:</span>
                <span className="meta-value font-bold text-slate-900">Direct Bank Transfer (ACH)</span>
              </div>
            </div>

            <div className="meta-col space-y-2 sm:border-l sm:border-slate-200 sm:pl-4">
              <div className="meta-item flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="meta-label text-slate-500 font-medium">Total Work Days:</span>
                <span className="meta-value font-bold text-slate-900">{slip.working_days} Days</span>
              </div>
              <div className="meta-item flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="meta-label text-slate-500 font-medium">Days Paid:</span>
                <span className="meta-value font-bold text-emerald-700">{slip.paid_days} Days</span>
              </div>
              <div className="meta-item flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="meta-label text-slate-500 font-medium">LOP / Unpaid Days:</span>
                <span className="meta-value font-bold text-rose-600">{slip.lop_days} Days</span>
              </div>
              <div className="meta-item flex justify-between">
                <span className="meta-label text-slate-500 font-medium">Currency:</span>
                <span className="meta-value font-bold text-slate-900 font-mono">{slip.currency || 'USD'}</span>
              </div>
            </div>
          </div>

          {/* Dual Column Itemized Earnings & Deductions Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 text-xs">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase text-[11px] tracking-wider">
                  <th className="p-3 text-left w-1/2">Earnings Description</th>
                  <th className="p-3 text-right pr-4 border-r border-slate-800">Amount ({slip.currency})</th>
                  <th className="p-3 text-left w-1/2 pl-4">Deductions Description</th>
                  <th className="p-3 text-right pr-4">Amount ({slip.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="bg-white">
                  <td className="p-3 font-medium">Basic Salary</td>
                  <td className="p-3 text-right pr-4 font-mono font-semibold text-slate-900 border-r border-slate-100">
                    {fmtMoney(basicPay, slip.currency)}
                  </td>
                  <td className="p-3 pl-4 font-medium">Provident Fund (PF) / Income Tax</td>
                  <td className="p-3 text-right pr-4 font-mono font-semibold text-rose-600">
                    {fmtMoney(pfDed, slip.currency)}
                  </td>
                </tr>

                <tr className="bg-slate-50/50">
                  <td className="p-3 font-medium">House Rent Allowance (HRA)</td>
                  <td className="p-3 text-right pr-4 font-mono font-semibold text-slate-900 border-r border-slate-100">
                    {fmtMoney(hraPay, slip.currency)}
                  </td>
                  <td className="p-3 pl-4 font-medium">Professional & Statutory Tax</td>
                  <td className="p-3 text-right pr-4 font-mono font-semibold text-rose-600">
                    {fmtMoney(taxDed, slip.currency)}
                  </td>
                </tr>

                <tr className="bg-white">
                  <td className="p-3 font-medium">Special & Conveyance Allowances</td>
                  <td className="p-3 text-right pr-4 font-mono font-semibold text-slate-900 border-r border-slate-100">
                    {fmtMoney(allowancesPay, slip.currency)}
                  </td>
                  <td className="p-3 pl-4 font-medium text-slate-400">LOP Adjustment</td>
                  <td className="p-3 text-right pr-4 font-mono text-slate-400">
                    {fmtMoney(0, slip.currency)}
                  </td>
                </tr>

                {/* Subtotals Row */}
                <tr className="subtotal-row bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-200">
                  <td className="p-3">Total Gross Earnings</td>
                  <td className="p-3 text-right pr-4 font-mono text-emerald-700 border-r border-slate-200">
                    {fmtMoney(slip.gross, slip.currency)}
                  </td>
                  <td className="p-3 pl-4">Total Deductions</td>
                  <td className="p-3 text-right pr-4 font-mono text-rose-600">
                    {fmtMoney(slip.deductions, slip.currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Net Take-Home Salary Highlight Box */}
          <div className="net-box flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl bg-emerald-50/90 border-2 border-emerald-500 p-4 sm:p-5 gap-3">
            <div>
              <span className="net-label text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                NET SALARY PAYABLE
              </span>
              <p className="net-words text-xs font-semibold text-emerald-950 mt-1 italic">
                Amount in Words: <span className="font-bold">{numberToWords(netNum)}</span>
              </p>
            </div>
            <div className="text-right self-end sm:self-auto">
              <span className="net-amount text-2xl sm:text-3xl font-black font-mono text-emerald-700 tracking-tight">
                {fmtMoney(netNum, slip.currency)}
              </span>
            </div>
          </div>

          {/* Corporate Footer & Security Disclaimer */}
          <div className="footer-flex pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs">
            <div className="footer-text space-y-1 text-slate-500 text-[11px]">
              <p className="font-bold text-slate-800">Dayflow Automated Payroll System</p>
              <p>This is a system-generated document and does not require a physical signature.</p>
              <p>For payroll inquiries, contact Human Resources at <span className="text-slate-800 font-medium">hr@dayflow.co</span>.</p>
            </div>

            <div className="stamp-box text-center border-t-2 border-slate-900 pt-2 w-44">
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 mb-0.5">
                <Icon icon="mdi:check-decagram" className="h-4 w-4" />
                <span>AUTHORIZED</span>
              </span>
              <p className="text-[11px] font-bold text-slate-900">Finance & Payroll Dept</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <Button
            variant="secondary"
            onClick={onClose}
            className="text-xs font-semibold px-4"
          >
            Close
          </Button>
          <Button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-4"
          >
            <Icon icon="mdi:download" className="h-4 w-4" />
            <span>Download PDF</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
