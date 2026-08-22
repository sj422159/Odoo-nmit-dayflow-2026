import { useRef } from 'react'
import { Icon } from '@iconify/react'
import type { Payslip } from '@/api/types'
import { Button } from '@/components/ui/Primitives'
import { fmtMoney, monthName, numberToWords } from '@/lib/format'

interface CorporatePayslipModalProps {
  slip: Payslip
  onClose: () => void
}

export function CorporatePayslipModal({ slip, onClose }: CorporatePayslipModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank', 'width=900,height=1000')
    if (!printWindow) {
      window.print()
      return
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip_${slip.employee_code || 'Employee'}_${monthName(slip.period_month)}_${slip.period_year}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', sans-serif; background: #ffffff; color: #0f172a; padding: 32px; font-size: 13px; line-height: 1.5; }
            .slip-container { max-width: 800px; margin: 0 auto; border: 2px solid #e2e8f0; border-radius: 12px; padding: 32px; }
            .header-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px; }
            .company-name { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
            .company-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
            .slip-title-box { text-align: right; }
            .slip-title { font-size: 14px; font-weight: 800; text-transform: uppercase; color: #2563eb; letter-spacing: 0.5px; }
            .slip-period { font-size: 12px; font-weight: 600; color: #475569; margin-top: 4px; }
            
            .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
            .meta-item { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #cbd5e1; font-size: 12px; }
            .meta-item:last-child { border-bottom: none; }
            .meta-label { color: #64748b; font-weight: 500; }
            .meta-val { font-weight: 700; color: #0f172a; }

            .salary-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            .salary-table th { background: #0f172a; color: #ffffff; font-weight: 700; text-align: left; padding: 10px 14px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .salary-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
            .salary-table tr:nth-child(even) { background: #f8fafc; }
            .col-half { width: 50%; }
            .amount { text-align: right; font-family: monospace; font-weight: 600; }
            .total-row td { font-weight: 800; background: #f1f5f9; border-top: 2px solid #cbd5e1; }

            .net-pay-box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 10px; padding: 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
            .net-label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #166534; letter-spacing: 0.5px; }
            .net-words { font-size: 11px; color: #15803d; margin-top: 4px; font-style: italic; }
            .net-amount { font-size: 24px; font-weight: 800; color: #15803d; font-family: monospace; }

            .footer-notes { border-top: 1px solid #e2e8f0; pt-16px; margin-top: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
            .disclaimer { font-size: 10px; color: #94a3b8; max-width: 480px; }
            .sign-stamp { text-align: center; border-top: 1px solid #0f172a; padding-top: 8px; width: 180px; font-size: 11px; font-weight: 700; color: #0f172a; }
          </style>
        </head>
        <body>
          <div class="slip-container">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `
    printWindow.document.open()
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  const grossNum = Number(slip.gross || 0)
  const dedNum = Number(slip.deductions || 0)
  const netNum = Number(slip.net_pay || 0)

  // Standard corporate split estimation for detailed presentation
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
        {/* Top Control Bar (Screen only) */}
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
              <span>Download PDF / Print</span>
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

        {/* Printable Payslip Body */}
        <div className="p-6 sm:p-8 bg-white space-y-6 text-slate-900" ref={printRef}>
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b-2 border-slate-900 gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white font-extrabold text-lg">
                  D
                </div>
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                    Dayflow Technologies Inc.
                  </h1>
                  <p className="text-xs font-medium text-slate-500">
                    100 Innovation Way, Suite 400, Tech Park · payroll@dayflow.co
                  </p>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-block rounded-lg bg-flow-50 px-3 py-1 text-xs font-extrabold text-flow-700 tracking-wider uppercase border border-flow-200">
                PAYSLIP STATEMENT
              </span>
              <p className="mt-1.5 text-sm font-bold text-slate-800">
                {monthName(slip.period_month).toUpperCase()} {slip.period_year}
              </p>
              <p className="text-[11px] font-mono text-slate-400">
                REF: SLIP-{slip.period_year}{String(slip.period_month).padStart(2, '0')}-{slip.employee_code || slip.employee_id}
              </p>
            </div>
          </div>

          {/* Employee & Period Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500 font-medium">Employee Name:</span>
                <span className="font-bold text-slate-900">{slip.employee_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500 font-medium">Employee ID:</span>
                <span className="font-bold text-slate-900 font-mono">{slip.employee_code || `DF-${slip.employee_id}`}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500 font-medium">Pay Period:</span>
                <span className="font-bold text-slate-900">{monthName(slip.period_month)} {slip.period_year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Payment Mode:</span>
                <span className="font-bold text-slate-900">Direct Bank Transfer (ACH)</span>
              </div>
            </div>

            <div className="space-y-2 sm:border-l sm:border-slate-200 sm:pl-4">
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500 font-medium">Total Work Days:</span>
                <span className="font-bold text-slate-900">{slip.working_days} Days</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500 font-medium">Days Paid:</span>
                <span className="font-bold text-emerald-700">{slip.paid_days} Days</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500 font-medium">LOP / Unpaid Days:</span>
                <span className="font-bold text-rose-600">{slip.lop_days} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Currency:</span>
                <span className="font-bold text-slate-900 font-mono">{slip.currency || 'USD'}</span>
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
                <tr className="bg-slate-100/80 font-bold text-slate-900 border-t-2 border-slate-200">
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl bg-emerald-50 border-2 border-emerald-500/80 p-4 sm:p-5 gap-3">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                NET SALARY PAYABLE
              </span>
              <p className="text-xs font-semibold text-emerald-900 mt-1 italic">
                Amount in Words: <span className="font-bold">{numberToWords(netNum)}</span>
              </p>
            </div>
            <div className="text-right self-end sm:self-auto">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 tracking-tight">
                {fmtMoney(netNum, slip.currency)}
              </span>
            </div>
          </div>

          {/* Corporate Footer & Security Disclaimer */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs">
            <div className="space-y-1 text-slate-400 text-[11px]">
              <p className="font-semibold text-slate-600">Dayflow Automated Payroll System</p>
              <p>This is a system-generated document and does not require a physical signature.</p>
              <p>For payroll inquiries, contact Human Resources at <span className="text-slate-600 font-medium">hr@dayflow.co</span>.</p>
            </div>

            <div className="text-center border-t border-slate-800 pt-2 w-44">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 mb-1">
                <Icon icon="mdi:check-decagram" className="h-4 w-4" />
                <span>AUTHORIZED</span>
              </span>
              <p className="text-[11px] font-bold text-slate-900">Finance & Payroll Dept</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions (Screen only) */}
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
