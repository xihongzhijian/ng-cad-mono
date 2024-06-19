import {CustomStorage} from "@lucilor/utils";
import {Page} from "./page";

export class PageSnapshotManager {
  private _pageSnapshotsKey = "customPageSnapshots";
  private _pageSnapshotIndexKey = "customPageSnapshotIndex";

  constructor(
    public storage: CustomStorage,
    public maxLength: number
  ) {}

  getSnapshots() {
    const snapshots = this.storage.load<PageSnapshot[]>(this._pageSnapshotsKey);
    return Array.isArray(snapshots) ? snapshots : [];
  }
  setSnapshots(snapshots: PageSnapshot[]) {
    this.storage.save(this._pageSnapshotsKey, snapshots);
  }

  getSnapshotIndex() {
    const index = this.storage.load<number>(this._pageSnapshotIndexKey);
    if (typeof index !== "number") {
      return -1;
    }
    return index;
  }
  setSnapshotIndex(index: number) {
    this.storage.save(this._pageSnapshotIndexKey, index);
  }

  saveSnapshot(snapshot: PageSnapshot) {
    const snapshots = this.getSnapshots();
    const index = this.getSnapshotIndex();
    if (index < snapshots.length - 1) {
      snapshots.splice(index + 1, snapshots.length - index - 1);
    }
    if (snapshots.length >= this.maxLength) {
      snapshots.shift();
    }
    snapshots.push(snapshot);
    this.setSnapshots(snapshots);
    this.setSnapshotIndex(snapshots.length - 1);
    const canUndo = snapshots.length > 1;
    const canRedo = false;
    return {canUndo, canRedo};
  }
  loadSnapshot() {
    const snapshots = this.getSnapshots();
    const index = this.getSnapshotIndex();
    const snapshot = snapshots[index] as PageSnapshot | undefined;
    const canUndo = index > 0;
    const canRedo = index < snapshots.length - 1;
    return {snapshot, canUndo, canRedo};
  }
  undo() {
    const snapshots = this.getSnapshots();
    const index = this.getSnapshotIndex();
    const snapshot = snapshots[index - 1] as PageSnapshot | undefined;
    if (snapshot) {
      this.setSnapshotIndex(index - 1);
    }
    const canUndo = index > 1;
    return {snapshot, canUndo};
  }
  redo() {
    const snapshots = this.getSnapshots();
    const index = this.getSnapshotIndex();
    const snapshot = snapshots[index + 1] as PageSnapshot | undefined;
    if (snapshot) {
      this.setSnapshotIndex(index + 1);
    }
    const canRedo = index < snapshots.length - 2;
    return {snapshot, canRedo};
  }
  reset() {
    this.setSnapshots([]);
    this.setSnapshotIndex(-1);
  }
}

export type PageSnapshot = ReturnType<Page["export"]>;
