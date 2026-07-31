import * as React from "react";
import { Input } from "./input";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, 'onChange'> {
    value: number;
    onChange: (value: number) => void;
    currency?: "COP" | "USD";
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
    ({ value, onChange, currency = "COP", ...props }, ref) => {
        const formatValue = (val: number) => {
            if (val === 0) return "";
            return new Intl.NumberFormat(currency === "USD" ? "en-US" : "es-CO", {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
            }).format(val);
        };

        const [displayValue, setDisplayValue] = React.useState(formatValue(value));

        React.useEffect(() => {
            setDisplayValue(formatValue(value));
        }, [value, currency]);

        const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const rawValue = e.target.value.replace(/[^0-9]/g, "");
            const numericValue = parseInt(rawValue, 10) || 0;

            setDisplayValue(formatValue(numericValue));
            onChange(numericValue);
        };

        return (
            <Input
                {...props}
                ref={ref}
                value={displayValue}
                onChange={handleTextChange}
                placeholder={props.placeholder || "$ 0"}
            />
        );
    }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
