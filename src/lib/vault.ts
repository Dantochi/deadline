// Where the encrypted backup lives in Firestore, and how to remove it. Shared by backup & sync (lib/cloud) and
// account deletion (lib/partner), which must take the backup with it.
import * as SecureStore from 'expo-secure-store';
import { collection, deleteDoc, doc, getDocs, writeBatch, type Firestore } from 'firebase/firestore';

/** The data key stays on this device only (not copied to a new phone by an iCloud or Google restore). */
export const SECURE = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
export const keyName = (uid: string) => `deadline.datakey.${uid}`;

export const vaultRef = (db: Firestore, uid: string) => doc(db, 'accounts', uid);
export const records = (db: Firestore, uid: string) => collection(db, 'accounts', uid, 'records');
export const pairings = (db: Firestore, uid: string) => collection(db, 'accounts', uid, 'pairing');
// The record id and the account are bound into each ciphertext, so a record can't be moved or swapped unnoticed.
export const aad = (uid: string, id: string) => `${uid}/${id}`;

/** Deletes the whole cloud copy of an account (records, pairing requests, the wrapped key). */
export async function deleteCloudCopy(db: Firestore, uid: string) {
  for (const col of [records(db, uid), pairings(db, uid)]) {
    const all = await getDocs(col);
    for (let i = 0; i < all.docs.length; i += 400) {
      const b = writeBatch(db);
      all.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
      await b.commit();
    }
  }
  await deleteDoc(vaultRef(db, uid));
}

/** Forgets this phone's copy of the data key for an account. */
export const forgetKey = (uid: string) => SecureStore.deleteItemAsync(keyName(uid), SECURE).catch(() => {});
