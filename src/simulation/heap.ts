/** Stable chronology is supplied by the comparator (usually time, then sequence). */
export class MinHeap<T> {
  private readonly values: T[] = [];
  constructor(private readonly compare: (a: T, b: T) => number) {}
  get size(): number {
    return this.values.length;
  }
  push(value: T): void {
    let i = this.values.length;
    this.values.push(value);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.values[parent], value) <= 0) break;
      this.values[i] = this.values[parent];
      i = parent;
    }
    this.values[i] = value;
  }
  pop(): T | undefined {
    if (!this.values.length) return undefined;
    const result = this.values[0],
      last = this.values.pop()!;
    if (this.values.length) {
      let i = 0;
      while (true) {
        let child = i * 2 + 1;
        if (child >= this.values.length) break;
        if (
          child + 1 < this.values.length &&
          this.compare(this.values[child + 1], this.values[child]) < 0
        )
          child++;
        if (this.compare(last, this.values[child]) <= 0) break;
        this.values[i] = this.values[child];
        i = child;
      }
      this.values[i] = last;
    }
    return result;
  }
}
