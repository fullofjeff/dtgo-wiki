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
import type { TimelineEvent } from '@/data/timelineData';

const COMPANY_ID = 'dtgo';

function timelineCollection() {
  return collection(db, 'companies', COMPANY_ID, 'timelineEvents');
}

function timelineDoc(eventId: string) {
  return doc(db, 'companies', COMPANY_ID, 'timelineEvents', eventId);
}

/** Subscribe to real-time timeline event updates */
export function subscribeToTimelineEvents(
  callback: (events: TimelineEvent[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    timelineCollection(),
    (snapshot) => {
      const events = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TimelineEvent[];
      callback(events);
    },
    onError,
  );
}

/** Add or overwrite a single timeline event */
export async function saveTimelineEvent(event: TimelineEvent): Promise<void> {
  const { id, ...data } = event;
  await setDoc(timelineDoc(id), data);
}

/** Update specific fields on a timeline event */
export async function updateTimelineEvent(
  eventId: string,
  fields: Partial<Omit<TimelineEvent, 'id'>>,
): Promise<void> {
  await updateDoc(timelineDoc(eventId), fields);
}

/** Delete a single timeline event */
export async function deleteTimelineEvent(eventId: string): Promise<void> {
  await deleteDoc(timelineDoc(eventId));
}

/** Seed Firestore with timeline events (batch write) */
export async function seedTimelineEvents(events: TimelineEvent[]): Promise<void> {
  const BATCH_SIZE = 500;
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = events.slice(i, i + BATCH_SIZE);
    chunk.forEach((event) => {
      const { id, ...data } = event;
      batch.set(timelineDoc(id), data);
    });
    await batch.commit();
  }
}
