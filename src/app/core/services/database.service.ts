import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  collectionData,
  query,
  where,
  QueryConstraint,
  DocumentData,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private firestore = inject(Firestore);

  setDocument<T extends DocumentData>(path: string, data: T): Promise<void> {
    return setDoc(doc(this.firestore, path), data, { merge: true });
  }

  async getDocument<T>(path: string): Promise<T | null> {
    const snap = await getDoc(doc(this.firestore, path));
    return snap.exists() ? (snap.data() as T) : null;
  }

  updateDocument(path: string, data: Partial<DocumentData>): Promise<void> {
    return updateDoc(doc(this.firestore, path), data);
  }

  deleteDocument(path: string): Promise<void> {
    return deleteDoc(doc(this.firestore, path));
  }

  collection$<T>(path: string, ...constraints: QueryConstraint[]): Observable<T[]> {
    const ref = collection(this.firestore, path);
    const q = constraints.length ? query(ref, ...constraints) : ref;
    return collectionData(q, { idField: 'id' }) as Observable<T[]>;
  }

  whereEq(field: string, value: unknown): QueryConstraint {
    return where(field, '==', value);
  }
}
