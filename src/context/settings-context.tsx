"use client";

import { createContext, useContext, type ReactNode } from "react";
import { formatCurrency } from "@/lib/utils";

export interface BusinessSettingsContextValue {
  /** Currency symbol, e.g. "$", "Rp", "€" */
  currency: string;
  /** Number of decimal places for currency display */
  currencyDecimals: number;
  /** Default tax rate (0-1, e.g. 0.1 = 10%) */
  taxRate: number;
  /** Language / locale code */
  language: string;
  /** Business name */
  name: string;
  /** Logo URL */
  logoUrl: string | null;
  /** Tax label (e.g. "Tax", "VAT") */
  taxName: string;
  /** Receipt footer text */
  receiptFooter: string;
  /** Format a number as currency using the current business settings */
  fmt: (amount: number | string) => string;
}

const defaultValue: BusinessSettingsContextValue = {
  currency: "$",
  currencyDecimals: 2,
  taxRate: 0,
  language: "en",
  name: "My Store",
  logoUrl: null,
  taxName: "Tax",
  receiptFooter: "Thank you for your purchase!",
  fmt: (amount) => formatCurrency(amount, "$", 2, "en"),
};

const SettingsContext = createContext<BusinessSettingsContextValue>(defaultValue);

interface SettingsProviderProps {
  children: ReactNode;
  value: Omit<BusinessSettingsContextValue, "fmt">;
}

export function SettingsProvider({ children, value }: SettingsProviderProps) {
  const ctx: BusinessSettingsContextValue = {
    ...value,
    fmt: (amount) =>
      formatCurrency(amount, value.currency, value.currencyDecimals, value.language),
  };
  return (
    <SettingsContext.Provider value={ctx}>{children}</SettingsContext.Provider>
  );
}

/**
 * Access business settings (currency, tax, etc.) from any client component
 * inside the (app) layout.
 */
export function useSettings(): BusinessSettingsContextValue {
  return useContext(SettingsContext);
}
