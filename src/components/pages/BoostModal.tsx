"use client";

import { useState, useEffect, useMemo } from "react";
import type { AdAccount, PagePost } from "@/lib/types";
import type { BoostConfig } from "@/lib/api/boostPost";
import { boostPost, WORLDWIDE_COUNTRIES } from "@/lib/api/boostPost";

interface BoostModalProps {
  post: PagePost | null;
  pageId: string;
  adAccounts: AdAccount[];
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DURATION_OPTIONS = [1, 3, 7, 14, 30];

// Pre-built sorted country list using built-in browser API
let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch {
  // Fallback: no localized names
}

function getCountryName(code: string): string {
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

const ALL_COUNTRIES = WORLDWIDE_COUNTRIES.map((code) => ({
  code,
  name: getCountryName(code),
})).sort((a, b) => a.name.localeCompare(b.name));

function CountryPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? ALL_COUNTRIES.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q),
        )
      : ALL_COUNTRIES;
  }, [search]);

  function toggle(code: string) {
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code],
    );
  }

  function selectAll() {
    onChange(WORLDWIDE_COUNTRIES);
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div>
      {/* Selected summary */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selected.length >= WORLDWIDE_COUNTRIES.length ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/20">
              All countries
              <button
                onClick={clearAll}
                className="hover:text-status-red transition-colors ml-0.5"
              >
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ) : (
            <>
              {selected.slice(0, 4).map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/20"
                >
                  {getCountryName(code)}
                  <button
                    onClick={() => toggle(code)}
                    className="hover:text-status-red transition-colors ml-0.5"
                  >
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
              {selected.length > 4 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-bg-secondary text-text-muted border border-border">
                  +{selected.length - 4} more
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Search + quick actions */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search countries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50"
          />
        </div>
        <button
          onClick={selectAll}
          className="text-xs text-accent hover:text-accent/80 whitespace-nowrap transition-colors px-1"
        >
          All
        </button>
        <button
          onClick={clearAll}
          className="text-xs text-text-muted hover:text-text-secondary whitespace-nowrap transition-colors px-1"
        >
          Clear
        </button>
      </div>

      {/* Country list */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="max-h-[200px] overflow-y-auto divide-y divide-border/50 overscroll-contain">
          {filtered.length === 0 && (
            <p className="text-xs text-text-muted text-center py-4">
              No results
            </p>
          )}
          {filtered.map(({ code, name }) => {
            const checked = selected.includes(code);
            return (
              <label
                key={code}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? "bg-accent/5" : "hover:bg-white/[0.03]"}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(code)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${checked ? "bg-accent border-accent" : "border-border"}`}
                >
                  {checked && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-text-primary flex-1">{name}</span>
                <span className="text-xs text-text-muted font-mono">
                  {code}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-text-muted mt-2 text-right">
          {selected.length} {selected.length === 1 ? "country" : "countries"}{" "}
          selected
        </p>
      )}
    </div>
  );
}

export function BoostModal({
  post,
  pageId,
  adAccounts,
  token,
  onClose,
  onSuccess,
}: BoostModalProps) {
  const [step, setStep] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [dailyBudget, setDailyBudget] = useState("100000");
  const [durationDays, setDurationDays] = useState(7);
  const [targetingType, setTargetingType] =
    useState<BoostConfig["targeting_type"]>("broad");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (adAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(adAccounts[0].id.replace("act_", ""));
    }
  }, [adAccounts, selectedAccount]);

  useEffect(() => {
    if (post) {
      setStep(1);
      setError("");
    }
  }, [post]);

  if (!post) return null;

  const selectedAdAccount = adAccounts.find(
    (a) => a.id.replace("act_", "") === selectedAccount,
  );
  const currency = selectedAdAccount?.currency ?? "USD";
  const totalBudget = (parseFloat(dailyBudget) * durationDays).toLocaleString();

  async function handleBoost() {
    if (!selectedAccount || selectedCountries.length === 0) return;
    setLoading(true);
    setError("");
    try {
      await boostPost(
        selectedAccount,
        pageId,
        post!.id,
        {
          daily_budget: dailyBudget,
          duration_days: durationDays,
          targeting_type: targetingType,
          countries: selectedCountries,
        },
        token,
      );
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Boost failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative w-full sm:max-w-md bg-bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Boost Post
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-secondary rounded-lg hover:bg-white/5"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-bg-secondary">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Step content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {step === 1 && (
            <>
              <h3 className="text-sm font-semibold text-text-primary">
                Select Ad Account
              </h3>
              {adAccounts.map((acc) => (
                <label
                  key={acc.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedAccount === acc.id.replace("act_", "")
                      ? "border-accent bg-accent/5"
                      : "border-border bg-bg-secondary hover:bg-white/[0.03]"
                  }`}
                >
                  <input
                    type="radio"
                    name="account"
                    value={acc.id.replace("act_", "")}
                    checked={selectedAccount === acc.id.replace("act_", "")}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedAccount === acc.id.replace("act_", "")
                        ? "border-accent"
                        : "border-border"
                    }`}
                  >
                    {selectedAccount === acc.id.replace("act_", "") && (
                      <div className="w-2 h-2 rounded-full bg-accent" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {acc.name}
                    </p>
                    <p className="text-xs text-text-muted">{acc.id}</p>
                  </div>
                </label>
              ))}
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-sm font-semibold text-text-primary">
                Budget & Duration
              </h3>
              <div>
                <label className="text-xs text-text-muted mb-2 block">
                  Daily budget ({currency})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  className="w-full text-2xl text-center font-bold bg-bg-secondary border border-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <div className="flex justify-center gap-3 mt-3">
                  {[50000, 100000, 200000, 500000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setDailyBudget(String(v))}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        dailyBudget === String(v)
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      {(v / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted mb-2 block">
                  Number of days
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDurationDays(d)}
                      className={`flex-1 min-w-[48px] py-2 text-sm font-medium rounded-xl border transition-colors ${
                        durationDays === d
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-bg-secondary rounded-xl p-3 text-center">
                <p className="text-xs text-text-muted">
                  Estimated total budget
                </p>
                <p className="text-xl font-bold text-text-primary mt-1">
                  {totalBudget} {currency}
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="text-sm font-semibold text-text-primary">
                Target Audience
              </h3>
              {[
                {
                  value: "broad",
                  label: "Broad audience",
                  desc: "Reach the widest audience without age restrictions",
                },
                {
                  value: "custom",
                  label: "Custom age range",
                  desc: "Target audience aged 18–65 (adjustable)",
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    targetingType === opt.value
                      ? "border-accent bg-accent/5"
                      : "border-border bg-bg-secondary hover:bg-white/[0.03]"
                  }`}
                >
                  <input
                    type="radio"
                    name="targeting"
                    value={opt.value}
                    checked={
                      targetingType ===
                      (opt.value as BoostConfig["targeting_type"])
                    }
                    onChange={() =>
                      setTargetingType(
                        opt.value as BoostConfig["targeting_type"],
                      )
                    }
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
                      targetingType === opt.value
                        ? "border-accent"
                        : "border-border"
                    }`}
                  >
                    {targetingType === opt.value && (
                      <div className="w-2 h-2 rounded-full bg-accent" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {opt.label}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}

              {/* Country picker */}
              <div className="pt-1">
                <p className="text-xs text-text-muted mb-2">Location</p>
                <CountryPicker
                  selected={selectedCountries}
                  onChange={setSelectedCountries}
                />
              </div>

              {selectedCountries.length === 0 && (
                <p className="text-xs text-status-red bg-status-red/10 rounded-xl px-3 py-2">
                  Please select at least one country.
                </p>
              )}

              {error && (
                <p className="text-xs text-status-red bg-status-red/10 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-border flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3 text-sm font-medium text-text-secondary bg-bg-secondary border border-border rounded-xl hover:bg-white/[0.06] transition-colors min-h-[44px]"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !selectedAccount}
              className="flex-1 py-3 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleBoost}
              disabled={loading || selectedCountries.length === 0}
              className="flex-1 py-3 text-base font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 min-h-[48px]"
            >
              {loading ? "Boosting..." : "Boost now"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
