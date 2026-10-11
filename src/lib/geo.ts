import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type Fix = { latitude: number; longitude: number; accuracy: number };
export type GeoError = { code: string; message: string };

/** Foreground GPS fix, requested fresh each time (no cached positions). */
export async function getPosition(): Promise<Fix> {
  const fail = (code: string, message: string): never => { throw { code, message } as GeoError; };

  let { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') ({ status } = await Location.requestForegroundPermissionsAsync());
  if (status !== 'granted') fail('LOCATION_REQUIRED', 'Location access is required to mark attendance. Enable it in Settings.');

  if (!(await Location.hasServicesEnabledAsync())) fail('GPS_UNAVAILABLE', 'GPS is turned off. Turn on Location and try again.');

  try {
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 20_000)),
    ]);
    // Android flags positions injected by "mock location" apps; refuse them up front.
    if (Platform.OS === 'android' && (pos as Location.LocationObject).mocked)
      fail('MOCK_LOCATION', 'A mock-location app is active. Turn it off to mark attendance.');
    const { latitude, longitude, accuracy } = pos.coords;
    return { latitude, longitude, accuracy: accuracy ?? 9999 };
  } catch (e: any) {
    if (e?.code) throw e;
    return fail('GPS_UNAVAILABLE', 'Could not get a GPS fix. Move to an open area and try again.');
  }
}
