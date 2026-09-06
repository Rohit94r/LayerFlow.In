import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const Table = ({ className, ...props }: HTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto">
    <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />
  </div>
);

const THead = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("border-b border-border", className)} {...props} />
);

const TBody = ({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("divide-y divide-border", className)} {...props} />
);

const TR = ({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("transition-colors duration-100", className)} {...props} />
);

const TH = ({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn("px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-faint", className)}
    {...props}
  />
);

const TD = ({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("px-4 py-3 text-[13px] text-muted", className)} {...props} />
);

export { Table, THead, TBody, TR, TH, TD };
