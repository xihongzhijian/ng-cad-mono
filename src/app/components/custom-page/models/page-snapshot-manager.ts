import {CustomStorage} from "@lucilor/utils";
import {Page} from "./page";

export class PageSnapshotManager {
  private get _snapshotsKey() {
    return `customPageSnapshots_${this.id}`;
  }
  private get _snapshotIndexKey() {
    return `customPageSnapshotIndex_${this.id}`;
  }
  private get _savedSnapshotIndexKey() {
    return `customPageSavedSnapshotIndex_${this.id}`;
  }

  constructor(
    public storage: CustomStorage,
    public maxLength: number,
    public id: string
  ) {}

  getSnapshots() {
    const snapshots = this.storage.load<PageSnapshot[]>(this._snapshotsKey);
    return Array.isArray(snapshots) ? snapshots : [];
  }
  setSnapshots(snapshots: PageSnapshot[]) {
    this.storage.save(this._snapshotsKey, snapshots);
  }

  getSnapshotIndex() {
    const index = this.storage.load<number>(this._snapshotIndexKey);
    if (typeof index !== "number") {
      return -1;
    }
    return index;
  }
  setSnapshotIndex(index: number) {
    this.storage.save(this._snapshotIndexKey, index);
  }

  getSavedSnapshotIndex() {
    const index = this.storage.load<number>(this._savedSnapshotIndexKey);
    if (typeof index !== "number") {
      return -1;
    }
    return index;
  }
  setSavedSnapshotIndex(index: number) {
    this.storage.save(this._savedSnapshotIndexKey, index);
  }

  saveSnapshot(snapshot: PageSnapshot) {
    const snapshots = this.getSnapshots();
    const index = this.getSnapshotIndex() + 1;
    if (index < snapshots.length) {
      snapshots.splice(index, Infinity);
    }
    if (snapshots.length >= this.maxLength) {
      snapshots.shift();
    }
    snapshots.push(snapshot);
    this.setSnapshots(snapshots);
    this.setSnapshotIndex(snapshots.length - 1);
    const canUndo = snapshots.length > 1;
    const canRedo = false;
    return {canUndo, canRedo, index};
  }
  loadSnapshot() {
    const snapshots = this.getSnapshots();
    const index = this.getSnapshotIndex();
    const snapshot = snapshots[index] as PageSnapshot | undefined;
    const canUndo = index > 0;
    const canRedo = index < snapshots.length - 1;
    return {snapshot, canUndo, canRedo, index};
  }
  undo() {
    const snapshots = this.getSnapshots();
    const index = this.getSnapshotIndex() - 1;
    const snapshot = snapshots[index] as PageSnapshot | undefined;
    if (snapshot) {
      this.setSnapshotIndex(index);
    }
    const canUndo = index > 0;
    return {snapshot, canUndo, index};
  }
  redo() {
    const snapshots = this.getSnapshots();
    const index = this.getSnapshotIndex() + 1;
    const snapshot = snapshots[index] as PageSnapshot | undefined;
    if (snapshot) {
      this.setSnapshotIndex(index);
    }
    const canRedo = index < snapshots.length - 1;
    return {snapshot, canRedo, index};
  }
  reset() {
    this.setSnapshots([]);
    this.setSnapshotIndex(-1);
  }
}

export type PageSnapshot = ReturnType<Page["export"]>;
