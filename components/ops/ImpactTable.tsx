import type { AffectedOrder } from '@/lib/types';
import { Badge, inr } from './ui';

export default function ImpactTable({ orders }: { orders: AffectedOrder[] }) {
  if (!orders.length) {
    return <p className="text-sm text-slate-500">No customer impact. Incident can be closed.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            <th className="py-1.5 pr-3">Order</th>
            <th className="pr-3">Subscriber</th>
            <th className="pr-3">Meal</th>
            <th className="pr-3">Diet</th>
            <th className="pr-3">Cuisine</th>
            <th className="pr-3 text-right">Amount</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((o) => (
            <tr key={o.orderId}>
              <td className="py-1.5 pr-3 font-mono text-xs">{o.orderId}</td>
              <td className="pr-3">
                {o.subscriberName}
                <span className="ml-1 text-xs text-slate-400">{o.subscriberId}</span>
              </td>
              <td className="pr-3 capitalize">{o.meal}</td>
              <td className="pr-3">
                <Badge tone={o.diet === 'Jain' ? 'amber' : 'slate'}>{o.diet}</Badge>
              </td>
              <td className="pr-3">{o.cuisine}</td>
              <td className="pr-3 text-right">{inr(o.amountInr)}</td>
              <td className="space-x-1">
                {o.flags.noPhone && <Badge tone="red">No phone</Badge>}
                {o.flags.possibleDuplicate && <Badge tone="amber">Duplicate record</Badge>}
                {o.flags.paused && <Badge tone="amber">Paused</Badge>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}