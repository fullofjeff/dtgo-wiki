import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppFeature, ExperienceTechnology } from '@/types/tech';

const COMPANY_ID = 'dtgo';

// ---- Collection refs ----

function appFeaturesCollection() {
  return collection(db, 'companies', COMPANY_ID, 'appFeatures');
}

function appFeatureDoc(id: string) {
  return doc(db, 'companies', COMPANY_ID, 'appFeatures', id);
}

function experienceTechCollection() {
  return collection(db, 'companies', COMPANY_ID, 'experienceTech');
}

function experienceTechDoc(id: string) {
  return doc(db, 'companies', COMPANY_ID, 'experienceTech', id);
}

// ---- App Features ----

export function subscribeToAppFeatures(
  callback: (features: AppFeature[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    appFeaturesCollection(),
    (snapshot) => {
      const features = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AppFeature[];
      callback(features);
    },
    onError,
  );
}

export async function saveAppFeature(feature: AppFeature): Promise<void> {
  const { id, ...data } = feature;
  await setDoc(appFeatureDoc(id), data);
}

export async function updateAppFeature(
  id: string,
  fields: Partial<Omit<AppFeature, 'id'>>,
): Promise<void> {
  await updateDoc(appFeatureDoc(id), fields);
}

export async function deleteAppFeature(id: string): Promise<void> {
  await deleteDoc(appFeatureDoc(id));
}

// ---- Experience Technology ----

export function subscribeToExperienceTech(
  callback: (items: ExperienceTechnology[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    experienceTechCollection(),
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ExperienceTechnology[];
      callback(items);
    },
    onError,
  );
}

export async function saveExperienceTech(item: ExperienceTechnology): Promise<void> {
  const { id, ...data } = item;
  await setDoc(experienceTechDoc(id), data);
}

export async function updateExperienceTech(
  id: string,
  fields: Partial<Omit<ExperienceTechnology, 'id'>>,
): Promise<void> {
  await updateDoc(experienceTechDoc(id), fields);
}

export async function deleteExperienceTech(id: string): Promise<void> {
  await deleteDoc(experienceTechDoc(id));
}
