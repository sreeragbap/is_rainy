import { WeatherScreen } from "@/features/weather/components/weather-screen";

/**
 * The only page.
 *
 * A server component wrapper around one client screen: the answer depends on
 * where the user is and on permission they have not granted yet, neither of
 * which the server can know, so there is nothing useful to render ahead of time.
 */
export default function HomePage() {
  return <WeatherScreen />;
}
