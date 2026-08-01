import { DropletsIcon, ThermometerIcon, UmbrellaIcon, WindIcon } from "lucide-react";
import { RAIN_RATE_MM_PER_HOUR } from "../domain/rain-status";
import type { WeatherSnapshot } from "../domain/types";

/**
 * The supporting numbers.
 *
 * Four tiles, not five: temperature and "feels like" belong together, because
 * nobody reads one without the other, and four fits two balanced rows on a
 * phone. Everything here exists to refine the decision the hero already made —
 * anything that would not change whether you take an umbrella is left out.
 */

interface Stat {
  icon: typeof ThermometerIcon;
  label: string;
  value: string;
  detail?: string;
}

/** Below the trace threshold there is no meaningful rate to report. */
function formatRainRate(millimetresPerHour: number): { value: string; detail?: string } {
  if (millimetresPerHour < RAIN_RATE_MM_PER_HOUR.trace) return { value: "None" };
  if (millimetresPerHour < RAIN_RATE_MM_PER_HOUR.moderate) {
    return { value: `${millimetresPerHour.toFixed(1)} mm/h`, detail: "Light" };
  }
  if (millimetresPerHour < RAIN_RATE_MM_PER_HOUR.heavy) {
    return { value: `${millimetresPerHour.toFixed(1)} mm/h`, detail: "Moderate" };
  }
  return { value: `${millimetresPerHour.toFixed(1)} mm/h`, detail: "Heavy" };
}

function buildStats(snapshot: WeatherSnapshot): Stat[] {
  const rain = formatRainRate(snapshot.precipitation);

  return [
    {
      icon: ThermometerIcon,
      label: "Temperature",
      value: `${Math.round(snapshot.temperature)}°`,
      detail: `Feels ${Math.round(snapshot.feelsLike)}°`,
    },
    { icon: UmbrellaIcon, label: "Rain", ...rain },
    {
      icon: WindIcon,
      label: "Wind",
      value: `${Math.round(snapshot.windSpeed)}`,
      detail: "km/h",
    },
    {
      icon: DropletsIcon,
      label: "Humidity",
      value: `${Math.round(snapshot.humidity)}%`,
    },
  ];
}

export function ConditionStats({ snapshot }: { snapshot: WeatherSnapshot }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {buildStats(snapshot).map(({ icon: Icon, label, value, detail }) => (
        <div
          key={label}
          className="flex flex-col gap-1 rounded-2xl border bg-card/55 px-4 py-3 backdrop-blur-xl"
        >
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Icon className="size-3.5" aria-hidden />
            {label}
          </dt>
          <dd className="flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tracking-tight tabular-nums">{value}</span>
            {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
