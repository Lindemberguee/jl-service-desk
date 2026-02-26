import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onValueChange: (raw: string) => void;
  prefix?: string;
}

function formatCurrency(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toRawNumber(val: string): string {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return (parseInt(digits, 10) / 100).toString();
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, prefix = "R$", placeholder = "0,00", ...props }, ref) => {
    const [display, setDisplay] = React.useState(() => {
      if (!value) return '';
      const num = parseFloat(value);
      if (isNaN(num)) return '';
      return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    });

    React.useEffect(() => {
      if (!value) {
        setDisplay('');
        return;
      }
      const num = parseFloat(value);
      if (isNaN(num)) return;
      const formatted = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (formatted !== display) {
        setDisplay(formatted);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const formatted = formatCurrency(raw);
      setDisplay(formatted);
      onValueChange(toRawNumber(raw));
    };

    return (
      <div className="relative">
        {prefix && display && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            prefix && display && "pl-10",
            className,
          )}
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          {...props}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
