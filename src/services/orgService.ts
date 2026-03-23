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
import type { OrgEntity } from '@/data/orgData';

// For now, use a single "dtgo" company doc as the parent.
// This can be parameterized later for multi-company org charts.
const COMPANY_ID = 'dtgo';

function orgCollection() {
  return collection(db, 'companies', COMPANY_ID, 'orgEntities');
}

function orgDoc(entityId: string) {
  return doc(db, 'companies', COMPANY_ID, 'orgEntities', entityId);
}

/** Subscribe to real-time org entity updates */
export function subscribeToOrgEntities(
  callback: (entities: OrgEntity[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    orgCollection(),
    (snapshot) => {
      const entities = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as OrgEntity[];
      callback(entities);
    },
    onError,
  );
}

/** Add or overwrite a single org entity */
export async function saveOrgEntity(entity: OrgEntity): Promise<void> {
  const { id, ...data } = entity;
  await setDoc(orgDoc(id), data);
}

/** Update specific fields on an org entity */
export async function updateOrgEntity(
  entityId: string,
  fields: Partial<Omit<OrgEntity, 'id'>>,
): Promise<void> {
  await updateDoc(orgDoc(entityId), fields);
}

/** Delete a single org entity */
export async function deleteOrgEntity(entityId: string): Promise<void> {
  await deleteDoc(orgDoc(entityId));
}

/** Delete an entity and all its descendants */
export async function deleteOrgEntityTree(
  entityId: string,
  allEntities: OrgEntity[],
): Promise<void> {
  const toDelete = new Set<string>();
  const findDescendants = (id: string) => {
    toDelete.add(id);
    allEntities.filter((e) => e.parentId === id).forEach((e) => findDescendants(e.id));
  };
  findDescendants(entityId);

  const batch = writeBatch(db);
  toDelete.forEach((id) => batch.delete(orgDoc(id)));
  await batch.commit();
}

/** Seed Firestore with an array of entities (batch write, 500 max per batch) */
export async function seedOrgEntities(entities: OrgEntity[]): Promise<void> {
  const BATCH_SIZE = 500;
  for (let i = 0; i < entities.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = entities.slice(i, i + BATCH_SIZE);
    chunk.forEach((entity) => {
      const { id, ...data } = entity;
      batch.set(orgDoc(id), data);
    });
    await batch.commit();
  }
}

/** Update multiple entities in a single batch (e.g., color cascading) */
export async function batchUpdateOrgEntities(
  updates: Array<{ id: string; fields: Partial<Omit<OrgEntity, 'id'>> }>,
): Promise<void> {
  const batch = writeBatch(db);
  updates.forEach(({ id, fields }) => {
    batch.update(orgDoc(id), fields);
  });
  await batch.commit();
}
