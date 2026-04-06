import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Zone, Location, ZoneStatusOption, MerchItem, FnBItem, ProgramItem } from '@/types/zones';
import type { TreeState } from '@/components/pages/LocationTree';

const COMPANY_ID = 'dtgo';

// ---- Collection refs ----

function zonesCollection() {
  return collection(db, 'companies', COMPANY_ID, 'zones');
}

function zoneDoc(zoneId: string) {
  return doc(db, 'companies', COMPANY_ID, 'zones', zoneId);
}

function locationsCollection() {
  return collection(db, 'companies', COMPANY_ID, 'locations');
}

function locationDoc(locationId: string) {
  return doc(db, 'companies', COMPANY_ID, 'locations', locationId);
}

function statusesCollection() {
  return collection(db, 'companies', COMPANY_ID, 'zoneStatuses');
}

function statusDoc(statusId: string) {
  return doc(db, 'companies', COMPANY_ID, 'zoneStatuses', statusId);
}

// ---- Zones ----

export function subscribeToZones(
  callback: (zones: Zone[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    zonesCollection(),
    (snapshot) => {
      const zones = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Zone[];
      callback(zones);
    },
    onError,
  );
}

export async function saveZone(zone: Zone): Promise<void> {
  const { id, ...data } = zone;
  await setDoc(zoneDoc(id), data);
}

export async function updateZone(
  zoneId: string,
  fields: Partial<Omit<Zone, 'id'>>,
): Promise<void> {
  await updateDoc(zoneDoc(zoneId), fields);
}

export async function deleteZone(zoneId: string): Promise<void> {
  await deleteDoc(zoneDoc(zoneId));
}

// ---- Locations ----

export function subscribeToLocations(
  callback: (locations: Location[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    locationsCollection(),
    (snapshot) => {
      const locations = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Location[];
      callback(locations);
    },
    onError,
  );
}

export async function saveLocation(location: Location): Promise<void> {
  const { id, ...data } = location;
  await setDoc(locationDoc(id), data);
}

export async function updateLocation(
  locationId: string,
  fields: Partial<Omit<Location, 'id'>>,
): Promise<void> {
  await updateDoc(locationDoc(locationId), fields);
}

export async function deleteLocation(locationId: string): Promise<void> {
  await deleteDoc(locationDoc(locationId));
}

// ---- Zone Statuses ----

export function subscribeToZoneStatuses(
  callback: (statuses: ZoneStatusOption[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    statusesCollection(),
    (snapshot) => {
      const statuses = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ZoneStatusOption[];
      callback(statuses);
    },
    onError,
  );
}

export async function saveZoneStatus(status: ZoneStatusOption): Promise<void> {
  const { id, ...data } = status;
  await setDoc(statusDoc(id), data);
}

export async function deleteZoneStatus(statusId: string): Promise<void> {
  await deleteDoc(statusDoc(statusId));
}

// ---- Merch Items ----

function merchCollection() {
  return collection(db, 'companies', COMPANY_ID, 'merchItems');
}

function merchDoc(id: string) {
  return doc(db, 'companies', COMPANY_ID, 'merchItems', id);
}

export function subscribeToMerchItems(
  callback: (items: MerchItem[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    merchCollection(),
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MerchItem[];
      callback(items);
    },
    onError,
  );
}

export async function saveMerchItem(item: MerchItem): Promise<void> {
  const { id, ...data } = item;
  await setDoc(merchDoc(id), data);
}

export async function updateMerchItem(
  id: string,
  fields: Partial<Omit<MerchItem, 'id'>>,
): Promise<void> {
  await updateDoc(merchDoc(id), fields);
}

export async function deleteMerchItem(id: string): Promise<void> {
  await deleteDoc(merchDoc(id));
}

// ---- F&B Items ----

function fnbCollection() {
  return collection(db, 'companies', COMPANY_ID, 'fnbItems');
}

function fnbDoc(id: string) {
  return doc(db, 'companies', COMPANY_ID, 'fnbItems', id);
}

export function subscribeToFnBItems(
  callback: (items: FnBItem[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    fnbCollection(),
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FnBItem[];
      callback(items);
    },
    onError,
  );
}

export async function saveFnBItem(item: FnBItem): Promise<void> {
  const { id, ...data } = item;
  await setDoc(fnbDoc(id), data);
}

export async function updateFnBItem(
  id: string,
  fields: Partial<Omit<FnBItem, 'id'>>,
): Promise<void> {
  await updateDoc(fnbDoc(id), fields);
}

export async function deleteFnBItem(id: string): Promise<void> {
  await deleteDoc(fnbDoc(id));
}

// ---- Program Items ----

function programCollection() {
  return collection(db, 'companies', COMPANY_ID, 'programItems');
}

function programDoc(id: string) {
  return doc(db, 'companies', COMPANY_ID, 'programItems', id);
}

export function subscribeToProgramItems(
  callback: (items: ProgramItem[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    programCollection(),
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ProgramItem[];
      callback(items);
    },
    onError,
  );
}

export async function saveProgramItem(item: ProgramItem): Promise<void> {
  const { id, ...data } = item;
  await setDoc(programDoc(id), data);
}

export async function updateProgramItem(
  id: string,
  fields: Partial<Omit<ProgramItem, 'id'>>,
): Promise<void> {
  await updateDoc(programDoc(id), fields);
}

export async function deleteProgramItem(id: string): Promise<void> {
  await deleteDoc(programDoc(id));
}

// ---- Location Tree ----

function locationTreeDoc() {
  return doc(db, 'companies', COMPANY_ID, 'locationTree', 'state');
}

export function subscribeToLocationTree(
  callback: (state: TreeState | null) => void,
): Unsubscribe {
  return onSnapshot(locationTreeDoc(), (snap) => {
    callback(snap.exists() ? (snap.data() as TreeState) : null);
  });
}

export async function saveLocationTree(state: TreeState): Promise<void> {
  // JSON round-trip strips undefined values that Firestore rejects
  const clean = JSON.parse(JSON.stringify(state));
  await setDoc(locationTreeDoc(), clean);
}

// ---- Seeding ----

export async function seedLocations(locations: Location[]): Promise<void> {
  const batch = writeBatch(db);
  locations.forEach((loc) => {
    const { id, ...data } = loc;
    batch.set(locationDoc(id), data);
  });
  await batch.commit();
}

export async function seedZoneStatuses(statuses: ZoneStatusOption[]): Promise<void> {
  const batch = writeBatch(db);
  statuses.forEach((s) => {
    const { id, ...data } = s;
    batch.set(statusDoc(id), data);
  });
  await batch.commit();
}
